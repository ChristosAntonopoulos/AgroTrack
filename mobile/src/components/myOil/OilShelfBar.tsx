import React from 'react';
import { View } from 'react-native';
import type { PackSegment, PackSegmentKey } from '../../myOil/stockPicture';

type Props = {
  segments: PackSegment[];
  colors: Record<PackSegmentKey, string>;
  track: string;
};

/** Full-width mix of bulk and tins on one shelf. */
export function OilShelfBar({ segments, colors, track }: Props) {
  return (
    <View
      style={{
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        flexDirection: 'row',
        backgroundColor: track,
      }}
    >
      {segments.map((segment) => (
        <View
          key={segment.key}
          style={{ flex: Math.max(segment.pct, 0.4), backgroundColor: colors[segment.key] }}
        />
      ))}
    </View>
  );
}
