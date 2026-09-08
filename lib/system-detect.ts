/**
 * İşletmenin web sitesinden, satılmak istenen ürünün mevcut olup olmadığını
 * heuristik olarak tespit eder.
 */

interface SystemPattern {
  /** lowercase substrings; biri eşleşirse "mevcut" sayılır */
  signals: string[];
  positiveHint: string;
}

const SYSTEM_PATTERNS: Record<string, SystemPattern> = {
  'QR Menü': {
    signals: [
      'qr menü', 'qr menu', 'qrmenu', 'menulux', 'kolay menu', 'kolaymenu',
      'masamenu', 'menuapp', 'isimenu', 'scaneat', 'qrcd.me', 'easymenu',
      'menustart', 'menuino', 'menudirekt', 'qrcodemenu', 'menüqr',
    ],
    positiveHint: 'QR menü hizmeti tespit edildi',
  },
  'Randevu Sistemi': {
    signals: [
      'online randevu', 'randevu al', 'fresha.com', 'bookify', 'salonist',
      'setmore', 'salonbook', 'mybookings', 'appointment booking',
      'salonappy', 'randevuapp', 'salonlife', 'bookingkit', 'planmydate',
    ],
    positiveHint: 'Online randevu sistemi tespit edildi',
  },
  'Sadakat Programı': {
    signals: [
      'sadakat program', 'loyalty program', 'puan kazan', 'üye ol kazan',
      'sadıkkart', 'müşteri kartı', 'loyalty card', 'sadakat kartı',
    ],
    positiveHint: 'Sadakat programı tespit edildi',
  },
  'POS Entegrasyonu': {
    signals: [
      'pos sistem', 'pos integration', 'simpra', 'logo restoran', 'mikropos',
      'gastronaut pos', 'datapos',
    ],
    positiveHint: 'POS sistemi izi tespit edildi',
  },
  'Dijital Pazarlama': {
    signals: [
      'google ads', 'meta pixel', 'fbq(', 'gtag(', 'mailchimp', 'sendpulse',
      'klaviyo', 'hubspot',
    ],
    positiveHint: 'Dijital pazarlama altyapısı tespit edildi',
  },
  'Muhasebe Yazılımı': {
    signals: ['logo muhasebe', 'mikro yazılım', 'eta sql', 'parasut', 'bizimhesap'],
    positiveHint: 'Muhasebe yazılımı izi tespit edildi',
  },
};

const FETCH_TIMEOUT_MS = 4500;
const MAX_HTML_BYTES = 250_000;

export interface DetectResult {
  status: 'has' | 'not_found' | 'no_website' | 'unreachable' | 'unsupported';
  message: string;
}

function normalizeUrl(raw: string): string | null {
  if (!raw || raw === 'Bilinmiyor') return null;
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    return u.toString();
  } catch {
    return null;
  }
}

export async function detectExistingSystem(
  websiteUrl: string,
  urun: string
): Promise<DetectResult> {
  const pattern = SYSTEM_PATTERNS[urun];
  if (!pattern) {
    return { status: 'unsupported', message: 'Bu ürün için otomatik tespit yok' };
  }
  const url = normalizeUrl(websiteUrl);
  if (!url) {
    return { status: 'no_website', message: 'Web sitesi yok' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SalesProspector/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { status: 'unreachable', message: `Site cevap vermedi (${res.status})` };
    }

    const reader = res.body?.getReader();
    let total = 0;
    let html = '';
    if (reader) {
      const decoder = new TextDecoder('utf-8', { fatal: false });
      while (total < MAX_HTML_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        html += decoder.decode(value, { stream: true });
      }
      try { await reader.cancel(); } catch {}
    } else {
      html = (await res.text()).slice(0, MAX_HTML_BYTES);
    }

    const lower = html.toLowerCase();
    const hit = pattern.signals.find(sig => lower.includes(sig));
    if (hit) {
      return { status: 'has', message: `${pattern.positiveHint}` };
    }
    return { status: 'not_found', message: `${urun} izi bulunamadı` };
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      return { status: 'unreachable', message: 'Site cevap vermedi (timeout)' };
    }
    return { status: 'unreachable', message: 'Site tarama hatası' };
  }
}

export async function detectExistingSystemBatch(
  items: { website: string; id: number }[],
  urun: string,
  concurrency = 6
): Promise<Map<number, DetectResult>> {
  const results = new Map<number, DetectResult>();
  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      const item = items[i];
      try {
        results.set(item.id, await detectExistingSystem(item.website, urun));
      } catch {
        results.set(item.id, { status: 'unreachable', message: 'Hata' });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
