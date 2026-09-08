import type { Prospect, SearchQuery, SourceAdapter } from '../types'
import { findOsmCategory, matchOsmCategories, type OsmCategory } from '../osm-categories'
import { rateLimit } from '../rate-limit'

// Overpass API — ücretsiz, anahtarsız. Kullanım politikası: ~1 istek/sn, makul sorgu boyutu.
// Ana endpoint yoğunsa config.url ile ayna (mirror) verilebilir.

const DEFAULT_OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
// Ana endpoint 429/504 verdiğinde sırayla denenir. Ayna seçimi ölçümle yapıldı:
// kumi.systems ve private.coffee yanıt vermiyor, osm.ch bölgesel (TR verisi yok).
const FALLBACK_URLS = ['https://maps.mail.ru/osm/tools/overpass/api/interpreter']
const REQUEST_TIMEOUT_MS = 30_000
// Her tur tüm endpoint'leri sırayla dener; turlar arası kısa bekleme.
const MAX_ROUNDS = 3
const RETRY_DELAY_MS = 1_500

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

// ÖNEMLİ: (around:...) filtresi HER ZAMAN en başta olmalı ve ["name"] varlık filtresi
// sorguya konmamalı. `nwr["shop"="x"]["name"](around:...)` biçimi Overpass'ı gezegen
// çapında tag taramasına zorluyor ve 30 sn'de timeout'a düşüyordu (0 sonuç).
// `nwr(around:...)["shop"="x"]` aynı veriyi ~2 sn'de döndürüyor.
// İsimsiz kayıtlar zaten toProspect() içinde eleniyor, ayrıca filtrelemeye gerek yok.
function resolveCategories(q: SearchQuery): OsmCategory[] {
  const byKey = q.categoryKey ? findOsmCategory(q.categoryKey) : undefined
  if (byKey) return [byKey]

  if (q.categoryText?.trim()) {
    // Serbest metin ad regex'ine değil, küratörlü kategorilere eşlenir — ad regex'i
    // hiçbir public Overpass sunucusunda makul sürede dönmüyor (ölçüldü).
    const matches = matchOsmCategories(q.categoryText)
    if (matches.length === 0) {
      throw new Error(
        `"${q.categoryText.trim()}" için eşleşen bir işletme türü bulunamadı. Listeden bir kategori seçin veya daha genel bir kelime deneyin (örn. "kuaför", "kafe", "oto tamir").`
      )
    }
    // En alakalı 3 kategori — daha fazlası sorguyu ağırlaştırıyor.
    return matches.slice(0, 3)
  }

  throw new Error('Kategori seçin veya bir işletme türü yazın.')
}

function buildQuery(q: SearchQuery, categories: OsmCategory[]): string {
  const around = `(around:${Math.round(q.radiusM)},${q.lat},${q.lng})`
  const lines: string[] = []

  for (const category of categories) {
    for (const selector of category.selectors) {
      const [key, value] = selector.split('=')
      lines.push(`nwr${around}["${key}"="${value}"];`)
    }
  }

  return `[out:json][timeout:25];(${lines.join('')});out center tags ${Math.min(q.limit * 3, 600)};`
}

