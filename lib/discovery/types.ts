export interface SearchQuery {
  // Küratörlü kategori anahtarı (lib/discovery/osm-categories.ts) veya serbest metin — en az biri dolu
  categoryKey?: string
  categoryText?: string
  lat: number
  lng: number
  radiusM: number
  limit: number
  // Koordinat tabanlı olmayan kaynaklar (AI araması) için ham konum metni
  city?: string
  district?: string
}

export interface Prospect {
  name: string
  category?: string
  address?: string
  city?: string
  district?: string
  phone?: string
  website?: string
  lat?: number
  lng?: number
  sourceRecordId?: string
  score?: number
  raw?: unknown
}

export interface SourceAdapter {
  code: string
  kind: 'api' | 'scraper' | 'import'
  search(q: SearchQuery): Promise<Prospect[]>
}

// 'opportunity' = sitesi olmayan VEYA bozuk olanlar (sweep modunun varsayılanı)
export type WebsiteStatusFilter = 'any' | 'no_website' | 'broken' | 'working' | 'opportunity'
