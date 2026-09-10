import React, { useId, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { Field } from '../../services/fieldService';
import { resolveFieldPolygon } from '../../utils/fieldGeo';
import { resolveFieldColor } from '../../utils/fieldColors';
import './FieldPolygonThumbnail.css';

type Props = {
  field: Field;
  className?: string;
};

const VIEW = 160;
const PAD = 18;

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
  const accent = resolveFieldColor(field.color, field.id);

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
            <stop offset="0%" stopColor={accent} stopOpacity="0.92" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.72" />
          </linearGradient>
        </defs>
        <path d={d} fill="rgba(10, 16, 8, 0.38)" transform="translate(3 5)" />
        <path
          d={d}
          fill={`url(#fp-fill-${uid})`}
          stroke={accent}
          strokeWidth="2.75"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default React.memo(FieldPolygonThumbnail);