function buildAddress(tags: Record<string, string>): string | undefined {
  const parts = [
    [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' '),
    tags['addr:suburb'] ?? tags['addr:neighbourhood'],
    tags['addr:district'],
    tags['addr:city'] ?? tags['addr:province'],
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : undefined
}

function toProspect(el: OverpassElement, categoryLabel?: string): Prospect | null {
  const tags = el.tags ?? {}
  if (!tags.name) return null
  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon
  return {
    name: tags.name,
    category:
      categoryLabel ??
      tags.shop ??
      tags.amenity ??
      tags.office ??
      tags.craft ??
      undefined,
    address: buildAddress(tags),
    city: tags['addr:city'] ?? tags['addr:province'],
    district: tags['addr:district'] ?? tags['addr:suburb'],
    phone: tags.phone ?? tags['contact:phone'],
    website: tags.website ?? tags['contact:website'],
    lat,
    lng,
    sourceRecordId: `${el.type}/${el.id}`,
    raw: { tags },
  }
}

interface OverpassResponse {
  elements?: OverpassElement[]
  remark?: string
}

/** Tek bir endpoint'e istek atar. Yeniden denenebilir hatalarda null döner. */
async function askEndpoint(
  endpoint: string,
  body: string
): Promise<{ data: OverpassResponse } | { retryable: string } > {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Overpass, User-Agent'ı olmayan istekleri 406 ile reddediyor.
        'User-Agent': process.env.NOMINATIM_USER_AGENT ?? 'LocalLeadFinder/1.0',
      },
      body: `data=${encodeURIComponent(body)}`,
      signal: controller.signal,
    })
    if (res.status === 429) return { retryable: 'kota sınırı (429)' }
    if (res.status === 504 || res.status >= 500) return { retryable: `sunucu hatası (${res.status})` }
    if (!res.ok) throw new Error(`Overpass sorgusu başarısız (${res.status})`)

    const data = (await res.json()) as OverpassResponse
    // Overrpass hataları 200 ile de dönebiliyor; sorgu timeout'u remark alanına yazılır.
    if (data.remark && /timed out|out of memory/i.test(data.remark)) {
      return { retryable: `sorgu zaman aşımı (${data.remark})` }
    }
    return { data }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { retryable: `${REQUEST_TIMEOUT_MS / 1000} sn içinde yanıt yok` }
    }
    // Ağ hatası (DNS/TLS/bağlantı) da geçici olabilir — yedek endpoint denenmeli.
    return { retryable: e instanceof Error ? e.message : 'bağlantı hatası' }
  } finally {
    clearTimeout(timer)
  }
}

export function createOverpassAdapter(config?: { url?: string; rateLimitPerSec?: number }): SourceAdapter {
  const endpoints = [config?.url ?? DEFAULT_OVERPASS_URL, ...FALLBACK_URLS]
  const perSec = config?.rateLimitPerSec ?? 1

  return {
    code: 'overpass',
    kind: 'api',
    async search(q: SearchQuery): Promise<Prospect[]> {
      const categories = resolveCategories(q)
      const body = buildQuery(q, categories)

      // Overpass 504/429 ve anlık ağ kesintileri sık ama kısa sürüyor; sorgu ~1 sn
      // sürdüğü için birkaç deneme maliyetsiz ve başarı oranını belirgin artırıyor.
      let data: OverpassResponse | null = null
      const failures: string[] = []
      outer: for (let round = 0; round < MAX_ROUNDS; round++) {
        if (round > 0) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
        for (const endpoint of endpoints) {
          await rateLimit('overpass', perSec)
          const result = await askEndpoint(endpoint, body)
          if ('data' in result) {
            data = result.data
            break outer
          }
          failures.push(`${new URL(endpoint).hostname}: ${result.retryable}`)
        }
      }

      if (!data) {
        // Aynı hatayı tekrar tekrar listeleme — mesaj okunabilir kalsın.
        const unique = Array.from(new Set(failures))
        throw new Error(
          `Harita servisine ulaşılamadı (${unique.join('; ')}). Birkaç dakika sonra tekrar deneyin; sorun sürerse yarıçapı küçültün.`
        )
      }
      // Birden fazla kategori eşleştiyse sabit etiket yanıltıcı olur; tag'lerden türetilsin.
      const categoryLabel = categories.length === 1 ? categories[0].label : undefined

      const seen = new Set<string>()
      const prospects: Prospect[] = []
      for (const el of data.elements ?? []) {
        const p = toProspect(el, categoryLabel)
        if (!p) continue
        // Aynı isim + yakın konum tekrarlarını ele (node/way ikilemeleri)
        const dedupeKey = `${p.name.toLowerCase()}|${p.lat?.toFixed(3)}|${p.lng?.toFixed(3)}`
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)
        prospects.push(p)
        if (prospects.length >= q.limit) break
      }
      return prospects
    },
  }
}
