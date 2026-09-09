import React, { useId, useMemo } from 'react';

type Props = {
  values: number[];
  height?: number;
  className?: string;
  /** Accessible label for the chart */
  ariaLabel?: string;
};

/**
 * Tiny rain bar sparkline — plain SVG, no legend/grid/Recharts.
 * Taller bars read slightly stronger so wet days stand out at a glance.
 */
const RainSparkline: React.FC<Props> = ({
  values,
  height = 40,
  className,
  ariaLabel = 'Rain',
}) => {
  const gradId = useId().replace(/:/g, '');
  const bars = useMemo(() => {
    if (!values.length) return [];
    const max = Math.max(...values, 0.1);
    return values.map((v, i) => {
      const h = Math.max(v > 0 ? 2 : 1, (v / max) * (height - 4));
      return { i, h, v, opacity: v <= 0 ? 0.12 : 0.45 + 0.55 * (v / max) };
    });
  }, [values, height]);

  if (bars.length === 0) return null;

  const gap = bars.length > 24 ? 0.35 : bars.length > 14 ? 0.55 : 0.9;
  const barWidth = Math.max(1.4, (100 - gap * (bars.length - 1)) / bars.length);

  return (
    <svg
      className={className}
      width="100%"
      height={height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
      </defs>
      <line
        x1="0"
        y1={height - 0.5}
        x2="100"
        y2={height - 0.5}
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1"
      />
      {bars.map((bar) => {
        const x = bar.i * (barWidth + gap);
        const y = height - bar.h - 1;
        return (
          <rect
            key={bar.i}
            x={x}
            y={y}
            width={barWidth}
            height={bar.h}
            rx={Math.min(1.2, barWidth / 2)}
            fill={bar.v > 0 ? `url(#${gradId})` : 'currentColor'}
            opacity={bar.opacity}
          />
        );
      })}
    </svg>
  );
};

export default RainSparkline;
