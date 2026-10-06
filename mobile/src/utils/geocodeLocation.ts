export const GREECE_CENTER = { latitude: 38.42, longitude: 23.72 };
export const GREECE_OVERVIEW = {
  latitude: 38.42,
  longitude: 23.72,
  latitudeDelta: 7.8,
  longitudeDelta: 7.8,
};

export type GeocodedPlace = {
  label: string;
  latitude: number;
  longitude: number;
};

type NominatimHit = {
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
};

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
};

/**
 * Nominatim rejects the Android HTTP stack's default `okhttp` user agent with 403.
 * A named agent is required by their usage policy and is what makes village search succeed.
 */
const USER_AGENT = 'TheOliveLotMobile/1.0 (grove place search)';

const uniqueParts = (parts: Array<string | undefined | null>): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const value = (part || '').trim();
    if (!value || seen.has(value.toLocaleLowerCase())) continue;
    seen.add(value.toLocaleLowerCase());
    out.push(value);
  }
  return out;
};

const formatPlaceLabel = (hit: NominatimHit): string => {
  const address = hit.address || {};
  const parts = uniqueParts([
    hit.name,
    address.village || address.town || address.hamlet || address.suburb || address.neighbourhood,
    address.municipality || address.city || address.county,
    address.state,
  ]);
  if (parts.length) return parts.slice(0, 3).join(', ');
  return (hit.display_name || '').split(',').slice(0, 3).join(',').trim();
};

const acceptLanguage = (language?: string): string => {
  const lang = (language || 'el').toLowerCase();
  if (lang.startsWith('en')) return 'en,el';
  if (lang.startsWith('it')) return 'it,el,en';
  return 'el,en';
};

const placeKey = (latitude: number, longitude: number): string =>
  `${latitude.toFixed(3)},${longitude.toFixed(3)}`;

const rankPlace = (query: string, place: GeocodedPlace): number => {
  const primary = place.label.split(',')[0]?.trim().toLocaleLowerCase() || '';
  const q = query.trim().toLocaleLowerCase();
  if (!q) return 3;
  if (primary === q) return 0;
  if (primary.startsWith(q)) return 1;
  if (place.label.toLocaleLowerCase().includes(q)) return 2;
  return 3;
};

const mergePlaces = (query: string, lists: GeocodedPlace[][], limit: number): GeocodedPlace[] => {
  const byKey = new Map<string, GeocodedPlace>();
  for (const list of lists) {
    for (const place of list) {
      const key = placeKey(place.latitude, place.longitude);
      const existing = byKey.get(key);
      if (!existing || rankPlace(query, place) < rankPlace(query, existing)) {
        byKey.set(key, place);
      }
    }
  }
  return [...byKey.values()]
    .sort((a, b) => rankPlace(query, a) - rankPlace(query, b))
    .slice(0, limit);
};

async function searchNominatim(
  query: string,
  limit: number,
  language: string | undefined,
  signal: AbortSignal | undefined
): Promise<GeocodedPlace[]> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    countrycodes: 'gr',
    dedupe: '1',
    limit: String(limit),
    q: query,
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    signal,
    headers: {
      Accept: 'application/json',
      'Accept-Language': acceptLanguage(language),
      'User-Agent': USER_AGENT,
    },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as NominatimHit[];
  if (!Array.isArray(data)) return [];
  return data
    .map((hit) => ({
      label: formatPlaceLabel(hit),
      latitude: Number.parseFloat(hit.lat || ''),
      longitude: Number.parseFloat(hit.lon || ''),
    }))
    .filter(
      (place) =>
        place.label && Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
    );
}

async function searchPhoton(
  query: string,
  limit: number,
  signal: AbortSignal | undefined
): Promise<GeocodedPlace[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    lang: 'en',
    lat: String(GREECE_CENTER.latitude),
    lon: String(GREECE_CENTER.longitude),
  });
  const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
    signal,
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: PhotonFeature[] };
  const features = Array.isArray(data.features) ? data.features : [];
  return features
    .map((feature) => {
      const [longitude, latitude] = feature.geometry?.coordinates || [];
      const props = feature.properties || {};
      if (props.countrycode && props.countrycode !== 'GR') return null;
      const label = uniqueParts([props.name, props.city || props.county, props.state]).join(', ');
      if (!label || latitude == null || longitude == null) return null;
      return { label, latitude, longitude };
    })
    .filter((place): place is GeocodedPlace => Boolean(place));
}

export async function searchPlaces(
  query: string,
  limit = 6,
  opts?: { signal?: AbortSignal; language?: string }
): Promise<GeocodedPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const signal = opts?.signal;
  const [photon, nominatim] = await Promise.all([
    searchPhoton(q, limit, signal).catch((error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      return [] as GeocodedPlace[];
    }),
    searchNominatim(q, limit, opts?.language, signal).catch((error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      return [] as GeocodedPlace[];
    }),
  ]);

  return mergePlaces(q, [nominatim, photon], limit);
}

export async function geocodeFirstPlace(query: string): Promise<GeocodedPlace | null> {
  const places = await searchPlaces(query, 1);
  return places[0] ?? null;
}

/**
 * Resolve a human place label for a pin / GPS coordinate (village, municipality, …).
 * Prefer this over free-typed search text when saving locationText.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  opts?: { signal?: AbortSignal; language?: string }
): Promise<GeocodedPlace | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    // Rural grove scale — village / locality rather than country.
    zoom: '14',
    lat: String(latitude),
    lon: String(longitude),
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    signal: opts?.signal,
    headers: {
      Accept: 'application/json',
      'Accept-Language': acceptLanguage(opts?.language),
      'User-Agent': USER_AGENT,
    },
  });
  if (!res.ok) return null;

  const hit = (await res.json()) as NominatimHit & { error?: string };
  if (!hit || hit.error) return null;

  const label = formatPlaceLabel(hit);
  const lat = Number.parseFloat(hit.lat || String(latitude));
  const lon = Number.parseFloat(hit.lon || String(longitude));
  if (!label || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return { label, latitude: lat, longitude: lon };
}

/** GPS / map placeholders that should be replaced with a reverse-geocoded place name. */
export function isPlaceholderLocationText(
  text: string | null | undefined,
  knownLabels: string[] = []
): boolean {
  const value = (text || '').trim().toLocaleLowerCase();
  if (!value) return true;
  const defaults = [
    'near me',
    'my location',
    'point on the map',
    'κοντά μου',
    'η τοποθεσία μου',
    'σημείο στον χάρτη',
  ];
  const labels = [...defaults, ...knownLabels.map((l) => l.trim().toLocaleLowerCase())].filter(
    Boolean
  );
  return labels.includes(value);
}
