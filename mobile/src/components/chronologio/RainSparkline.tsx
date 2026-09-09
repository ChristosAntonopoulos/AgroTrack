import React from 'react';
import { View, StyleSheet } from 'react-native';

type Props = {
  values: number[];
  height?: number;
  color?: string;
};

/** Tiny rain bar sparkline for Chronologio weather review cards (View bars, no SVG). */
const RainSparkline: React.FC<Props> = ({
  values,
  height = 40,
  color = '#2D6A9F',
}) => {
  if (!values.length) return null;
  const max = Math.max(...values, 0.1);

  return (
    <View
      style={[styles.wrap, { height }]}
      accessibilityRole="image"
      accessibilityLabel="Rain"
    >
      {values.map((v, i) => (
        <View key={i} style={styles.col}>
          <View
            style={[
              styles.bar,
              {
                height: Math.max(2, Math.round((v / max) * (height - 2))),
                backgroundColor: color,
                opacity: v > 0 ? 0.85 : 0.15,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
    marginTop: 6,
    width: '100%',
  },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '85%', borderRadius: 1, minHeight: 2 },
});

export default RainSparkline;
