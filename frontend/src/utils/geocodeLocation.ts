export const GREECE_CENTER: [number, number] = [38.42, 23.72];
export const GREECE_OVERVIEW_ZOOM = 6;
export const PLACE_ZOOM = 16;

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

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';

const uniqueParts = (parts: Array<string | undefined | null>): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const value = (part || '').trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
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

export async function searchPlaces(query: string, limit = 6): Promise<GeocodedPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    countrycodes: 'gr',
    limit: String(limit),
    q,
  });

  const res = await fetch(`${NOMINATIM_SEARCH}?${params.toString()}`, {
    headers: { Accept: 'application/json', 'Accept-Language': 'el,en' },
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
        place.label &&
        Number.isFinite(place.latitude) &&
        Number.isFinite(place.longitude)
    );
}

export async function geocodeFirstPlace(query: string): Promise<GeocodedPlace | null> {
  const places = await searchPlaces(query, 1);
  return places[0] ?? null;
}
