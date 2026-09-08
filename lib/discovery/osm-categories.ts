// Türk KOBİ'lerine yönelik küratörlü kategori listesi → OSM tag seçicileri.
// Seçici formatı: "anahtar=değer" (Overpass sorgusunda nwr["anahtar"="değer"] olur).

export interface OsmCategory {
  key: string
  label: string
  selectors: string[]
}

export const OSM_CATEGORIES: OsmCategory[] = [
  { key: 'kuafor', label: 'Kuaför / Berber', selectors: ['shop=hairdresser'] },
  { key: 'guzellik', label: 'Güzellik Salonu', selectors: ['shop=beauty'] },
  { key: 'kafe', label: 'Kafe', selectors: ['amenity=cafe'] },
  { key: 'restoran', label: 'Restoran / Lokanta', selectors: ['amenity=restaurant', 'amenity=fast_food'] },
  { key: 'firin', label: 'Fırın / Pastane', selectors: ['shop=bakery', 'shop=confectionery'] },
  { key: 'otel', label: 'Otel / Pansiyon', selectors: ['tourism=hotel', 'tourism=guest_house'] },
  { key: 'spor', label: 'Spor Salonu', selectors: ['leisure=fitness_centre'] },
  { key: 'dis', label: 'Diş Kliniği', selectors: ['amenity=dentist'] },
  { key: 'veteriner', label: 'Veteriner Kliniği', selectors: ['amenity=veterinary'] },
  { key: 'eczane', label: 'Eczane', selectors: ['amenity=pharmacy'] },
  { key: 'avukat', label: 'Avukatlık Bürosu', selectors: ['office=lawyer'] },
  { key: 'mimar', label: 'Mimarlık Ofisi', selectors: ['office=architect'] },
  { key: 'muhasebe', label: 'Muhasebeci / Mali Müşavir', selectors: ['office=accountant'] },
  { key: 'emlak', label: 'Emlak Ofisi', selectors: ['office=estate_agent'] },
  { key: 'sigorta', label: 'Sigorta Acentesi', selectors: ['office=insurance'] },
  { key: 'oto', label: 'Oto Servis / Tamirhane', selectors: ['shop=car_repair'] },
  { key: 'lastik', label: 'Lastikçi', selectors: ['shop=tyres'] },
  { key: 'cnc', label: 'CNC / Torna / Metal Atölyesi', selectors: ['craft=metal_construction', 'craft=machining', 'craft=blacksmith'] },
  { key: 'marangoz', label: 'Marangoz / Mobilyacı', selectors: ['craft=carpenter', 'shop=furniture'] },
  { key: 'matbaa', label: 'Matbaa / Baskı Merkezi', selectors: ['craft=printer', 'shop=copyshop'] },
  { key: 'fotograf', label: 'Fotoğraf Stüdyosu', selectors: ['craft=photographer', 'shop=photo'] },
  { key: 'terzi', label: 'Terzi', selectors: ['craft=tailor'] },
  { key: 'cicek', label: 'Çiçekçi', selectors: ['shop=florist'] },
  { key: 'kirtasiye', label: 'Kırtasiye', selectors: ['shop=stationery'] },
  { key: 'market', label: 'Market / Şarküteri', selectors: ['shop=convenience', 'shop=deli'] },
  { key: 'kasap', label: 'Kasap', selectors: ['shop=butcher'] },
  { key: 'elektrikci', label: 'Elektrikçi', selectors: ['craft=electrician', 'shop=electrical'] },
  { key: 'tesisatci', label: 'Tesisatçı', selectors: ['craft=plumber'] },
  { key: 'anahtar', label: 'Anahtarcı / Çilingir', selectors: ['craft=locksmith', 'shop=locksmith'] },
  { key: 'kuyumcu', label: 'Kuyumcu', selectors: ['shop=jewelry'] },
]

export function findOsmCategory(key: string): OsmCategory | undefined {
  return OSM_CATEGORIES.find((c) => c.key === key)
}

