import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Field } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import { resolveFieldPolygon, type LatLng } from '../../utils/fieldGeo';
import { resolveFieldColor } from '../../utils/fieldColors';
import { hexToRgba } from '../../utils/hexToRgba';

type Props = {
  field: Field;
  size?: number;
  /** Circular clip — default for list cards. */
  circular?: boolean;
};

type Pt = { x: number; y: number };

/**
 * Project lat/lng ring into a fitted square, preserving geographic aspect
 * (same maths as the web FieldPolygonThumbnail).
 */
const projectRing = (poly: LatLng[], size: number, pad: number): Pt[] => {
  if (poly.length < 2) return [];
  const lats = poly.map((p) => p.latitude);
  const lngs = poly.map((p) => p.longitude);
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
  return poly.map((p) => ({
    x: ox + (p.longitude - minLng) * lngScale * scale,
    y: oy + (maxLat - p.latitude) * scale,
  }));
};

const closeRing = (pts: Pt[]): Pt[] => {
  if (pts.length < 2) return pts;
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (Math.abs(first.x - last.x) < 0.5 && Math.abs(first.y - last.y) < 0.5) return pts;
  return [...pts, first];
};

/**
 * Elegant boundary preview — circular tile, fitted outline (no flying edges).
 */
const FieldPolygonThumbnail: React.FC<Props> = ({ field, size = 84, circular = true }) => {
  const { colors } = useTheme();
  const accent = resolveFieldColor(field.color, field.id);
  const polygon = useMemo(() => resolveFieldPolygon(field), [field]);
  const points = useMemo(() => {
    if (!polygon || polygon.length < 2) return [];
    return closeRing(projectRing(polygon, size, Math.round(size * 0.18)));
  }, [polygon, size]);

  const edges = useMemo(() => {
    if (points.length < 2) return [];
    const out: Array<{ key: string; left: number; top: number; width: number; angle: number }> = [];
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const point = points[i];
      const dx = point.x - prev.x;
      const dy = point.y - prev.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length < 0.8) continue;
      out.push({
        key: `${i}-${prev.x.toFixed(1)}-${prev.y.toFixed(1)}`,
        left: prev.x,
        top: prev.y,
        width: length,
        angle: Math.atan2(dy, dx),
      });
    }
    return out;
  }, [points]);

  const stroke = Math.max(2, size * 0.028);

  return (
    <View
      style={[
        styles.thumb,
        {
          width: size,
          height: size,
          borderRadius: circular ? size / 2 : 16,
          backgroundColor: hexToRgba(accent, 0.14),
          borderColor: hexToRgba(accent, 0.35),
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        pointerEvents="none"
        style={[
          styles.innerGlow,
          {
            backgroundColor: hexToRgba(accent, 0.2),
            top: size * 0.2,
            left: size * 0.2,
            right: size * 0.2,
            bottom: size * 0.2,
            borderRadius: circular ? size : 14,
          },
        ]}
      />
      {edges.length > 0 ? (
        edges.map((edge) => (
          <View
            key={edge.key}
            style={[
              styles.edge,
              {
                left: edge.left,
                top: edge.top - stroke / 2,
                width: edge.width,
                height: stroke,
                backgroundColor: accent,
                borderRadius: stroke,
                // Pivot at the segment start so edges stay on the ring.
                transformOrigin: 'left center',
                transform: [{ rotate: `${edge.angle}rad` }],
              },
            ]}
          />
        ))
      ) : (
        <Ionicons name="location-outline" size={Math.round(size * 0.28)} color={accent} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  thumb: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  innerGlow: {
    position: 'absolute',
    opacity: 0.95,
  },
  edge: {
    position: 'absolute',
  },
});

export default React.memo(FieldPolygonThumbnail);
