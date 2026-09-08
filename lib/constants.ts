// Yeni multi-tenant SaaS string'leri lib/i18n/tr.ts'te; buradan da erişilebilir.
export { TR } from './i18n/tr';

export const URUN_OPTIONS = [
  'Randevu Sistemi',
  'QR Menü',
  'POS Entegrasyonu',
  'Sadakat Programı',
  'Dijital Pazarlama',
  'Muhasebe Yazılımı',
] as const;

export const SEKTOR_OPTIONS = [
  'Kuaförler',
  'Kafeler',
  'Restoranlar',
  'Güzellik Salonları',
  'Oteller',
  'Spor Salonları',
  'Diş Klinikleri',
  'Veteriner Klinikleri',
] as const;

export const ACTION_OPTIONS = [
  { value: 'sadece_liste' as const, label: 'Sadece Liste' },
  { value: 'heycalli_arastir' as const, label: 'AI Telefon Araştırması' },
  { value: 'randevu_olustur' as const, label: 'Randevu Oluştur' },
  { value: 'satis_konusmasi' as const, label: 'Satış Konuşması Yaz' },
] as const;

export const UI_STRINGS = {
  appName: 'Satış Prospecting Ajanı',
  subtitle: 'Hedef sektörü ve bölgeyi seç — ajan müşteri listeni oluştursun.',
  searchButton: 'Ara ve Listele',
  exportButton: "Excel'e Aktar",
  clearButton: 'Temizle',
  copyButton: 'Kopyala',
  loading: 'Ajanınız çalışıyor, lütfen bekleyin…',
  emptyState: 'Henüz arama yapılmadı. Yukarıdan parametreleri seç ve başlat.',
  errorPrefix: 'Hata oluştu: ',
  noResults: 'Sonuç bulunamadı.',
  filterPlaceholder: 'İşletme adı veya ilçe ara…',
  exportSuccess: 'Excel dosyası indirildi!',
  summaryLabel: 'Özet',
  pitchLabel: 'Satış Konuşması Taslağı',
  urunLabel: 'Ürün / Hizmet',
  sektorLabel: 'Hedef Sektör',
  sehirLabel: 'Şehir',
  ilceLabel: 'İlçe / Alan',
  musteriSayisiLabel: 'Müşteri Sayısı',
  actionLabel: 'İkinci Adım',
  customUrunPlaceholder: 'Diğer ürün/hizmet yazın…',
  sehirDefault: 'İstanbul',
  ilcePlaceholder: 'Örn: Kadıköy, Beşiktaş…',
  whatsappLabel: 'WhatsApp Mesajı',
  emailLabel: 'E-posta Taslağı',
  leadCount: 'müşteri adayı bulundu',
  actionPanelTitle: 'Aksiyon Paneli',
  callViaVapi: 'AI Telefon Araması',
  generatePitch: 'Satış Konuşması Yaz',
  newSearch: 'Yeni Arama Yap',
  historyTitle: 'Arama Geçmişi',
  clearHistory: 'Geçmişi Temizle',
  noHistory: 'Henüz geçmiş kayıt yok.',
  callStatusIdle: 'Bekliyor',
  callStatusCalling: 'Aranıyor…',
  callStatusAnswered: 'Cevaplandı',
  callStatusNoAnswer: 'Cevap Yok',
  callStatusFailed: 'Başarısız',
} as const;

export const TABLE_COLUMNS = [
  { key: 'id', label: '#', sortable: true },
  { key: 'isletme_adi', label: 'İşletme Adı', sortable: true },
  { key: 'sektor', label: 'Sektör', sortable: true },
  { key: 'adres', label: 'Adres', sortable: false },
  { key: 'ilce', label: 'İlçe', sortable: true },
  { key: 'sehir', label: 'Şehir', sortable: true },
  { key: 'telefon', label: 'Telefon', sortable: false },
  { key: 'website', label: 'Website', sortable: false },
  { key: 'google_rating', label: 'Google Puan', sortable: true },
  { key: 'mevcut_sistem_durumu', label: 'Mevcut Sistem', sortable: false },
  { key: 'buyukluk', label: 'Büyüklük', sortable: true },
  { key: 'dijital_hazirlik', label: 'Dijital Hazırlık', sortable: true },
  { key: 'donusum_skoru', label: 'Dönüşüm Skoru', sortable: true },
  { key: 'notlar', label: 'Notlar', sortable: false },
] as const;

export const EXTRA_COLUMNS = [
  { key: 'heycalli_puan', label: 'Ek Puan', sortable: true },
  { key: 'yorum_sayisi', label: 'Yorum Sayısı', sortable: true },
  { key: 'mevcut_sistem', label: 'Mevcut Sistem', sortable: false },
] as const;
