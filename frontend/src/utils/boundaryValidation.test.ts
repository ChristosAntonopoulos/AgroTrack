import type { GeoJsonPolygon } from '../services/fieldService';
import {
  MAX_BOUNDARY_AREA_SQM,
  MIN_BOUNDARY_AREA_SQM,
  validateBoundaryPolygon,
} from './boundaryValidation';

const closed = (points: [number, number][]): GeoJsonPolygon => {
  const ring = [...points, points[0]];
  return { type: 'Polygon', coordinates: [ring] };
};

describe('validateBoundaryPolygon', () => {
  it('rejects country-scale polygons', () => {
    const greeceish = closed([
      [19.5, 34.8],
      [28.5, 34.8],
      [28.5, 41.8],
      [19.5, 41.8],
    ]);
    const result = validateBoundaryPolygon(greeceish);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(['tooLarge', 'excessiveSpan']).toContain(result.code);
    }
  });

  it('accepts a small grove and rejects zoom that is too low', () => {
    const grove = closed([
      [22.0, 37.0],
      [22.001, 37.0],
      [22.001, 37.001],
      [22.0, 37.001],
    ]);
    const ok = validateBoundaryPolygon(grove);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.areaSqm).toBeGreaterThan(MIN_BOUNDARY_AREA_SQM);
      expect(ok.areaSqm).toBeLessThan(MAX_BOUNDARY_AREA_SQM);
    }
    const zoom = validateBoundaryPolygon(grove, { mapZoom: 6 });
    expect(zoom.ok).toBe(false);
    if (!zoom.ok) expect(zoom.code).toBe('zoomTooLow');
  });
});
