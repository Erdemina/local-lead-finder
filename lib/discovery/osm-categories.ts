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
  { key: 'psikolog', label: 'Psikolog / Psikoterapist', selectors: ['healthcare=psychotherapist', 'healthcare=counselling', 'healthcare:speciality=psychiatry', 'healthcare:speciality=psychology'] },
  { key: 'doktor', label: 'Doktor Muayenehanesi', selectors: ['amenity=doctors', 'healthcare=doctor'] },
  { key: 'klinik', label: 'Klinik / Poliklinik / Tıp Merkezi', selectors: ['amenity=clinic', 'healthcare=clinic'] },
  { key: 'fizyoterapi', label: 'Fizyoterapi / Rehabilitasyon', selectors: ['healthcare=physiotherapist', 'healthcare=rehabilitation'] },
  { key: 'diyetisyen', label: 'Diyetisyen / Beslenme Danışmanı', selectors: ['healthcare=dietitian', 'healthcare=nutrition_counselling'] },
  { key: 'optik', label: 'Optik / Gözlükçü', selectors: ['shop=optician', 'healthcare=optometrist'] },
  { key: 'laboratuvar', label: 'Tıbbi Laboratuvar / Görüntüleme', selectors: ['healthcare=laboratory', 'healthcare=sample_collection'] },
  { key: 'isitme', label: 'İşitme Merkezi', selectors: ['healthcare=audiologist', 'shop=hearing_aids'] },
  { key: 'medikal', label: 'Medikal Malzeme', selectors: ['shop=medical_supply'] },
  { key: 'avukat', label: 'Avukatlık Bürosu', selectors: ['office=lawyer'] },
  { key: 'noter', label: 'Noter', selectors: ['office=notary'] },
  { key: 'danismanlik', label: 'Danışmanlık Firması', selectors: ['office=consulting'] },
  { key: 'reklam', label: 'Reklam / Kreatif Ajans', selectors: ['office=advertising_agency'] },
  { key: 'yazilim', label: 'Yazılım / BT Firması', selectors: ['office=it', 'office=software'] },
  { key: 'muhendislik', label: 'Mühendislik Ofisi', selectors: ['office=engineer'] },
  { key: 'kurs', label: 'Kurs / Dershane / Eğitim Merkezi', selectors: ['amenity=language_school', 'amenity=prep_school', 'amenity=training', 'amenity=music_school', 'amenity=driving_school'] },
  { key: 'anaokulu', label: 'Anaokulu / Kreş', selectors: ['amenity=kindergarten', 'amenity=childcare'] },
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
  psikolog: ['psikolog', 'psikoloji', 'psikoterapi', 'psikoterapist', 'psikiyatri', 'psikiyatrist', 'terapi', 'terapist', 'danisman psikolog', 'psychologist', 'therapist', 'counselling', 'aile danismani', 'pedagog'],
  doktor: ['doktor', 'hekim', 'muayenehane', 'doctor', 'dahiliye', 'cocuk doktoru', 'kadin dogum', 'dermatolog', 'cildiye', 'goz doktoru', 'kbb', 'ortopedi', 'kardiyolog', 'uzman doktor'],
  klinik: ['klinik', 'poliklinik', 'tip merkezi', 'saglik merkezi', 'clinic', 'saglik', 'medikal merkez', 'estetik klinik', 'sac ekimi'],
  fizyoterapi: ['fizyoterapi', 'fizyoterapist', 'fizik tedavi', 'rehabilitasyon', 'physiotherapy', 'manuel terapi', 'osteopat', 'kiropraktik'],
  diyetisyen: ['diyetisyen', 'diyet', 'beslenme', 'dietitian', 'nutrition', 'zayiflama'],
  optik: ['optik', 'gozlukcu', 'gozluk', 'optisyen', 'optician', 'lens'],
  laboratuvar: ['laboratuvar', 'tahlil', 'lab', 'goruntuleme', 'radyoloji', 'mr', 'tomografi', 'ultrason'],
  isitme: ['isitme', 'isitme cihazi', 'odyolog', 'hearing'],
  medikal: ['medikal', 'tibbi malzeme', 'ortopedik urun', 'medical supply'],
  avukat: ['avukat', 'hukuk', 'lawyer', 'hukuk burosu'],
  noter: ['noter', 'noterlik', 'notary'],
  danismanlik: ['danismanlik', 'danisman', 'consulting', 'yonetim danismanligi', 'is gelistirme', 'kobi danismani'],
  reklam: ['reklam ajansi', 'ajans', 'kreatif', 'dijital ajans', 'sosyal medya ajansi', 'advertising', 'agency', 'tasarim ajansi', 'grafik tasarim'],
  yazilim: ['yazilim', 'software', 'bilisim', 'bt', 'it firmasi', 'web tasarim', 'teknoloji', 'bilgisayar'],
  muhendislik: ['muhendislik', 'muhendis', 'engineer', 'proje ofisi', 'insaat muhendisi', 'harita muhendisi'],
  kurs: ['kurs', 'dershane', 'egitim', 'egitim merkezi', 'dil kursu', 'ingilizce kursu', 'muzik kursu', 'surucu kursu', 'ehliyet', 'etut', 'ozel ders', 'akademi', 'training', 'language school'],
  anaokulu: ['anaokulu', 'kres', 'gunduz bakimevi', 'okul oncesi', 'kindergarten', 'cocuk yuvasi'],
  mimar: ['mimar', 'mimarlik', 'architect', 'ic mimar'],
  muhasebe: ['muhasebe', 'mali musavir', 'accountant', 'smmm'],
  emlak: ['emlak', 'gayrimenkul', 'estate', 'realtor'],
  sigorta: ['sigorta', 'insurance', 'acente'],
  oto: ['oto', 'oto servis', 'tamir', 'tamirhane', 'car repair', 'oto tamir', 'kaporta'],
  lastik: ['lastik', 'tyre', 'tire', 'lastikci'],
  cnc: ['cnc', 'torna', 'metal', 'kaynak', 'atolye', 'freze', 'imalat'],
  marangoz: ['marangoz', 'mobilya', 'ahsap', 'dogramaci'],
  matbaa: ['matbaa', 'baski', 'print', 'kirtasiye baski', 'tabela', 'reklam baski'],
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

