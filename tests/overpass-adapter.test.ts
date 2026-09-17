import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOverpassAdapter, overFetchCount } from '@/lib/discovery/adapters/overpass'

// Oran sınırlayıcı testte gerçek bekleme yapmasın.
vi.mock('@/lib/discovery/rate-limit', () => ({ rateLimit: async () => {} }))

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function element(id: number, name: string, lat: number) {
  return { type: 'node', id, lat, lon: 29.0, tags: { name, shop: 'hairdresser' } }
}

const baseQuery = { categoryKey: 'kuafor', lat: 41, lng: 29, radiusM: 1000, limit: 5 }

describe('overpass adapter', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('overFetchCount istenenin 3 katını, en fazla 600 döndürür', () => {
    expect(overFetchCount(5)).toBe(15)
    expect(overFetchCount(200)).toBe(600)
    expect(overFetchCount(500)).toBe(600)
  })

  it('sonuçları limit yerine over-fetch sınırına kadar döndürür (filtre çağıranda)', async () => {
    const elements = Array.from({ length: 30 }, (_, i) => element(i, `Kuaför ${i}`, 41 + i * 0.01))
    fetchMock.mockResolvedValueOnce(jsonResponse({ elements }))

    const adapter = createOverpassAdapter()
    const prospects = await adapter.search(baseQuery)

    // limit=5 iken 5'e kırpılsaydı, sağlık filtresinden sonra elde neredeyse hiçbir şey kalmıyordu.
    expect(prospects.length).toBe(overFetchCount(5))
    expect(prospects.length).toBeGreaterThan(baseQuery.limit)
  })

  it('HTTP 200 + XHTML hata sayfasını yeniden denenebilir sayar ve JSON hatası sızdırmaz', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response('<?xml version="1.0"?><html><body>runtime error</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      )
      .mockResolvedValueOnce(jsonResponse({ elements: [element(1, 'A', 41)] }))

    const adapter = createOverpassAdapter()
    const prospects = await adapter.search(baseQuery)

    expect(prospects.map((p) => p.name)).toEqual(['A'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('tüm denemeler başarısızsa mesajda "Unexpected token" geçmez', async () => {
    fetchMock.mockResolvedValue(
      new Response('<?xml version="1.0"?><html/>', { status: 200 })
    )

    const adapter = createOverpassAdapter()
    const err = await adapter.search(baseQuery).catch((e: Error) => e)
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toMatch(/Harita servisine ulaşılamadı/)
    expect((err as Error).message).not.toMatch(/Unexpected token/)
  }, 15_000)

  it('remark alanındaki timeout yeniden denenir', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ elements: [], remark: 'runtime error: Query timed out' }))
      .mockResolvedValueOnce(jsonResponse({ elements: [element(2, 'B', 41)] }))

    const adapter = createOverpassAdapter()
    const prospects = await adapter.search(baseQuery)
    expect(prospects.map((p) => p.name)).toEqual(['B'])
  })

  it('isimsiz kayıtları eler, aynı isim+konumu tekilleştirir', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        elements: [
          element(1, 'Aynı', 41.0001),
          { type: 'way', id: 2, center: { lat: 41.0001, lon: 29.0 }, tags: { name: 'Aynı' } },
          { type: 'node', id: 3, lat: 41, lon: 29, tags: { shop: 'hairdresser' } },
        ],
      })
    )
    const adapter = createOverpassAdapter()
    const prospects = await adapter.search(baseQuery)
    expect(prospects).toHaveLength(1)
    expect(prospects[0].lat).toBeCloseTo(41.0001)
  })
})
