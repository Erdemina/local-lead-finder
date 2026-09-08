/**
 * Google Places API (New) client — Text Search + pagination.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
 */

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.internationalPhoneNumber',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.rating',
  'places.userRatingCount',
  'places.businessStatus',
  'places.primaryTypeDisplayName',
  'places.types',
  'places.location',
  'nextPageToken',
].join(',');

export interface PlaceResult {
  id: string;
  isletme_adi: string;
  adres: string;
  telefon: string;
  website: string;
  google_maps_uri: string;
  rating: number | null;
  yorum_sayisi: number | null;
  business_status: string;
  primary_type: string;
  types: string[];
}

interface PlacesApiResponse {
  places?: any[];
  nextPageToken?: string;
}

export interface PlacesSearchOptions {
  apiKey: string;
  query: string;
  maxResults?: number;
  languageCode?: string;
  regionCode?: string;
}

function mapPlace(p: any): PlaceResult {
  return {
    id: p?.id ?? '',
    isletme_adi: p?.displayName?.text ?? '',
    adres: p?.shortFormattedAddress ?? p?.formattedAddress ?? '',
    telefon: p?.nationalPhoneNumber ?? p?.internationalPhoneNumber ?? 'Bilinmiyor',
    website: p?.websiteUri ?? 'Bilinmiyor',
    google_maps_uri: p?.googleMapsUri ?? '',
    rating: typeof p?.rating === 'number' ? p.rating : null,
    yorum_sayisi: typeof p?.userRatingCount === 'number' ? p.userRatingCount : null,
    business_status: p?.businessStatus ?? '',
    primary_type: p?.primaryTypeDisplayName?.text ?? '',
    types: Array.isArray(p?.types) ? p.types : [],
  };
}

export async function searchPlaces(opts: PlacesSearchOptions): Promise<PlaceResult[]> {
  const { apiKey, query, maxResults = 20, languageCode = 'tr', regionCode = 'TR' } = opts;
  if (!apiKey) throw new Error('Google Places API anahtarı yok.');
  if (!query?.trim()) throw new Error('Boş arama sorgusu.');

  const results: PlaceResult[] = [];
  let pageToken: string | undefined;
  let safety = 0;
  const pageSize = Math.min(20, Math.max(1, maxResults));

  while (results.length < maxResults && safety < 4) {
    safety++;
    // Places API (New) pagination requires the ORIGINAL request params + pageToken.
    const body: any = {
      textQuery: query,
      languageCode,
      regionCode,
      pageSize,
    };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch(PLACES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Google Places API hatası (${res.status}): ${errText.slice(0, 300)}`);
    }

    const data: PlacesApiResponse = await res.json();
    const batch = (data.places ?? []).map(mapPlace).filter(p => p.isletme_adi);
    results.push(...batch);
    pageToken = data.nextPageToken;
    if (!pageToken) break;
    // Places API New: brief delay; pageToken may need a moment to be usable.
    await new Promise(r => setTimeout(r, 800));
  }

  return results.slice(0, maxResults);
}

/**
 * Build a localized Turkish text query from form params.
 * Example: "Kadıköy İstanbul kafe restoran"
 */
export function buildPlacesQuery(params: {
  sektors: string[];
  sehir: string;
  ilce: string;
}): string {
  const { sektors, sehir, ilce } = params;
  const location = [ilce, sehir].filter(Boolean).join(' ');
  const sectorsJoined = sektors.filter(Boolean).join(' ');
  return [location, sectorsJoined].filter(Boolean).join(' ').trim();
}

/**
 * Heuristic: estimate digital readiness from Places signals.
 * - Yüksek: website + 50+ reviews
 * - Düşük: no website AND <10 reviews
 * - Orta: everything else
 */
export function estimateDigitalReadiness(p: PlaceResult): 'Düşük' | 'Orta' | 'Yüksek' {
  const hasSite = p.website && p.website !== 'Bilinmiyor';
  const reviews = p.yorum_sayisi ?? 0;
  if (hasSite && reviews >= 50) return 'Yüksek';
  if (!hasSite && reviews < 10) return 'Düşük';
  return 'Orta';
}

export function estimateBusinessSize(p: PlaceResult): 'Solo' | 'Küçük' | 'Orta' {
  const reviews = p.yorum_sayisi ?? 0;
  if (reviews < 20) return 'Solo';
  if (reviews < 200) return 'Küçük';
  return 'Orta';
}

export function extractIlce(p: PlaceResult, fallback: string): string {
  if (fallback) return fallback;
  // Try to extract neighborhood from short address (Turkish format)
  const parts = p.adres.split(',').map(s => s.trim());
  if (parts.length >= 2) return parts[parts.length - 2] ?? fallback;
  return fallback;
}
