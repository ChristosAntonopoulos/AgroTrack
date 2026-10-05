import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import type { StockSlice, StockSliceKey } from '../../myOil/stockPicture';

type Props = {
  slices: StockSlice[];
  colors: Record<StockSliceKey, string>;
  track: string;
  size?: number;
};

/** Three-way ring: free, held, waiting. Starts at the top and walks clockwise. */
export function OilStockDonut({ slices, colors, track, size = 112 }: Props) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const active = slices.filter((slice) => slice.litres > 0.05);
  const gap = active.length > 1 ? 3 : 0;
  const signature = slices.map((slice) => slice.litres).join(',');
  const [draw, setDraw] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = Date.now();
    const duration = 640;
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setDraw(1 - (1 - t) ** 3);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    setDraw(0);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [signature]);

  let offset = 0;

  return (
    <View accessibilityElementsHidden>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <G transform={`rotate(-90 ${center} ${center})`}>
          {active.map((slice) => {
            const full = (slice.pct / 100) * circumference;
            const length = Math.max((full - gap) * draw, 0);
            const arc = (
              <Circle
                key={slice.key}
                cx={center}
                cy={center}
                r={radius}
                stroke={colors[slice.key]}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += full;
            return arc;
          })}
        </G>
      </Svg>
    </View>
  );
}
