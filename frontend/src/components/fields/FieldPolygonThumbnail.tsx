import React, { useEffect, useId, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Field } from '../../services/fieldService';
import { resolveFieldPolygon } from '../../utils/fieldGeo';
import { resolveFieldColor } from '../../utils/fieldColors';
import { buildSatellitePreviewUrl } from '../../utils/mapLayers';
import './FieldPolygonThumbnail.css';

type Props = {
  field: Field;
  className?: string;
  circular?: boolean;
  /** When true (default), show Esri satellite under the grove boundary. */
  satellite?: boolean;
};

const VIEW = 160;
const PAD = 26;
const PREVIEW_PX = 256;

export type FittedPolygonView = {
  path: string;
  west: number;
  south: number;
  east: number;
  north: number;
};

/**
 * Project a lat/lng ring into a fitted SVG path and the WGS84 extent of the
 * full square view (including pad) so a static satellite export can align.
 */
export const fitPolygonToView = (
  polygon: [number, number][],
  size: number,
  pad: number
): FittedPolygonView | null => {
  if (polygon.length < 3) return null;
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
  const path = `${pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ')} Z`;
  const invLng = 1 / (lngScale * scale);
  const invLat = 1 / scale;
  return {
    path,
    west: minLng + (0 - ox) * invLng,
    east: minLng + (size - ox) * invLng,
    north: maxLat - (0 - oy) * invLat,
    south: maxLat - (size - oy) * invLat,
  };
};

/** @deprecated Prefer fitPolygonToView — kept for any external callers. */
export const polygonToSvgPath = (
  polygon: [number, number][],
  size: number,
  pad: number
): string => fitPolygonToView(polygon, size, pad)?.path ?? '';

const FieldPolygonThumbnail: React.FC<Props> = ({
  field,
  className,
  circular = true,
  satellite = true,
}) => {
  const uid = useId().replace(/:/g, '');
  const polygon = useMemo(() => resolveFieldPolygon(field), [field]);
  const fitted = useMemo(() => (polygon ? fitPolygonToView(polygon, VIEW, PAD) : null), [polygon]);
  const accent = resolveFieldColor(field.color, field.id);
  const [satReady, setSatReady] = useState(false);
  const [satFailed, setSatFailed] = useState(false);

  const satelliteUrl = useMemo(() => {
    if (!satellite || !fitted) return null;
    return buildSatellitePreviewUrl(fitted.west, fitted.south, fitted.east, fitted.north, PREVIEW_PX);
  }, [satellite, fitted]);

  useEffect(() => {
    setSatReady(false);
    setSatFailed(false);
  }, [satelliteUrl]);

  const showSatellite = Boolean(satelliteUrl) && !satFailed;

  const thumbClass = [
    'field-poly-thumb',
    circular ? 'field-poly-thumb--circle' : '',
    showSatellite ? 'field-poly-thumb--satellite' : '',
    satReady ? 'field-poly-thumb--sat-ready' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  if (!fitted) {
    return (
      <div
        className={`${['field-poly-thumb', circular ? 'field-poly-thumb--circle' : '', 'field-poly-thumb--empty', className || '']
          .filter(Boolean)
          .join(' ')}`}
        style={{ ['--field-accent' as string]: accent }}
        aria-hidden
      >
        <MapPin size={22} strokeWidth={1.75} />
      </div>
    );
  }

  const { path: d } = fitted;

  return (
    <div className={thumbClass} style={{ ['--field-accent' as string]: accent }} aria-hidden>
      {showSatellite ? (
        <img
          className={`field-poly-thumb-sat${satReady ? ' is-loaded' : ''}`}
          src={satelliteUrl!}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setSatReady(true)}
          onError={() => setSatFailed(true)}
        />
      ) : null}
      <svg className="field-poly-thumb-svg" viewBox={`0 0 ${VIEW} ${VIEW}`} role="presentation">
        <defs>
          <linearGradient id={`fp-fill-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.92" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.72" />
          </linearGradient>
        </defs>
        {satReady ? (
          <>
            <path
              d={d}
              fill="none"
              stroke="rgba(255, 255, 255, 0.88)"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            <path
              d={d}
              fill={`${accent}33`}
              stroke={accent}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <>
            <path d={d} fill="rgba(10, 16, 8, 0.38)" transform="translate(3 5)" />
            <path
              d={d}
              fill={`url(#fp-fill-${uid})`}
              stroke={accent}
              strokeWidth="2.75"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>
    </div>
  );
};

export default React.memo(FieldPolygonThumbnail);
