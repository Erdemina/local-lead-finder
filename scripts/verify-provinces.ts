// lib/discovery/tr-provinces.ts içindeki koordinatları Nominatim'e karşı doğrular.
// Kullanım: npx tsx scripts/verify-provinces.ts
// Nominatim kullanım politikası: en fazla 1 istek/sn + tanımlayıcı User-Agent.

import { TR_PROVINCES } from '../lib/discovery/tr-provinces'

const UA = process.env.NOMINATIM_USER_AGENT ?? 'LocalLeadFinder/1.0'
const TOLERANCE_KM = 25

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// DİKKAT: serbest metin (`q=Samsun, Türkiye`) il SINIRININ coğrafi merkezini döndürür.
// Bize şehir merkezi lazım — `city=` parametresi yerleşim yerini hedefler.
async function geocode(name: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&city=${encodeURIComponent(name)}`
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!r.ok) return null
  const j = (await r.json()) as { lat: string; lon: string }[]
  if (!j?.length) return null
  return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) }
}

async function main() {
  let bad = 0
  let missing = 0
  for (const p of TR_PROVINCES) {
    const found = await geocode(p.name)
    if (!found) {
      console.log(`? ${p.name.padEnd(16)} Nominatim sonuç vermedi`)
      missing++
    } else {
      const d = haversine(p, found)
      if (d > TOLERANCE_KM) {
        console.log(
          `X ${p.name.padEnd(16)} ${d.toFixed(0)} km sapma | kodda ${p.lat},${p.lng} | osm ${found.lat.toFixed(4)},${found.lng.toFixed(4)}`
        )
        bad++
      }
    }
    await new Promise((r) => setTimeout(r, 1100))
  }
  console.log(
    `\nToplam ${TR_PROVINCES.length} il | ${TOLERANCE_KM} km üstü sapma: ${bad} | bulunamadı: ${missing}`
  )
  if (bad > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
