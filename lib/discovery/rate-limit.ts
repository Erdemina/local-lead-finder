// Kaynak başına basit oran sınırlayıcı. Tek node varsayımı (v1) — süreç içi state yeterli.
// Overpass/Nominatim kullanım politikaları 1 istek/sn ister; ihlal IP banı getirir.

const lastCallAt = new Map<string, number>()
const pending = new Map<string, Promise<void>>()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function rateLimit(key: string, perSec: number): Promise<void> {
  if (!perSec || perSec <= 0) return
  const minIntervalMs = 1000 / perSec

  // Aynı anahtara eşzamanlı istekleri sıraya diz
  const previous = pending.get(key) ?? Promise.resolve()
  let release: () => void
  const current = new Promise<void>((r) => (release = r))
  pending.set(
    key,
    previous.then(() => current)
  )
  await previous

  const last = lastCallAt.get(key) ?? 0
  const waitMs = last + minIntervalMs - Date.now()
  if (waitMs > 0) await sleep(waitMs)
  lastCallAt.set(key, Date.now())
  release!()
}
