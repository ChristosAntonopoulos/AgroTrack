import React, { useId, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { Field } from '../../services/fieldService';
import { resolveFieldPolygon } from '../../utils/fieldGeo';
import './FieldPolygonThumbnail.css';

type Props = {
  field: Field;
  className?: string;
};

const VIEW = 160;
const PAD = 18;

const PALETTES = [
  { fillFrom: '#8FBF63', fillTo: '#3D6B3A', stroke: '#D4F0A8' },
  { fillFrom: '#A8C96B', fillTo: '#4F6F38', stroke: '#E8F5B8' },
  { fillFrom: '#C4B06A', fillTo: '#7A6238', stroke: '#F3E6B4' },
  { fillFrom: '#6FAF7A', fillTo: '#2E4A2E', stroke: '#C5E8C4' },
  { fillFrom: '#9BB56E', fillTo: '#44582E', stroke: '#DCE8B0' },
] as const;

const hashIndex = (id: string, n: number): number => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % n;
};

/** Project a lat/lng ring into a fitted SVG path, preserving geographic aspect. */
export const polygonToSvgPath = (
  polygon: [number, number][],
  size: number,
  pad: number
): string => {
  if (polygon.length < 3) return '';
  const lats = polygon.map((p) => p[0]);
  const lngs = polygon.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const midLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const lngScale = Math.max(Math.cos(midLatRad), 0.2);
  const geoW = Math.max((maxLng - minLng) * lngScale, 1e-8);
  const geoH = Math.max(maxLat - minLat, 1e-8);
  const inner = size - pad * 2;
  const scale = Math.min(inner / geoW, inner / geoH);
  const ox = pad + (inner - geoW * scale) / 2;
  const oy = pad + (inner - geoH * scale) / 2;
  const pts = polygon.map(([lat, lng]) => [
    ox + (lng - minLng) * lngScale * scale,
    oy + (maxLat - lat) * scale,
  ]);
  return `${pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ')} Z`;
};

const FieldPolygonThumbnail: React.FC<Props> = ({ field, className }) => {
  const uid = useId().replace(/:/g, '');
  const polygon = useMemo(() => resolveFieldPolygon(field), [field]);
  const d = useMemo(() => (polygon ? polygonToSvgPath(polygon, VIEW, PAD) : ''), [polygon]);
  const palette = PALETTES[hashIndex(field.id, PALETTES.length)];

  if (!d) {
    return (
      <div className={`field-poly-thumb field-poly-thumb--empty ${className || ''}`} aria-hidden>
        <MapPin size={28} strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className={`field-poly-thumb ${className || ''}`} aria-hidden>
      <svg className="field-poly-thumb-svg" viewBox={`0 0 ${VIEW} ${VIEW}`} role="presentation">
        <defs>
          <linearGradient id={`fp-fill-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.fillFrom} />
            <stop offset="100%" stopColor={palette.fillTo} />
          </linearGradient>
        </defs>
        <path d={d} fill="rgba(10, 16, 8, 0.38)" transform="translate(3 5)" />
        <path
          d={d}
          fill={`url(#fp-fill-${uid})`}
          stroke={palette.stroke}
          strokeWidth="2.75"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default React.memo(FieldPolygonThumbnail);