// Serbest metin → kategori eşleştirme.
// Overpass'ta ad regex'i (["name"~"..."]) bir alan içinde bile hiçbir public sunucuda
// makul sürede dönmüyor (ölçüm: 4 aynada da 25-35 sn timeout). Bu yüzden kullanıcının
// yazdığı metni küratörlü kategorilere eşleyip hızlı tag sorgusuna çeviriyoruz.
const SYNONYMS: Record<string, string[]> = {
  kuafor: ['kuafor', 'berber', 'sac', 'coiffure', 'hairdresser', 'barber'],
  guzellik: ['guzellik', 'estetik', 'spa', 'cilt', 'beauty'],
  kafe: ['kafe', 'cafe', 'kahve', 'coffee', 'kahveci'],
  restoran: ['restoran', 'restaurant', 'lokanta', 'yemek', 'kebap', 'pideci', 'doner'],
  firin: ['firin', 'pastane', 'bakery', 'borekci', 'tatlici', 'unlu mamul'],
  otel: ['otel', 'hotel', 'pansiyon', 'konaklama', 'apart'],
  spor: ['spor', 'gym', 'fitness', 'salon', 'pilates', 'crossfit'],
  dis: ['dis', 'dentist', 'dis klinigi', 'dis hekimi', 'ortodonti'],
  veteriner: ['veteriner', 'vet', 'petklinik', 'hayvan'],
  eczane: ['eczane', 'pharmacy'],
  avukat: ['avukat', 'hukuk', 'lawyer', 'hukuk burosu'],
  mimar: ['mimar', 'mimarlik', 'architect', 'ic mimar'],
  muhasebe: ['muhasebe', 'mali musavir', 'accountant', 'smmm'],
  emlak: ['emlak', 'gayrimenkul', 'estate', 'realtor'],
  sigorta: ['sigorta', 'insurance', 'acente'],
  oto: ['oto', 'oto servis', 'tamir', 'tamirhane', 'car repair', 'oto tamir', 'kaporta'],
  lastik: ['lastik', 'tyre', 'tire', 'lastikci'],
  cnc: ['cnc', 'torna', 'metal', 'kaynak', 'atolye', 'freze', 'imalat'],
  marangoz: ['marangoz', 'mobilya', 'ahsap', 'dogramaci'],
  matbaa: ['matbaa', 'baski', 'print', 'kirtasiye baski', 'reklam'],
  fotograf: ['fotograf', 'foto', 'studyo', 'photo'],
  terzi: ['terzi', 'tailor', 'dikis'],
  cicek: ['cicek', 'cicekci', 'florist'],
  kirtasiye: ['kirtasiye', 'stationery'],
  market: ['market', 'bakkal', 'sarkuteri', 'sarkuterisi', 'gida'],
  kasap: ['kasap', 'et', 'butcher'],
  elektrikci: ['elektrik', 'elektrikci', 'electrician'],
  tesisatci: ['tesisat', 'tesisatci', 'su tesisati', 'plumber', 'kombi'],
  anahtar: ['anahtar', 'anahtarci', 'cilingir', 'locksmith'],
  kuyumcu: ['kuyumcu', 'altin', 'juvelir', 'jewelry', 'takı'],
}

const TR_MAP: Record<string, string> = {
  ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g',
  ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c',
}

function normalize(text: string): string {
  return text
    .replace(/[ıİşŞğĞüÜöÖçÇ]/g, (c) => TR_MAP[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Kullanıcının yazdığı serbest metne uyan kategorileri döndürür (alakalıdan alakasıza). */
export function matchOsmCategories(text: string): OsmCategory[] {
  const q = normalize(text)
  if (!q) return []
  const words = q.split(' ').filter((w) => w.length >= 3)

  const scored: { category: OsmCategory; score: number }[] = []
  for (const category of OSM_CATEGORIES) {
    const terms = [category.key, ...normalize(category.label).split(' '), ...(SYNONYMS[category.key] ?? [])]
      .map(normalize)
      .filter(Boolean)

    let score = 0
    for (const term of terms) {
      if (term === q) score = Math.max(score, 100)
      else if (q.includes(term) && term.length >= 3) score = Math.max(score, 60)
      else if (words.some((w) => term.includes(w))) score = Math.max(score, 30)
    }
    if (score > 0) scored.push({ category, score })
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.category)
}
