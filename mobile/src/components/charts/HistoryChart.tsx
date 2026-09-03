import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';

export type HistoryChartSeries = {
  key: string;
  label: string;
  color: string;
};

type HistoryChartPoint = {
  label: string;
  [key: string]: string | number | undefined;
};

interface HistoryChartProps {
  title: string;
  data: HistoryChartPoint[];
  series: HistoryChartSeries[];
  mode?: 'line' | 'bar';
  emptyLabel?: string;
}

const CHART_HEIGHT = 168;
const Y_TICKS = 4;

const numericValues = (data: HistoryChartPoint[], keys: string[]): number[] =>
  data.flatMap((point) =>
    keys
      .map((key) => point[key])
      .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value))
  );

const HistoryChart: React.FC<HistoryChartProps> = ({
  title,
  data,
  series,
  mode = 'line',
  emptyLabel,
}) => {
  const { colors } = useTheme();
  const keys = series.map((item) => item.key);
  const values = numericValues(data, keys);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const span = max - min || 1;
  const paddedMin = min - span * 0.08;
  const paddedMax = max + span * 0.08;
  const range = paddedMax - paddedMin || 1;

  const yLabels = useMemo(
    () =>
      Array.from({ length: Y_TICKS + 1 }, (_, index) => {
        const value = paddedMax - (range * index) / Y_TICKS;
        return Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1);
      }),
    [paddedMax, range]
  );

  const xLabels = useMemo(() => {
    if (data.length === 0) return [];
    if (data.length === 1) return [{ index: 0, label: data[0].label }];
    const mid = Math.floor((data.length - 1) / 2);
    return [
      { index: 0, label: data[0].label },
      { index: mid, label: data[mid].label },
      { index: data.length - 1, label: data[data.length - 1].label },
    ];
  }, [data]);

  const plotY = (value: number) => ((paddedMax - value) / range) * CHART_HEIGHT;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight },
      ]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {data.length === 0 || values.length === 0 ? (
        <View style={[styles.empty, { height: CHART_HEIGHT }]}>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>{emptyLabel}</Text>
        </View>
      ) : (
        <>
          <View style={styles.plotRow}>
            <View style={styles.yAxis}>
              {yLabels.map((label) => (
                <Text key={label} style={[styles.axisText, { color: colors.textTertiary }]}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={[styles.plot, { height: CHART_HEIGHT, borderColor: colors.borderLight }]}>
              {yLabels.map((_, index) => (
                <View
                  key={`grid-${index}`}
                  style={[
                    styles.gridLine,
                    {
                      top: (CHART_HEIGHT * index) / Y_TICKS,
                      backgroundColor: colors.borderLight,
                    },
                  ]}
                />
              ))}
              {series.map((item, seriesIndex) =>
                data.map((point, pointIndex) => {
                  const value = point[item.key];
                  if (typeof value !== 'number') return null;
                  const height = Math.max(3, ((value - paddedMin) / range) * CHART_HEIGHT);
                  const slotWidth = 100 / data.length;
                  const barWidth = Math.max(
                    mode === 'bar' ? 3 : 2,
                    slotWidth / (series.length + (mode === 'bar' ? 0.6 : 1.4))
                  );
                  const x = pointIndex * slotWidth + seriesIndex * barWidth + slotWidth * 0.18;
                  return (
                    <React.Fragment key={`${item.key}-${point.label}`}>
                      <View
                        style={[
                          styles.bar,
                          {
                            left: `${x}%`,
                            width: `${barWidth}%`,
                            height,
                            backgroundColor: item.color,
                            opacity: mode === 'bar' ? 1 : 0.28,
                          },
                        ]}
                      />
                      {mode === 'line' ? (
                        <View
                          style={[
                            styles.dot,
                            {
                              left: `${x + barWidth / 2}%`,
                              top: plotY(value),
                              backgroundColor: item.color,
                              borderColor: colors.surfaceElevated,
                            },
                          ]}
                        />
                      ) : null}
                    </React.Fragment>
                  );
                })
              )}
            </View>
          </View>
          <View style={styles.xAxis}>
            {xLabels.map((item) => (
              <Text
                key={`${item.index}-${item.label}`}
                style={[styles.axisText, styles.xLabel, { color: colors.textTertiary }]}
              >
                {item.label}
              </Text>
            ))}
          </View>
        </>
      )}
      <View style={styles.legend}>
        {series.map((item) => (
          <View key={item.key} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.styles.h4,
    fontSize: 16,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.styles.body,
    textAlign: 'center',
  },
  plotRow: {
    flexDirection: 'row',
    gap: 8,
  },
  yAxis: {
    width: 32,
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  plot: {
    flex: 1,
    overflow: 'hidden',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  bar: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
    marginTop: -4,
    borderWidth: 1.5,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 40,
  },
  axisText: {
    fontSize: 10,
    fontWeight: '600',
  },
  xLabel: {
    flexShrink: 1,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    ...typography.styles.caption,
    fontWeight: '600',
  },
});

export default HistoryChart;