// Etiketlerdeki ayırt edici olmayan kelimeler — tek başına eşleşme sayılmaz
// ("yazılım firması" → "Danışmanlık Firması" gibi yanlış eşleşmeleri önler).
const LABEL_STOPWORDS = new Set(['ofisi', 'ofis', 'firmasi', 'firma', 'merkezi', 'merkez', 'burosu', 'buro', 'klinigi', 'salonu', 'acentesi', 'atolyesi', 'malzeme'])

/** Kullanıcının yazdığı serbest metne uyan kategorileri döndürür (alakalıdan alakasıza). */
export function matchOsmCategories(text: string): OsmCategory[] {
  const q = normalize(text)
  if (!q) return []
  const words = q.split(' ').filter((w) => w.length >= 3)

  const scored: { category: OsmCategory; score: number }[] = []
  for (const category of OSM_CATEGORIES) {
    const labelWords = normalize(category.label).split(' ').filter((w) => !LABEL_STOPWORDS.has(w))
    const terms = [category.key, ...labelWords, ...(SYNONYMS[category.key] ?? [])]
      .map(normalize)
      .filter(Boolean)

    // Eşit kademede daha uzun (daha özgül) terim öne geçer.
    let score = 0
    for (const term of terms) {
      const bonus = Math.min(term.length, 20)
      if (term === q) score = Math.max(score, 100)
      else if (q.includes(term) && term.length >= 3) score = Math.max(score, 60 + bonus)
      else if (words.some((w) => term.includes(w))) score = Math.max(score, 30 + bonus)
    }
    if (score > 0) scored.push({ category, score })
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.category)
}
