import * as XLSX from 'xlsx';
import type { Lead } from './types';

const HEADER_MAP: Record<string, string> = {
  '#': 'id',
  'İşletme Adı': 'isletme_adi',
  'Sektör': 'sektor',
  'Adres': 'adres',
  'İlçe': 'ilce',
  'Şehir': 'sehir',
  'Telefon': 'telefon',
  'Website': 'website',
  'Büyüklük': 'buyukluk',
  'Dijital Hazırlık': 'dijital_hazirlik',
  'Dönüşüm Skoru': 'donusum_skoru',
  'Notlar': 'notlar',
  'Ek Puan': 'heycalli_puan',
  'Yorum Sayısı': 'yorum_sayisi',
  'Mevcut Sistem': 'mevcut_sistem',
};

export function exportToExcel(
  leads: Lead[],
  sektor: string | string[],
  sehir: string,
  includeHeycalli: boolean
): void {
  const sektorSlug = Array.isArray(sektor)
    ? (sektor.filter(Boolean).join('-') || 'liste')
    : (sektor || 'liste');
  const headers: Record<string, string> = {
    id: '#',
    isletme_adi: 'İşletme Adı',
    sektor: 'Sektör',
    adres: 'Adres',
    ilce: 'İlçe',
    sehir: 'Şehir',
    telefon: 'Telefon',
    website: 'Website',
    buyukluk: 'Büyüklük',
    dijital_hazirlik: 'Dijital Hazırlık',
    donusum_skoru: 'Dönüşüm Skoru',
    notlar: 'Notlar',
  };

  if (includeHeycalli) {
    headers['heycalli_puan'] = 'Ek Puan';
    headers['yorum_sayisi'] = 'Yorum Sayısı';
    headers['mevcut_sistem'] = 'Mevcut Sistem';
  }

  const headerKeys = Object.keys(headers);
  const headerLabels = Object.values(headers);

  const rows = (leads ?? []).map((lead: any) => {
    const row: Record<string, any> = {};
    headerKeys.forEach((key: string) => {
      row[headers[key] ?? key] = (lead as any)?.[key] ?? '';
    });
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: headerLabels });

  // Auto column width
  const colWidths = headerLabels.map((h: string) => {
    let maxLen = h?.length ?? 10;
    rows.forEach((r: any) => {
      const val = String(r?.[h] ?? '');
      if (val?.length > maxLen) maxLen = val.length;
    });
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Müşteri Listesi');

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = `${sektorSlug}_${sehir ?? 'turkiye'}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}

export function importFromExcel(file: File): Promise<Lead[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) {
          reject(new Error('Excel dosyasında sayfa bulunamadı.'));
          return;
        }
        const ws = wb.Sheets[sheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(ws);

        if (jsonRows.length === 0) {
          reject(new Error('Excel dosyası boş.'));
          return;
        }

        const leads: Lead[] = jsonRows.map((row: any, idx: number) => {
          const lead: any = {};

          // Map Turkish headers back to keys
          for (const [turkishHeader, fieldKey] of Object.entries(HEADER_MAP)) {
            if (row[turkishHeader] !== undefined) {
              lead[fieldKey] = row[turkishHeader];
            }
          }

          // Also try direct field keys (in case file uses internal keys)
          for (const key of Object.values(HEADER_MAP)) {
            if (lead[key] === undefined && row[key] !== undefined) {
              lead[key] = row[key];
            }
          }

          // Ensure required fields exist with defaults
          return {
            id: lead.id ?? idx + 1,
            isletme_adi: lead.isletme_adi ?? '',
            sektor: lead.sektor ?? '',
            adres: lead.adres ?? '',
            ilce: lead.ilce ?? '',
            sehir: lead.sehir ?? '',
            telefon: lead.telefon ?? 'Bilinmiyor',
            website: lead.website ?? 'Bilinmiyor',
            buyukluk: lead.buyukluk ?? 'Küçük',
            dijital_hazirlik: lead.dijital_hazirlik ?? 'Orta',
            notlar: lead.notlar ?? '',
            donusum_skoru: Number(lead.donusum_skoru) || 5,
            heycalli_puan: lead.heycalli_puan,
            yorum_sayisi: lead.yorum_sayisi,
            mevcut_sistem: lead.mevcut_sistem,
            call_status: 'idle' as const,
          } as Lead;
        });

        resolve(leads);
      } catch (err: any) {
        reject(new Error(`Excel ayrıştırma hatası: ${err?.message ?? 'Bilinmeyen'}`));
      }
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsArrayBuffer(file);
  });
}
