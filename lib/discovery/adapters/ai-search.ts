import crypto from 'crypto'
import type { AiClient } from '@/lib/ai/provider'
import { AiError } from '@/lib/ai/provider'
import type { Prospect, SearchQuery, SourceAdapter } from '../types'
import { findOsmCategory } from '../osm-categories'

// LLM + web araması ile aday keşfi. Model veri "üretmez" — yalnız web aramasında
// gördüğü gerçek işletmeleri raporlar; doğrulanamayan alanlar boş bırakılır.

const SYSTEM = `Sen Türkiye pazarı için çalışan bir B2B saha araştırmacısısın.
Görevin: verilen şehir/ilçe ve sektör için GERÇEK, faal işletmeleri web aramasıyla bulup listelemek.

Kesin kurallar:
- ASLA işletme uydurma. Yalnızca web aramasında kaynağını gördüğün işletmeleri listele.
- Telefon, adres ve web sitesini kaynakta gördüğün gibi yaz. Göremediğin alanı BOŞ bırak — tahmin etme.
- Aynı işletmeyi tek kez listele (şube farklıysa adres ile ayır).
- Zincir/franchise merkezleri yerine yerel, bağımsız işletmeleri tercih et.
- Telefonları Türkiye formatında yaz: +90XXXXXXXXXX.
- Web sitesi alanına sosyal medya profili yazma; yalnızca kendi alan adı olan siteleri yaz.
- Kapanmış olduğunu gördüğün işletmeleri listeleme.`

interface AiLead {
  name: string
  category?: string
  address?: string
  district?: string
  phone?: string
  website?: string
  note?: string
}

const SUBMIT_TOOL = {
  name: 'submit_leads',
  description: 'Web aramasında doğruladığın işletmeleri bu araçla döndür.',
  schema: {
    type: 'object',
    properties: {
      leads: {
        type: 'array',
        description: 'Doğrulanmış işletme listesi',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'İşletmenin ticari adı' },
            category: { type: 'string', description: 'Sektör/kategori, örn. Kuaför' },
            address: { type: 'string', description: 'Açık adres; bilinmiyorsa boş string' },
            district: { type: 'string', description: 'İlçe; bilinmiyorsa boş string' },
            phone: { type: 'string', description: '+90XXXXXXXXXX; bilinmiyorsa boş string' },
            website: { type: 'string', description: 'https://... ; bilinmiyorsa boş string' },
            note: { type: 'string', description: 'Tek cümlelik gözlem; yoksa boş string' },
          },
          required: ['name', 'category', 'address', 'district', 'phone', 'website', 'note'],
          additionalProperties: false,
        },
      },
    },
    required: ['leads'],
    additionalProperties: false,
  } as Record<string, unknown>,
}

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed === '-') return undefined
  const lowered = trimmed.toLocaleLowerCase('tr-TR')
  if (lowered === 'bilinmiyor' || lowered === 'yok' || lowered === 'n/a') return undefined
  return trimmed
}

function normalizePhone(value: unknown): string | undefined {
  const raw = clean(value)
  if (!raw) return undefined
  const digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+90')) return digits.length === 13 ? digits : undefined
  if (digits.startsWith('0') && digits.length === 11) return `+9${digits}`
  if (digits.length === 10) return `+90${digits}`
  return undefined
}

function normalizeWebsite(value: unknown): string | undefined {
  const raw = clean(value)
  if (!raw) return undefined
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(withScheme)
    // Sosyal medya profilleri "web sitesi" sayılmaz — site sağlığı kontrolünü yanıltır.
    if (/(facebook|instagram|twitter|x)\.com$|linkedin\.com$|youtube\.com$/i.test(url.hostname)) {
      return undefined
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    return undefined
  }
}

/** Aynı işletmenin tekrar tekrar kaydedilmemesi için kararlı kimlik. */
function sourceRecordId(name: string, city: string): string {
  const key = `${name.toLocaleLowerCase('tr-TR')}|${city.toLocaleLowerCase('tr-TR')}`.replace(
    /\s+/g,
    ' '
  )
  return `ai:${crypto.createHash('sha1').update(key).digest('hex').slice(0, 16)}`
}

function buildPrompt(q: SearchQuery): string {
  const category = q.categoryKey ? findOsmCategory(q.categoryKey)?.label : undefined
  const sector = category ?? q.categoryText ?? 'yerel işletme'
  const location = [q.district, q.city].filter(Boolean).join(', ') || 'Türkiye'
  return `Konum: ${location}
Sektör: ${sector}
Hedef adet: ${q.limit}

Bu konumdaki ${sector} işletmelerini web aramasıyla araştır. En fazla ${q.limit} işletme döndür.
Yerel rehberler, harita servisleri, sektör dizinleri ve işletmelerin kendi sitelerini kaynak al.
Bulduğun her işletmeyi submit_leads aracıyla döndür.`
}

export function createAiSearchAdapter(client: AiClient): SourceAdapter {
  return {
    code: 'ai_search',
    kind: 'api',
    async search(q: SearchQuery): Promise<Prospect[]> {
      const result = await client.run<{ leads?: AiLead[] }>({
        system: SYSTEM,
        user: buildPrompt(q),
        tool: SUBMIT_TOOL,
        webSearch: true,
        effort: 'high',
        maxTokens: 24000,
      })

      const rows = Array.isArray(result?.leads) ? result.leads : []
      if (rows.length === 0) {
        throw new AiError(
          'AI araması bu kriterlerde işletme bulamadı. Şehir/ilçe yazımını kontrol edin veya sektörü genişletin.'
        )
      }

      const city = q.city ?? ''
      const seen = new Set<string>()
      const prospects: Prospect[] = []

      for (const row of rows) {
        const name = clean(row?.name)
        if (!name) continue
        const id = sourceRecordId(name, city)
        if (seen.has(id)) continue
        seen.add(id)

        prospects.push({
          name,
          category: clean(row.category),
          address: clean(row.address),
          city: city || undefined,
          district: clean(row.district) ?? q.district,
          phone: normalizePhone(row.phone),
          website: normalizeWebsite(row.website),
          sourceRecordId: id,
          raw: { note: clean(row.note), model: client.model, provider: client.provider },
        })
        if (prospects.length >= q.limit) break
      }

      return prospects
    },
  }
}
