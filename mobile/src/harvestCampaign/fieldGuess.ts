import type { Field } from '../services/fieldService';
import { locationService } from '../services/locationService';
import { resolveFieldCenter } from '../utils/fieldGeo';

export const CONFIDENT_FIELD_KM = 0.18;

export type FieldLocationGuess = {
  field: Field;
  distanceKm: number;
  confident: boolean;
};

export const guessHarvestField = async (fields: Field[]): Promise<FieldLocationGuess | null> => {
  const candidates = fields
    .map((field) => {
      const center = resolveFieldCenter(field);
      return center ? { field, ...center } : null;
    })
    .filter((row): row is { field: Field; latitude: number; longitude: number } => row != null);
  if (!candidates.length) return null;

  try {
    const here = await locationService.getCurrentLocation();
    let best: FieldLocationGuess | null = null;
    for (const row of candidates) {
      const distanceKm = locationService.calculateDistance(
        here.latitude, here.longitude, row.latitude, row.longitude
      );
      if (!best || distanceKm < best.distanceKm) {
        best = { field: row.field, distanceKm, confident: distanceKm <= CONFIDENT_FIELD_KM };
      }
    }
    return best;
  } catch {
    return null;
  }
};
