import type { Lead, ProspectingResult, SatisKonusmasi } from './types';

export interface SavedSearchParams {
  urun: string;
  sektor: string | string[];
  sehir: string;
  ilce: string;
  musteriSayisi: number;
}

export function sektorList(sektor: string | string[] | undefined | null): string[] {
  if (!sektor) return [];
  if (Array.isArray(sektor)) return sektor.filter(Boolean);
  return sektor ? [sektor] : [];
}

export function sektorLabel(sektor: string | string[] | undefined | null): string {
  const list = sektorList(sektor);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  if (list.length <= 3) return list.join(' + ');
  return `${list.slice(0, 2).join(' + ')} +${list.length - 2}`;
}

export interface SavedSearch {
  id: string;
  timestamp: string; // ISO
  params: SavedSearchParams;
  result: {
    leads: Lead[];
    ozet: string;
    satis_konusmasi?: SatisKonusmasi;
  };
  source: 'search' | 'import';
  callsCompleted: boolean;
  pitchGenerated: boolean;
}

const STORAGE_KEY = 'sales-prospecting-history-v1';
const MAX_ENTRIES = 50;

export function loadHistory(): SavedSearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(entries: SavedSearch[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    // Quota exceeded — drop oldest half and retry once
    try {
      const trimmed = entries.slice(0, Math.floor(entries.length / 2));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Give up silently
    }
  }
}

export function saveSearch(entry: SavedSearch): SavedSearch[] {
  const history = loadHistory();
  const existingIdx = history.findIndex(e => e.id === entry.id);
  if (existingIdx >= 0) {
    history[existingIdx] = entry;
  } else {
    history.unshift(entry);
  }
  const capped = history.slice(0, MAX_ENTRIES);
  persist(capped);
  return capped;
}

export function deleteSearch(id: string): SavedSearch[] {
  const history = loadHistory().filter(e => e.id !== id);
  persist(history);
  return history;
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function newSearchId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function describeSearch(s: SavedSearch): string {
  const { sektor, sehir, ilce } = s.params;
  const loc = ilce ? `${ilce}, ${sehir}` : sehir;
  const count = s.result.leads.length;
  return `${sektorLabel(sektor) || 'Liste'} — ${loc} (${count} adet)`;
}
