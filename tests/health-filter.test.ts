import { describe, expect, it } from 'vitest'
import { healthMatchesFilter, HEALTH_PRIORITY } from '@/lib/discovery/engine'

describe('healthMatchesFilter', () => {
  it('kontrol edilmemiş (unknown) site "çalışıyor" sayılmaz', () => {
    expect(healthMatchesFilter('unknown', 'working')).toBe(false)
    expect(healthMatchesFilter('unknown', 'broken')).toBe(false)
    expect(healthMatchesFilter('unknown', 'opportunity')).toBe(false)
    expect(healthMatchesFilter('unknown', 'any')).toBe(true)
  })

  it('opportunity = sitesi yok veya bozuk', () => {
    expect(healthMatchesFilter('no_website', 'opportunity')).toBe(true)
    expect(healthMatchesFilter('red', 'opportunity')).toBe(true)
    expect(healthMatchesFilter('yellow', 'opportunity')).toBe(true)
    expect(healthMatchesFilter('green', 'opportunity')).toBe(false)
  })

  it('unknown sıralamada en sona düşer', () => {
    expect(HEALTH_PRIORITY.unknown).toBeGreaterThan(HEALTH_PRIORITY.green)
  })
})
