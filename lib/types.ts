export interface Lead {
  id: number;
  isletme_adi: string;
  sektor: string;
  adres: string;
  ilce: string;
  sehir: string;
  telefon: string;
  website: string;
  buyukluk: 'Solo' | 'Küçük' | 'Orta' | string;
  dijital_hazirlik: 'Düşük' | 'Orta' | 'Yüksek' | string;
  notlar: string;
  donusum_skoru: number;
  donusum_skoru_aciklamasi?: string;
  /** Google Maps verisi varsa puan (1-5) */
  google_rating?: number | null;
  /** Google Maps verisi varsa yorum sayısı */
  google_review_count?: number | null;
  /** Google place_id (mevcut sistem tespiti için kullanılabilir) */
  google_place_id?: string;
  /** Google Maps profili linki */
  google_maps_uri?: string;
  /** OPERATIONAL / CLOSED_TEMPORARILY / CLOSED_PERMANENTLY */
  business_status?: string;
  /** Web sitesi taramasından çıkarılan mevcut sistem (örn. "QR menü var") */
  mevcut_sistem_durumu?: string;
  /** Veri kaynağı: google_places, llm_only, excel */
  data_source?: 'google_places' | 'llm_only' | 'excel';
  heycalli_puan?: string;
  yorum_sayisi?: string;
  mevcut_sistem?: string;
  call_status?: 'idle' | 'calling' | 'answered' | 'no_answer' | 'failed';
  call_transcript?: CallTranscript;
}

export interface CallTranscriptLine {
  speaker: 'ajan' | 'isletme';
  text: string;
}

export interface CallTranscript {
  duration_seconds: number;
  lines: CallTranscriptLine[];
  sonuc: string;
  sonraki_adim: string;
}

export interface SatisKonusmasi {
  whatsapp: string;
  email: string;
}

export interface ProspectingResult {
  leads: Lead[];
  ozet: string;
  satis_konusmasi?: SatisKonusmasi;
}

export type ActionType = 'sadece_liste' | 'heycalli_arastir' | 'randevu_olustur' | 'satis_konusmasi';

export interface ProspectingParams {
  urun: string;
  sektor: string | string[];
  sehir: string;
  ilce: string;
  musteriSayisi: number;
  action: ActionType;
}

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  type: 'search' | 'call' | 'pitch' | 'export';
  label: string;
  details: string;
}
