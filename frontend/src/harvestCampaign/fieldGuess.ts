import type { Field } from '../services/fieldService';
import { locationService } from '../services/locationService';
import { resolveFieldCenter } from '../utils/fieldGeo';

/** Distance in km under which we treat the farmer as being in that grove. */
export const CONFIDENT_FIELD_KM = 0.18;

export type FieldLocationGuess = {
  field: Field;
  distanceKm: number;
  confident: boolean;
};

export const guessHarvestField = async (fields: Field[]): Promise<FieldLocationGuess | null> => {
  const withCenter = fields
    .map((field) => {
      const center = resolveFieldCenter(field);
      return center ? { field, lat: center[0], lng: center[1] } : null;
    })
    .filter((row): row is { field: Field; lat: number; lng: number } => Boolean(row));
  if (withCenter.length === 0) return null;

  try {
    const here = await locationService.getCurrentLocation({ timeoutMs: 4000, enableHighAccuracy: true });
    let best: FieldLocationGuess | null = null;
    for (const row of withCenter) {
      const distanceKm = locationService.calculateDistance(here.latitude, here.longitude, row.lat, row.lng);
      if (!best || distanceKm < best.distanceKm) {
        best = {
          field: row.field,
          distanceKm,
          confident: distanceKm <= CONFIDENT_FIELD_KM,
        };
      }
    }
    return best;
  } catch {
    return null;
  }
};
