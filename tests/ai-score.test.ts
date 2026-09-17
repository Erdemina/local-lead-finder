import { describe, expect, it, vi } from 'vitest'
import { scoreProspects, type ScorableItem } from '@/lib/ai/score'
import type { AiClient } from '@/lib/ai/provider'

function items(n: number): ScorableItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `id-${i}`,
    name: `İşletme ${i}`,
    websiteHealth: 'no_website',
  }))
}

function clientWith(run: AiClient['run']): AiClient {
  return { provider: 'anthropic', model: 'test', run }
}

describe('scoreProspects', () => {
  it('bir parti hata verse bile diğer partilerin skorlarını korur', async () => {
    let call = 0
    const client = clientWith(async <T,>(): Promise<T> => {
      call++
      if (call === 2) throw new Error('parti 2 patladı')
      const ids = call === 1 ? [...Array(25).keys()] : [...Array(10).keys()].map((i) => i + 50)
      return { scores: ids.map((i) => ({ id: `id-${i}`, aiScore: 7, aiNote: 'n', aiReason: 'r' })) } as T
    })

    const out = await scoreProspects(client, 'ürün', items(60))

    expect(call).toBe(3)
    expect(out.size).toBe(35)
    expect(out.has('id-0')).toBe(true)
    expect(out.has('id-30')).toBe(false)
    expect(out.has('id-55')).toBe(true)
  })

  it('hiçbir parti tutmazsa hatayı yükseltir', async () => {
    const client = clientWith(async () => {
      throw new Error('hepsi patladı')
    })
    await expect(scoreProspects(client, 'ürün', items(3))).rejects.toThrow('hepsi patladı')
  })

  it('skoru 1-10 aralığına sıkıştırır, bilinmeyen id ve sayı olmayan skoru atlar', async () => {
    const client = clientWith(async <T,>(): Promise<T> =>
      ({
        scores: [
          { id: 'id-0', aiScore: 42, aiNote: 'a', aiReason: 'b' },
          { id: 'id-1', aiScore: -3, aiNote: 'a', aiReason: 'b' },
          { id: 'id-2', aiScore: 'yok', aiNote: 'a', aiReason: 'b' },
          { id: 'sahte', aiScore: 5, aiNote: 'a', aiReason: 'b' },
        ],
      }) as T
    )
    const out = await scoreProspects(client, 'ürün', items(3))
    expect(out.get('id-0')?.aiScore).toBe(10)
    expect(out.get('id-1')?.aiScore).toBe(1)
    expect(out.has('id-2')).toBe(false)
    expect(out.has('sahte')).toBe(false)
  })

  it('ilerlemeyi parti parti bildirir', async () => {
    const progress = vi.fn()
    const client = clientWith(async <T,>(): Promise<T> => ({ scores: [] }) as T)
    await scoreProspects(client, 'ürün', items(30), progress)
    expect(progress.mock.calls).toEqual([[25, 30], [30, 30]])
  })
})
