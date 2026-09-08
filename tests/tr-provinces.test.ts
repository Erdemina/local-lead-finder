import { describe, expect, it } from 'vitest'
import {
  TR_PROVINCES,
  PROVINCES_BY_POPULATION,
  findProvince,
} from '@/lib/discovery/tr-provinces'
import { normalizeCity } from '@/lib/discovery/tr-provinces'
import { TR_DISTRICTS, districtsOf, hasDistricts } from '@/lib/discovery/tr-districts'

// Türkiye'nin yaklaşık sınırları — bir koordinat yanlış girilirse o il sessizce
// yanlış bölgeyi tarar, bu yüzden sınır kontrolü testle sabitleniyor.
const BOUNDS = { latMin: 35.8, latMax: 42.2, lngMin: 25.6, lngMax: 44.9 }

describe('il listesi', () => {
  it('81 il var ve plaka kodları 1-81 arası benzersiz', () => {
    expect(TR_PROVINCES).toHaveLength(81)
    const codes = TR_PROVINCES.map((p) => p.code).sort((a, b) => a - b)
    expect(codes[0]).toBe(1)
    expect(codes[80]).toBe(81)
    expect(new Set(codes).size).toBe(81)
  })

  it('il adları benzersiz', () => {
    expect(new Set(TR_PROVINCES.map((p) => p.name)).size).toBe(81)
  })

  it('tüm koordinatlar Türkiye sınırları içinde', () => {
    for (const p of TR_PROVINCES) {
      expect(p.lat, `${p.name} enlem`).toBeGreaterThan(BOUNDS.latMin)
      expect(p.lat, `${p.name} enlem`).toBeLessThan(BOUNDS.latMax)
      expect(p.lng, `${p.name} boylam`).toBeGreaterThan(BOUNDS.lngMin)
      expect(p.lng, `${p.name} boylam`).toBeLessThan(BOUNDS.lngMax)
    }
  })

  it('nüfusa göre sıralama azalan ve İstanbul ilk', () => {
    expect(PROVINCES_BY_POPULATION[0].name).toBe('İstanbul')
    for (let i = 1; i < PROVINCES_BY_POPULATION.length; i++) {
      expect(PROVINCES_BY_POPULATION[i - 1].pop).toBeGreaterThanOrEqual(
        PROVINCES_BY_POPULATION[i].pop
      )
    }
  })

  it('il arama Türkçe büyük/küçük harfe duyarsız', () => {
    expect(findProvince('istanbul')?.code).toBe(34)
    expect(findProvince('İSTANBUL')?.code).toBe(34)
    expect(findProvince('  Şanlıurfa ')?.code).toBe(63)
    expect(findProvince('Yokşehir')).toBeUndefined()
  })
})

describe('şehir normalizasyonu', () => {
  it('OSM etiketi gerçek bir il ise korunur', () => {
    expect(normalizeCity('İstanbul', 'Ankara')).toBe('İstanbul')
    expect(normalizeCity('izmir', 'Bursa')).toBe('İzmir')
  })

  it('etiket çöp ise aranan il yazılır', () => {
    // Gerçek veriden gelen bozuk değerler
    expect(normalizeCity('20/B', 'İstanbul')).toBe('İstanbul')
    expect(normalizeCity('Yeşiltepe Mahallesi', 'Ankara')).toBe('Ankara')
    expect(normalizeCity(null, 'İzmir')).toBe('İzmir')
    expect(normalizeCity('', 'Bursa')).toBe('Bursa')
  })

  it('ikisi de yoksa undefined döner', () => {
    expect(normalizeCity(null, null)).toBeUndefined()
    expect(normalizeCity(undefined, undefined)).toBeUndefined()
  })
})

describe('ilçe listeleri', () => {
  it('her ilçe listesinin ili gerçekten var', () => {
    for (const province of Object.keys(TR_DISTRICTS)) {
      expect(findProvince(province), `${province} il listesinde yok`).toBeDefined()
    }
  })

  it('bilinen ilçe sayıları tutuyor', () => {
    expect(districtsOf('İstanbul')).toHaveLength(39)
    expect(districtsOf('Ankara')).toHaveLength(25)
    expect(districtsOf('İzmir')).toHaveLength(30)
    expect(districtsOf('Bursa')).toHaveLength(17)
    expect(districtsOf('Antalya')).toHaveLength(19)
  })

  it('ilçe adları benzersiz ve boş değil', () => {
    for (const [province, list] of Object.entries(TR_DISTRICTS)) {
      expect(new Set(list).size, `${province} tekrar eden ilçe`).toBe(list.length)
      for (const d of list) expect(d.trim().length).toBeGreaterThan(1)
    }
  })

  it('listesi olmayan il serbest metne düşer', () => {
    expect(hasDistricts('İstanbul')).toBe(true)
    expect(hasDistricts('Bayburt')).toBe(false)
    expect(districtsOf('Bayburt')).toEqual([])
  })
})
