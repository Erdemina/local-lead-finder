// Türkiye'nin 81 il merkezi. Koordinatlar koda gömülü çünkü toplu tarama başlatılırken
// 81 ayrı Nominatim sorgusu (saniyede 1 istek sınırı) isteği ~1.5 dakika bloke ederdi.
// Değerler scripts/verify-provinces.ts ile Nominatim'e karşı doğrulanır.

export interface Province {
  /** Plaka kodu — sıralama ve kimlik için */
  code: number
  name: string
  lat: number
  lng: number
  /** Kabaca nüfus (bin) — tarama sırasını büyükten küçüğe kurmak için */
  pop: number
}

export const TR_PROVINCES: Province[] = [
  { code: 1, name: 'Adana', lat: 37.0, lng: 35.3213, pop: 2270 },
  { code: 2, name: 'Adıyaman', lat: 37.7648, lng: 38.2786, pop: 635 },
  { code: 3, name: 'Afyonkarahisar', lat: 38.7507, lng: 30.5567, pop: 747 },
  { code: 4, name: 'Ağrı', lat: 39.7191, lng: 43.0503, pop: 511 },
  { code: 5, name: 'Amasya', lat: 40.6499, lng: 35.8353, pop: 338 },
  { code: 6, name: 'Ankara', lat: 39.9334, lng: 32.8597, pop: 5747 },
  { code: 7, name: 'Antalya', lat: 36.8969, lng: 30.7133, pop: 2688 },
  { code: 8, name: 'Artvin', lat: 41.1828, lng: 41.8183, pop: 170 },
  { code: 9, name: 'Aydın', lat: 37.856, lng: 27.8416, pop: 1148 },
  { code: 10, name: 'Balıkesir', lat: 39.6484, lng: 27.8826, pop: 1257 },
  { code: 11, name: 'Bilecik', lat: 40.1426, lng: 29.9793, pop: 228 },
  { code: 12, name: 'Bingöl', lat: 38.8854, lng: 40.4989, pop: 282 },
  { code: 13, name: 'Bitlis', lat: 38.3938, lng: 42.1232, pop: 353 },
  { code: 14, name: 'Bolu', lat: 40.576, lng: 31.5788, pop: 320 },
  { code: 15, name: 'Burdur', lat: 37.7203, lng: 30.2908, pop: 273 },
  { code: 16, name: 'Bursa', lat: 40.1826, lng: 29.0665, pop: 3194 },
  { code: 17, name: 'Çanakkale', lat: 40.1553, lng: 26.4142, pop: 559 },
  { code: 18, name: 'Çankırı', lat: 40.6013, lng: 33.6134, pop: 196 },
  { code: 19, name: 'Çorum', lat: 40.5506, lng: 34.9556, pop: 524 },
  // Nominatim "Denizli" için İstanbul yakınındaki aynı adlı yerleşimi döndürüyor;
  // doğrulama scripti bu ili yanlış pozitif olarak işaretler, değer doğrudur.
  { code: 20, name: 'Denizli', lat: 37.7765, lng: 29.0864, pop: 1056 },
  { code: 21, name: 'Diyarbakır', lat: 37.9144, lng: 40.2306, pop: 1804 },
  { code: 22, name: 'Edirne', lat: 41.6771, lng: 26.5557, pop: 414 },
  { code: 23, name: 'Elazığ', lat: 38.681, lng: 39.2264, pop: 596 },
  { code: 24, name: 'Erzincan', lat: 39.75, lng: 39.5, pop: 239 },
  { code: 25, name: 'Erzurum', lat: 39.9043, lng: 41.2679, pop: 749 },
  { code: 26, name: 'Eskişehir', lat: 39.7767, lng: 30.5206, pop: 906 },
  { code: 27, name: 'Gaziantep', lat: 37.0662, lng: 37.3833, pop: 2154 },
  { code: 28, name: 'Giresun', lat: 40.9128, lng: 38.3895, pop: 450 },
  { code: 29, name: 'Gümüşhane', lat: 40.4386, lng: 39.5086, pop: 150 },
  { code: 30, name: 'Hakkari', lat: 37.5744, lng: 43.7408, pop: 287 },
  { code: 31, name: 'Hatay', lat: 36.2025, lng: 36.1606, pop: 1686 },
  { code: 32, name: 'Isparta', lat: 37.7648, lng: 30.5566, pop: 445 },
  { code: 33, name: 'Mersin', lat: 36.8, lng: 34.6333, pop: 1916 },
  { code: 34, name: 'İstanbul', lat: 41.0082, lng: 28.9784, pop: 15907 },
  { code: 35, name: 'İzmir', lat: 38.4237, lng: 27.1428, pop: 4462 },
  { code: 36, name: 'Kars', lat: 40.6013, lng: 43.0975, pop: 274 },
  { code: 37, name: 'Kastamonu', lat: 41.3887, lng: 33.7827, pop: 391 },
  { code: 38, name: 'Kayseri', lat: 38.7312, lng: 35.4787, pop: 1441 },
  { code: 39, name: 'Kırklareli', lat: 41.7355, lng: 27.2244, pop: 373 },
  { code: 40, name: 'Kırşehir', lat: 39.1425, lng: 34.1709, pop: 244 },
  { code: 41, name: 'Kocaeli', lat: 40.8533, lng: 29.8815, pop: 2079 },
  { code: 42, name: 'Konya', lat: 37.8746, lng: 32.4932, pop: 2296 },
  { code: 43, name: 'Kütahya', lat: 39.4242, lng: 29.9833, pop: 572 },
  { code: 44, name: 'Malatya', lat: 38.3552, lng: 38.3095, pop: 812 },
  { code: 45, name: 'Manisa', lat: 38.6191, lng: 27.4289, pop: 1468 },
  { code: 46, name: 'Kahramanmaraş', lat: 37.5858, lng: 36.9371, pop: 1177 },
  { code: 47, name: 'Mardin', lat: 37.3212, lng: 40.735, pop: 870 },
  { code: 48, name: 'Muğla', lat: 37.2153, lng: 28.3636, pop: 1048 },
  { code: 49, name: 'Muş', lat: 38.7322, lng: 41.4899, pop: 408 },
  { code: 50, name: 'Nevşehir', lat: 38.6939, lng: 34.6857, pop: 310 },
  { code: 51, name: 'Niğde', lat: 37.9667, lng: 34.6833, pop: 364 },
  { code: 52, name: 'Ordu', lat: 40.9839, lng: 37.8764, pop: 763 },
  { code: 53, name: 'Rize', lat: 41.0201, lng: 40.5234, pop: 344 },
  { code: 54, name: 'Sakarya', lat: 40.7569, lng: 30.3781, pop: 1060 },
  { code: 55, name: 'Samsun', lat: 41.2867, lng: 36.33, pop: 1368 },
  { code: 56, name: 'Siirt', lat: 37.9333, lng: 41.95, pop: 331 },
  { code: 57, name: 'Sinop', lat: 42.0231, lng: 35.1531, pop: 219 },
  { code: 58, name: 'Sivas', lat: 39.7477, lng: 37.0179, pop: 634 },
  { code: 59, name: 'Tekirdağ', lat: 40.9833, lng: 27.5167, pop: 1113 },
  { code: 60, name: 'Tokat', lat: 40.3167, lng: 36.5544, pop: 596 },
  { code: 61, name: 'Trabzon', lat: 41.0015, lng: 39.7178, pop: 818 },
  { code: 62, name: 'Tunceli', lat: 39.3074, lng: 39.4388, pop: 84 },
  { code: 63, name: 'Şanlıurfa', lat: 37.1591, lng: 38.7969, pop: 2170 },
  { code: 64, name: 'Uşak', lat: 38.6823, lng: 29.4082, pop: 375 },
  { code: 65, name: 'Van', lat: 38.4891, lng: 43.4089, pop: 1128 },
  { code: 66, name: 'Yozgat', lat: 39.8181, lng: 34.8147, pop: 418 },
  { code: 67, name: 'Zonguldak', lat: 41.4564, lng: 31.7987, pop: 588 },
  { code: 68, name: 'Aksaray', lat: 38.3687, lng: 34.037, pop: 433 },
  { code: 69, name: 'Bayburt', lat: 40.2552, lng: 40.2249, pop: 85 },
  { code: 70, name: 'Karaman', lat: 37.1759, lng: 33.2287, pop: 260 },
  { code: 71, name: 'Kırıkkale', lat: 39.8468, lng: 33.5153, pop: 285 },
  { code: 72, name: 'Batman', lat: 37.8812, lng: 41.1351, pop: 634 },
  { code: 73, name: 'Şırnak', lat: 37.5164, lng: 42.4611, pop: 570 },
  { code: 74, name: 'Bartın', lat: 41.6344, lng: 32.3375, pop: 203 },
  { code: 75, name: 'Ardahan', lat: 41.1105, lng: 42.7022, pop: 92 },
  { code: 76, name: 'Iğdır', lat: 39.9167, lng: 44.0333, pop: 203 },
  { code: 77, name: 'Yalova', lat: 40.655, lng: 29.2769, pop: 296 },
  { code: 78, name: 'Karabük', lat: 41.2061, lng: 32.6204, pop: 252 },
  { code: 79, name: 'Kilis', lat: 36.7184, lng: 37.1212, pop: 155 },
  { code: 80, name: 'Osmaniye', lat: 37.213, lng: 36.1763, pop: 559 },
  { code: 81, name: 'Düzce', lat: 40.8438, lng: 31.1565, pop: 405 },
]

/** Nüfusa göre azalan sıra — büyük iller önce taransın, ilk sonuçlar daha değerli olsun. */
export const PROVINCES_BY_POPULATION = [...TR_PROVINCES].sort((a, b) => b.pop - a.pop)

export function findProvince(name: string): Province | undefined {
  const n = name.trim().toLocaleLowerCase('tr-TR')
  return TR_PROVINCES.find((p) => p.name.toLocaleLowerCase('tr-TR') === n)
}

/**
 * OSM'in `addr:city` etiketi çoğu kayıtta boş ya da hatalı ("20/B", mahalle adı).
 * Aranan il biliniyorken ona güvenmek gerekir; etiket ancak gerçek bir il adıysa korunur.
 */
export function normalizeCity(
  tagged: string | null | undefined,
  searchedProvince: string | null | undefined
): string | undefined {
  const fromTag = tagged?.trim()
  if (fromTag && findProvince(fromTag)) return findProvince(fromTag)!.name
  const searched = searchedProvince?.trim()
  if (searched && findProvince(searched)) return findProvince(searched)!.name
  return searched || fromTag || undefined
}
