import type { AiClient } from './provider'

// Kaynaktan bağımsız skorlama: OSM, AI araması veya içe aktarılmış adaylar aynı hattan geçer.

export interface ScorableItem {
  id: string
  name: string
  category?: string | null
  address?: string | null
  city?: string | null
  website?: string | null
  websiteHealth: string
}

export interface AiScore {
  aiScore: number
  aiNote: string
  aiReason: string
}

const BATCH_SIZE = 25

const SYSTEM = `Sen bir B2B satış skorlama uzmanısın. Sana gerçek işletme verisi veriliyor.
Görevin SADECE her işletme için dönüşüm skoru ve kısa notlar üretmek.
ASLA isim/telefon/adres değiştirme veya yeni işletme uydurma. Her işletme için tam bir kayıt döndür.`

const SUBMIT_TOOL = {
  name: 'submit_scores',
  description: 'Her işletme için dönüşüm skoru ve kısa notları döndür.',
  schema: {
    type: 'object',
    properties: {
      scores: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Sana verilen id, aynen' },
            aiScore: {
              type: 'integer',
              description: '1-10 arası dönüşüm olasılığı (10 = en sıcak aday)',
            },
            aiNote: { type: 'string', description: 'Tek kısa cümle, en fazla 15 kelime' },
            aiReason: { type: 'string', description: 'Skorun gerekçesi, en fazla 12 kelime' },
          },
          required: ['id', 'aiScore', 'aiNote', 'aiReason'],
          additionalProperties: false,
        },
      },
    },
    required: ['scores'],
    additionalProperties: false,
  } as Record<string, unknown>,
}

const HEALTH_LABELS: Record<string, string> = {
  no_website: 'Web sitesi yok',
  red: 'Sitesi açılmıyor / bozuk',
  yellow: 'Sitesi sorunlu (yavaş, sertifika/mobil problemi)',
  green: 'Sitesi çalışıyor',
  unknown: 'Site durumu bilinmiyor',
}

function buildPrompt(product: string, items: ScorableItem[]): string {
  const payload = items.map((i) => ({
    id: i.id,
    isletme: i.name,
    kategori: i.category ?? '',
    adres: [i.address, i.city].filter(Boolean).join(', '),
    website: i.website ?? '',
    site_durumu: HEALTH_LABELS[i.websiteHealth] ?? i.websiteHealth,
  }))

  return `Satılacak ürün/hizmet: ${product}

Aşağıdaki ${items.length} işletmenin her biri için skor üret.

SKORLAMA İLKELERİ:
- "Web sitesi yok" → yüksek skor (8-10): dijital ihtiyaç en yüksek.
- "Sitesi açılmıyor / bozuk" → yüksek skor (7-9): acil ihtiyaç var.
- "Sitesi sorunlu" → orta-yüksek skor (5-7): iyileştirme satılabilir.
- "Sitesi çalışıyor" → düşük skor (2-4): ihtiyaç zayıf.
- Adres/telefon gibi iletişim bilgisi eksikse skoru 1 puan düşür (ulaşmak zor).
- aiNote işletmenin mevcut durumunu, aiReason skorun nedenini anlatsın.

Her id için TAM OLARAK bir kayıt döndür, hiçbirini atlama.

İşletme verisi:
${JSON.stringify(payload)}`
}

function coerceScore(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return null
  return Math.min(10, Math.max(1, Math.round(n)))
}

function trimText(value: unknown, max: number): string {
  const raw = typeof value === 'string' ? value.trim() : ''
  return raw.length > max ? `${raw.slice(0, max - 1)}…` : raw
}

/**
 * Verilen adayları AI ile skorlar. Kısmi başarı normaldir: skorlanamayan
 * kayıtlar map'te yer almaz, çağıran taraf onları null bırakır.
 */
export async function scoreProspects(
  client: AiClient,
  product: string,
  items: ScorableItem[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, AiScore>> {
  const out = new Map<string, AiScore>()
  if (items.length === 0) return out

  const byId = new Map(items.map((i) => [i.id, i]))

  let lastError: unknown = null

  for (let offset = 0; offset < items.length; offset += BATCH_SIZE) {
    const batch = items.slice(offset, offset + BATCH_SIZE)
    let result: { scores?: unknown[] }
    try {
      result = await client.run<{ scores?: unknown[] }>({
        system: SYSTEM,
        user: buildPrompt(product, batch),
        tool: SUBMIT_TOOL,
        webSearch: false,
        effort: 'low',
        maxTokens: 8000,
      })
    } catch (e) {
      // Tek partinin hatası diğerlerini götürmemeli — kısmi skorlama her zaman
      // skorsuz kalmaktan iyidir. Hiçbiri tutmazsa hata en sonda yükseltilir.
      lastError = e
      continue
    }

    for (const row of Array.isArray(result?.scores) ? result.scores : []) {
      const rec = row as Record<string, unknown>
      const id = typeof rec?.id === 'string' ? rec.id : ''
      if (!byId.has(id)) continue
      const score = coerceScore(rec.aiScore)
      if (score == null) continue
      out.set(id, {
        aiScore: score,
        aiNote: trimText(rec.aiNote, 160),
        aiReason: trimText(rec.aiReason, 120),
      })
    }

    onProgress?.(Math.min(offset + BATCH_SIZE, items.length), items.length)
  }

  if (out.size === 0 && lastError) throw lastError

  return out
}
