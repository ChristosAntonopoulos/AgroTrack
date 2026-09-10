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
};

const project = (poly: LatLng[], size: number, pad: number) => {
  const lats = poly.map((p) => p.latitude);
  const lngs = poly.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.00001);
  const lngSpan = Math.max(maxLng - minLng, 0.00001);
  const inner = size - pad * 2;
  return poly.map((p) => ({
    x: pad + ((p.longitude - minLng) / lngSpan) * inner,
    y: pad + (1 - (p.latitude - minLat) / latSpan) * inner,
  }));
};

const FieldPolygonThumbnail: React.FC<Props> = ({ field, size = 88 }) => {
  const { colors } = useTheme();
  const accent = resolveFieldColor(field.color, field.id);
  const polygon = useMemo(() => resolveFieldPolygon(field), [field]);
  const points = useMemo(
    () => (polygon && polygon.length > 1 ? project(polygon, size, 10) : []),
    [polygon, size]
  );

  return (
    <View
      style={[
        styles.thumb,
        {
          width: size,
          height: size,
          backgroundColor: hexToRgba(accent, 0.28),
          borderColor: colors.borderLight,
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {points.length > 1 ? (
        points.slice(1).map((point, index) => {
          const prev = points[index];
          const dx = point.x - prev.x;
          const dy = point.y - prev.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          return (
            <View
              key={`${index}-${point.x}`}
              style={[
                styles.edge,
                {
                  left: prev.x,
                  top: prev.y,
                  width: length,
                  backgroundColor: accent,
                  transform: [{ rotate: `${angle}rad` }],
                },
              ]}
            />
          );
        })
      ) : (
        <Ionicons name="location-outline" size={22} color={accent} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  thumb: {
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  edge: {
    position: 'absolute',
    height: 2.5,
    borderRadius: 1,
  },
});

export default React.memo(FieldPolygonThumbnail);
