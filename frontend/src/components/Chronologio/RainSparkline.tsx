import React, { useId, useMemo } from 'react';

type Props = {
  values: number[];
  labels?: string[];
  height?: number;
  className?: string;
  /** Accessible label for the chart */
  ariaLabel?: string;
};

const axisTicks = (labels: string[], count: number) => {
  if (count < 2 || labels.length !== count) return null;
  const first = labels[0];
  const last = labels[count - 1];
  const mid = labels[Math.floor((count - 1) / 2)];
  if (!first || !last) return null;
  return {
    first,
    mid: mid && mid !== first && mid !== last ? mid : '',
    last,
  };
};

/**
 * Rain bars for a month or year. Dry days stay visible as quiet ticks
 * so one wet day does not look like a broken chart.
 */
const RainSparkline: React.FC<Props> = ({
  values,
  labels,
  height = 40,
  className,
  ariaLabel = 'Rain',
}) => {
  const gradId = useId().replace(/:/g, '');
  const bars = useMemo(() => {
    if (!values.length) return [];
    const max = Math.max(...values, 0.1);
    return values.map((v, i) => {
      const h = v > 0 ? Math.max(3, (v / max) * (height - 6)) : 2;
      return { i, h, v };
    });
  }, [values, height]);

  if (bars.length === 0) return null;

  const gap = bars.length > 24 ? 0.35 : bars.length > 14 ? 0.55 : 0.9;
  const barWidth = Math.max(1.4, (100 - gap * (bars.length - 1)) / bars.length);
  const axisLabels =
    labels && labels.length === values.length
      ? labels
      : values.map((_, index) => String(index + 1));
  const ticks = axisTicks(axisLabels, values.length);

  return (
    <div className={className}>
      <svg
        className="rain-spark-svg"
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.45" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          y1={height - 0.6}
          x2="100"
          y2={height - 0.6}
          stroke="currentColor"
          strokeOpacity="0.28"
          strokeWidth="0.6"
        />
        {bars.map((bar) => {
          const x = bar.i * (barWidth + gap);
          const y = height - bar.h - 1;
          const day = axisLabels[bar.i];
          const amount =
            bar.v > 0 ? `${bar.v.toLocaleString(undefined, { maximumFractionDigits: 1 })} mm` : '0 mm';
          return (
            <rect
              key={bar.i}
              x={x}
              y={y}
              width={barWidth}
              height={bar.h}
              rx={Math.min(0.8, barWidth / 3)}
              fill={bar.v > 0 ? `url(#${gradId})` : 'currentColor'}
              opacity={bar.v > 0 ? 1 : 0.28}
            >
              <title>{day ? `${day} · ${amount}` : amount}</title>
            </rect>
          );
        })}
      </svg>
      {ticks ? (
        <div className="rain-spark-axis" aria-hidden>
          <span>{ticks.first}</span>
          <span>{ticks.mid}</span>
          <span>{ticks.last}</span>
        </div>
      ) : null}
    </div>
  );
};

export default RainSparkline;
