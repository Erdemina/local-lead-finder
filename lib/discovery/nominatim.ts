import { prismaUnscoped } from '@/lib/db'
import { rateLimit } from './rate-limit'

// Nominatim kullanım politikası: en fazla 1 istek/sn + tanımlayıcı User-Agent.
// Sonuçlar DB'de kalıcı cache'lenir (GeocodeCache) — aynı sorgu ikinci kez API'ye gitmez.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export interface GeocodeResult {
  lat: number
  lng: number
}

export async function geocode(query: string): Promise<GeocodeResult | null> {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!normalized) return null

  const cached = await prismaUnscoped.geocodeCache.findUnique({ where: { query: normalized } })
  if (cached) return { lat: cached.lat, lng: cached.lng }

  await rateLimit('nominatim', 1)
  const url = new URL(NOMINATIM_URL)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'tr')
  url.searchParams.set('q', query)

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': process.env.NOMINATIM_USER_AGENT ?? 'LocalLeadFinder/1.0',
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`Nominatim geocoding hatası (${res.status})`)
  }
  const data = (await res.json()) as Array<{ lat: string; lon: string; boundingbox?: string[] }>
  if (!data.length) return null

  const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  await prismaUnscoped.geocodeCache
    .create({
      data: {
        query: normalized,
        lat: result.lat,
        lng: result.lng,
        bbox: data[0].boundingbox ?? undefined,
      },
    })
    .catch(() => {
      // Yarış durumunda unique ihlali önemsiz — cache zaten dolmuş demektir
    })
  return result
}
