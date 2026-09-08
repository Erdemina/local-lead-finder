// İlçe listeleri. Tamamı 973 ilçe olduğu için yalnızca ilçe bazlı aramanın anlamlı
// olduğu büyük iller kapsanıyor; listesi olmayan illerde arayüz serbest metne düşer.
// (Küçük illerde il merkezi taraması zaten ilçelerin çoğunu kapsıyor.)

export const TR_DISTRICTS: Record<string, string[]> = {
  İstanbul: [
    'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler',
    'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü',
    'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt',
    'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane',
    'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
    'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla',
    'Ümraniye', 'Üsküdar', 'Zeytinburnu',
  ],
  Ankara: [
    'Akyurt', 'Altındağ', 'Ayaş', 'Bala', 'Beypazarı', 'Çamlıdere', 'Çankaya',
    'Çubuk', 'Elmadağ', 'Etimesgut', 'Evren', 'Gölbaşı', 'Güdül', 'Haymana',
    'Kahramankazan', 'Kalecik', 'Keçiören', 'Kızılcahamam', 'Mamak', 'Nallıhan',
    'Polatlı', 'Pursaklar', 'Sincan', 'Şereflikoçhisar', 'Yenimahalle',
  ],
  İzmir: [
    'Aliağa', 'Balçova', 'Bayındır', 'Bayraklı', 'Bergama', 'Beydağ', 'Bornova',
    'Buca', 'Çeşme', 'Çiğli', 'Dikili', 'Foça', 'Gaziemir', 'Güzelbahçe',
    'Karabağlar', 'Karaburun', 'Karşıyaka', 'Kemalpaşa', 'Kınık', 'Kiraz',
    'Konak', 'Menderes', 'Menemen', 'Narlıdere', 'Ödemiş', 'Seferihisar',
    'Selçuk', 'Tire', 'Torbalı', 'Urla',
  ],
  Bursa: [
    'Büyükorhan', 'Gemlik', 'Gürsu', 'Harmancık', 'İnegöl', 'İznik', 'Karacabey',
    'Keles', 'Kestel', 'Mudanya', 'Mustafakemalpaşa', 'Nilüfer', 'Orhaneli',
    'Orhangazi', 'Osmangazi', 'Yenişehir', 'Yıldırım',
  ],
  Antalya: [
    'Akseki', 'Aksu', 'Alanya', 'Demre', 'Döşemealtı', 'Elmalı', 'Finike',
    'Gazipaşa', 'Gündoğmuş', 'İbradı', 'Kaş', 'Kemer', 'Kepez', 'Konyaaltı',
    'Korkuteli', 'Kumluca', 'Manavgat', 'Muratpaşa', 'Serik',
  ],
  Adana: [
    'Aladağ', 'Ceyhan', 'Çukurova', 'Feke', 'İmamoğlu', 'Karaisalı', 'Karataş',
    'Kozan', 'Pozantı', 'Saimbeyli', 'Sarıçam', 'Seyhan', 'Tufanbeyli',
    'Yumurtalık', 'Yüreğir',
  ],
  Konya: [
    'Ahırlı', 'Akören', 'Akşehir', 'Altınekin', 'Beyşehir', 'Bozkır', 'Cihanbeyli',
    'Çeltik', 'Çumra', 'Derbent', 'Derebucak', 'Doğanhisar', 'Emirgazi', 'Ereğli',
    'Güneysınır', 'Hadim', 'Halkapınar', 'Hüyük', 'Ilgın', 'Kadınhanı', 'Karapınar',
    'Karatay', 'Kulu', 'Meram', 'Sarayönü', 'Selçuklu', 'Seydişehir', 'Taşkent',
    'Tuzlukçu', 'Yalıhüyük', 'Yunak',
  ],
  Gaziantep: [
    'Araban', 'İslahiye', 'Karkamış', 'Nizip', 'Nurdağı', 'Oğuzeli', 'Şahinbey',
    'Şehitkamil', 'Yavuzeli',
  ],
  Kocaeli: [
    'Başiskele', 'Çayırova', 'Darıca', 'Derince', 'Dilovası', 'Gebze', 'Gölcük',
    'İzmit', 'Kandıra', 'Karamürsel', 'Kartepe', 'Körfez',
  ],
  Mersin: [
    'Akdeniz', 'Anamur', 'Aydıncık', 'Bozyazı', 'Çamlıyayla', 'Erdemli', 'Gülnar',
    'Mezitli', 'Mut', 'Silifke', 'Tarsus', 'Toroslar', 'Yenişehir',
  ],
  Kayseri: [
    'Akkışla', 'Bünyan', 'Develi', 'Felahiye', 'Hacılar', 'İncesu', 'Kocasinan',
    'Melikgazi', 'Özvatan', 'Pınarbaşı', 'Sarıoğlan', 'Sarız', 'Talas',
    'Tomarza', 'Yahyalı', 'Yeşilhisar',
  ],
  Samsun: [
    'Alaçam', 'Asarcık', 'Atakum', 'Ayvacık', 'Bafra', 'Canik', 'Çarşamba',
    'Havza', 'İlkadım', 'Kavak', 'Ladik', 'Ondokuzmayıs', 'Salıpazarı',
    'Tekkeköy', 'Terme', 'Vezirköprü', 'Yakakent',
  ],
  Denizli: [
    'Acıpayam', 'Babadağ', 'Baklan', 'Bekilli', 'Beyağaç', 'Bozkurt', 'Buldan',
    'Çal', 'Çameli', 'Çardak', 'Çivril', 'Güney', 'Honaz', 'Kale', 'Merkezefendi',
    'Pamukkale', 'Sarayköy', 'Serinhisar', 'Tavas',
  ],
  Şanlıurfa: [
    'Akçakale', 'Birecik', 'Bozova', 'Ceylanpınar', 'Eyyübiye', 'Halfeti',
    'Haliliye', 'Harran', 'Hilvan', 'Karaköprü', 'Siverek', 'Suruç', 'Viranşehir',
  ],
  Diyarbakır: [
    'Bağlar', 'Bismil', 'Çermik', 'Çınar', 'Çüngüş', 'Dicle', 'Eğil', 'Ergani',
    'Hani', 'Hazro', 'Kayapınar', 'Kocaköy', 'Kulp', 'Lice', 'Silvan',
    'Sur', 'Yenişehir',
  ],
}

export function districtsOf(province: string): string[] {
  return TR_DISTRICTS[province.trim()] ?? []
}

export function hasDistricts(province: string): boolean {
  return districtsOf(province).length > 0
}
