import React, { useEffect, useMemo, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Field } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import { resolveFieldCenter, resolveFieldPolygon, type LatLng } from '../../utils/fieldGeo';
import { resolveFieldColor } from '../../utils/fieldColors';
import { hexToRgba } from '../../utils/hexToRgba';
import { bboxForPreview, buildSatellitePreviewUrl, type GeoBBox } from '../../utils/satellitePreview';

type Props = {
  field: Field;
  size?: number;
  /** Circular clip — default for list cards. */
  circular?: boolean;
};

type Pt = { x: number; y: number };

const projectRingToBbox = (poly: LatLng[], bbox: GeoBBox, size: number): Pt[] => {
  const geoW = Math.max(bbox.maxLng - bbox.minLng, 1e-8);
  const geoH = Math.max(bbox.maxLat - bbox.minLat, 1e-8);
  return poly.map((p) => ({
    x: ((p.longitude - bbox.minLng) / geoW) * size,
    y: ((bbox.maxLat - p.latitude) / geoH) * size,
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
 * Field card preview — Esri satellite crop with boundary outline when available.
 * Outline uses View edges (not react-native-svg) to avoid class-extends crashes
 * when Polygon/Shape native modules are not ready on the fields list.
 */
const FieldPolygonThumbnail: React.FC<Props> = ({ field, size = 96, circular = false }) => {
  const { colors } = useTheme();
  const accent = resolveFieldColor(field.color, field.id);
  const [imageFailed, setImageFailed] = useState(false);

  const polygon = useMemo(() => resolveFieldPolygon(field), [field]);
  const center = useMemo(() => resolveFieldCenter(field), [field]);

  const preview = useMemo(() => {
    const points =
      polygon && polygon.length >= 2 ? polygon : center ? [center] : [];
    const bbox = bboxForPreview(points);
    if (!bbox) return null;
    const pixel = Math.round(size * 2);
    const ring =
      polygon && polygon.length >= 2 ? closeRing(projectRingToBbox(polygon, bbox, size)) : [];
    return {
      uri: buildSatellitePreviewUrl(bbox, pixel, pixel),
      ring,
    };
  }, [polygon, center, size]);

  useEffect(() => {
    setImageFailed(false);
  }, [preview?.uri]);

  const stroke = Math.max(2, size * 0.028);

  const edges = useMemo(() => {
    const points = preview?.ring || [];
    if (points.length < 2) return [];
    const out: Array<{ key: string; left: number; top: number; width: number; angle: number }> = [];
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const point = points[i];
      const dx = point.x - prev.x;
      const dy = point.y - prev.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length < 0.8) continue;
      // Views rotate around their center. Sit that center on the segment
      // midpoint, or the stroke swings off both vertices and the ring breaks.
      // Extra stroke length puts the round cap's full width on each vertex.
      const drawn = length + stroke;
      const midX = (prev.x + point.x) / 2;
      const midY = (prev.y + point.y) / 2;
      out.push({
        key: `${i}-${prev.x.toFixed(1)}-${prev.y.toFixed(1)}`,
        left: midX - drawn / 2,
        top: midY,
        width: drawn,
        angle: Math.atan2(dy, dx),
      });
    }
    return out;
  }, [preview, stroke]);

  const radius = circular ? size / 2 : 16;

  if (!preview) {
    return (
      <View
        style={[
          styles.thumb,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: hexToRgba(accent, 0.14),
            borderColor: hexToRgba(accent, 0.35),
          },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Ionicons name="location-outline" size={Math.round(size * 0.28)} color={accent} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.thumb,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colors.surfaceMuted || hexToRgba(accent, 0.1),
          borderColor: hexToRgba(accent, 0.4),
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {!imageFailed ? (
        <Image
          source={{ uri: preview.uri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: hexToRgba(accent, 0.18) }]}
        />
      )}
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
                transform: [{ rotate: `${edge.angle}rad` }],
              },
            ]}
          />
        ))
      ) : (
        <View style={styles.centerPin}>
          <Ionicons name="location" size={Math.round(size * 0.32)} color={accent} />
        </View>
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
  edge: {
    position: 'absolute',
  },
  centerPin: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(FieldPolygonThumbnail);
