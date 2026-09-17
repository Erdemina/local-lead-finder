// Web sitesi sağlık kontrolü — lib/system-detect.ts'in kanıtlanmış fetch çekirdeği üstüne
// yeşil/sarı/kırmızı sınıflaması ekler.
//
// green  : 2xx/3xx + anlamlı içerik
// yellow : park edilmiş domain, çok küçük gövde, sertifika hatası — "fiilen ölü" sinyalleri
// red    : DNS hatası, timeout, bağlantı reddi, 4xx/5xx
// no_website : URL yok

const FETCH_TIMEOUT_MS = 6000
const MAX_HTML_BYTES = 250_000
const MIN_MEANINGFUL_BYTES = 512

const PARKED_HINTS = [
  'domain is for sale',
  'bu alan adı satılıktır',
  'bu domain satılıktır',
  'alan adı satın al',
  'parked domain',
  'domain parking',
  'sedoparking',
  'bu site yapım aşamasında',
  'under construction',
  'hosting hizmeti sona ermiştir',
  'hesap askıya alınmıştır',
  'account suspended',
]

const CERT_ERROR_CODES = new Set([
  'CERT_HAS_EXPIRED',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
])

export type HealthStatus = 'green' | 'yellow' | 'red' | 'no_website' | 'unknown'

export interface HealthDetail {
  httpStatus?: number
  reason: string
  bodyBytes?: number
  parkedHint?: string
  errorCode?: string
}

export interface HealthResult {
  status: HealthStatus
  detail: HealthDetail
}

export function normalizeWebsiteUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed || trimmed === 'Bilinmiyor') return null
  try {
    const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    if (!u.hostname.includes('.')) return null
    return u.toString()
  } catch {
    return null
  }
}

export async function checkWebsiteHealth(rawUrl: string | null | undefined): Promise<HealthResult> {
  const url = normalizeWebsiteUrl(rawUrl)
  if (!url) {
    return { status: 'no_website', detail: { reason: 'Web sitesi yok' } }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LocalLeadFinder/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })
    clearTimeout(timer)

    if (!res.ok) {
      return {
        status: 'red',
        detail: { httpStatus: res.status, reason: `Site hata döndürdü (${res.status})` },
      }
    }

    let html = ''
    let total = 0
    const reader = res.body?.getReader()
    if (reader) {
      const decoder = new TextDecoder('utf-8', { fatal: false })
      while (total < MAX_HTML_BYTES) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.byteLength
        html += decoder.decode(value, { stream: true })
      }
      try {
        await reader.cancel()
      } catch {}
    } else {
      html = (await res.text()).slice(0, MAX_HTML_BYTES)
      total = html.length
    }

    const lower = html.toLowerCase()
    const parkedHit = PARKED_HINTS.find((hint) => lower.includes(hint))
    if (parkedHit) {
      return {
        status: 'yellow',
        detail: {
          httpStatus: res.status,
          reason: 'Park edilmiş / askıda görünen site',
          parkedHint: parkedHit,
          bodyBytes: total,
        },
      }
    }
    if (total < MIN_MEANINGFUL_BYTES) {
      return {
        status: 'yellow',
        detail: { httpStatus: res.status, reason: 'Neredeyse boş sayfa', bodyBytes: total },
      }
    }
    return {
      status: 'green',
      detail: { httpStatus: res.status, reason: 'Site çalışıyor', bodyBytes: total },
    }
  } catch (err: any) {
    clearTimeout(timer)
    if (err?.name === 'AbortError') {
      return { status: 'red', detail: { reason: 'Zaman aşımı — site cevap vermedi' } }
    }
    const code: string | undefined = err?.cause?.code ?? err?.code
    if (code && CERT_ERROR_CODES.has(code)) {
      return {
        status: 'yellow',
        detail: { reason: 'SSL sertifika hatası', errorCode: code },
      }
    }
    return {
      status: 'red',
      detail: { reason: 'Siteye erişilemedi', errorCode: code },
    }
  }
}

export async function checkWebsiteHealthBatch<T extends { website?: string | null }>(
  items: T[],
  concurrency = 6
): Promise<Map<T, HealthResult>> {
  const results = new Map<T, HealthResult>()
  let cursor = 0

  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++
      if (i >= items.length) return
      const item = items[i]
      try {
        results.set(item, await checkWebsiteHealth(item.website))
      } catch {
        results.set(item, { status: 'red', detail: { reason: 'Kontrol hatası' } })
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}
