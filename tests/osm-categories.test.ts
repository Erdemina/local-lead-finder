import { describe, expect, it } from 'vitest'
import { matchOsmCategories, findOsmCategory } from '@/lib/discovery/osm-categories'

describe('serbest metin → kategori eşleştirme', () => {
  it('Türkçe karakterli tam adı eşler', () => {
    expect(matchOsmCategories('kuaför')[0].key).toBe('kuafor')
    expect(matchOsmCategories('çiçekçi')[0].key).toBe('cicek')
    expect(matchOsmCategories('diş')[0].key).toBe('dis')
  })

  it('eş anlamlıları eşler', () => {
    expect(matchOsmCategories('berber')[0].key).toBe('kuafor')
    expect(matchOsmCategories('lokanta')[0].key).toBe('restoran')
    expect(matchOsmCategories('gym')[0].key).toBe('spor')
    expect(matchOsmCategories('çilingir')[0].key).toBe('anahtar')
    expect(matchOsmCategories('mali müşavir')[0].key).toBe('muhasebe')
  })

  it('sağlık ve serbest meslek kategorilerini eşler', () => {
    expect(matchOsmCategories('psikolog')[0].key).toBe('psikolog')
    expect(matchOsmCategories('Psikiyatrist')[0].key).toBe('psikolog')
    expect(matchOsmCategories('aile danışmanı')[0].key).toBe('psikolog')
    expect(matchOsmCategories('fizik tedavi')[0].key).toBe('fizyoterapi')
    expect(matchOsmCategories('diyetisyen')[0].key).toBe('diyetisyen')
    expect(matchOsmCategories('gözlükçü')[0].key).toBe('optik')
    expect(matchOsmCategories('muayenehane')[0].key).toBe('doktor')
    expect(matchOsmCategories('noter')[0].key).toBe('noter')
    expect(matchOsmCategories('dershane')[0].key).toBe('kurs')
    expect(matchOsmCategories('kreş')[0].key).toBe('anaokulu')
    expect(matchOsmCategories('yazılım firması')[0].key).toBe('yazilim')
  })

  it('çok kelimeli ve büyük/küçük harf karışık metni eşler', () => {
    expect(matchOsmCategories('Oto Tamir')[0].key).toBe('oto')
    expect(matchOsmCategories('DİŞ HEKİMİ')[0].key).toBe('dis')
  })

  it('alakasız metinde boş döner — sorgu hiç kurulmaz', () => {
    expect(matchOsmCategories('asdfqwerty')).toHaveLength(0)
    expect(matchOsmCategories('  ')).toHaveLength(0)
  })

  it('eşleşen kategorilerin OSM seçicileri geçerli biçimde', () => {
    for (const c of matchOsmCategories('kuaför')) {
      for (const s of c.selectors) expect(s).toMatch(/^[a-z_:]+=[a-z_]+$/)
    }
  })

  it('anahtar ile doğrudan arama çalışır', () => {
    expect(findOsmCategory('kafe')?.selectors).toEqual(['amenity=cafe'])
    expect(findOsmCategory('yokboyle')).toBeUndefined()
  })
})
