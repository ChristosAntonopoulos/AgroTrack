/** Spherical excess area estimate for a GeoJSON ring [lng, lat][] in square metres. */
export const estimatePolygonAreaSqm = (ring: number[][]): number => {
  if (ring.length < 3) return 0;
  const rad = Math.PI / 180;
  let total = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    total += (lon2 * rad - lon1 * rad) * (2 + Math.sin(lat1 * rad) + Math.sin(lat2 * rad));
  }
  return Math.abs((total * 6378137 * 6378137) / 2);
};

export const pointsToGeoJsonPolygon = (
  points: { latitude: number; longitude: number }[]
): { type: string; coordinates: number[][][] } | undefined => {
  if (points.length < 3) return undefined;
  const ring = [...points, points[0]].map((p) => [p.longitude, p.latitude]);
  return { type: 'Polygon', coordinates: [ring] };
};

export const geoJsonToPoints = (
  boundary?: { coordinates?: number[][][] }
): { latitude: number; longitude: number }[] => {
  const ring = boundary?.coordinates?.[0];
  if (!ring?.length) return [];
  const open = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const coords = open ? ring.slice(0, -1) : ring;
  return coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
};
