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

/** ~grove-scale square near Messinia (~3.2 stremmata). */
const typicalGrove = (): GeoJsonPolygon =>
  closed([
    [22.0, 37.0],
    [22.001, 37.0],
    [22.001, 37.001],
    [22.0, 37.001],
  ]);

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
    const grove = typicalGrove();
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

  it('rejects polygons that are too small to be a grove', () => {
    // Tiny click triangle — well under 50 m²
    const tiny = closed([
      [22.0, 37.0],
      [22.00001, 37.0],
      [22.00001, 37.00001],
    ]);
    const result = validateBoundaryPolygon(tiny);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('tooSmall');
  });

  it('rejects self-intersecting polygons', () => {
    // Classic bow-tie
    const bowTie = closed([
      [22.0, 37.0],
      [22.002, 37.002],
      [22.002, 37.0],
      [22.0, 37.002],
    ]);
    const result = validateBoundaryPolygon(bowTie);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('selfIntersect');
  });

  it('rejects non-finite or out-of-range coordinates', () => {
    const bad = closed([
      [22.0, 37.0],
      [22.001, Number.NaN],
      [22.001, 37.001],
      [22.0, 37.001],
    ]);
    const result = validateBoundaryPolygon(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('invalidCoordinates');
  });

  it('rejects null-island polygons near 0,0', () => {
    const nullIsland = closed([
      [0.001, 0.001],
      [0.002, 0.001],
      [0.002, 0.002],
      [0.001, 0.002],
    ]);
    const result = validateBoundaryPolygon(nullIsland);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('nullIsland');
  });

  it('rejects swapped lat/lng for Greece-scale rings', () => {
    // Correct grove would be [lng≈22, lat≈37]; here axes are swapped.
    const swapped = closed([
      [37.0, 22.0],
      [37.001, 22.0],
      [37.001, 22.001],
      [37.0, 22.001],
    ]);
    const result = validateBoundaryPolygon(swapped);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('swappedLatLng');
  });
});
