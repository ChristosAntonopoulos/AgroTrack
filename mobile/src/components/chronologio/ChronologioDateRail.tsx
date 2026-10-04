import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing } from '../../theme';
import type { ChronologioPeriodSummary } from '../../services/chronologioService';

type Props = {
  summaries: ChronologioPeriodSummary[];
  activePeriodYear: number;
  onJumpToYear: (periodYear: number) => void;
};

/** Horizontal year jump — same job as the web date rail, sized for a phone. */
const ChronologioDateRail: React.FC<Props> = ({ summaries, activePeriodYear, onJumpToYear }) => {
  const { t } = useTranslation('chronologio');
  const { colors, tapMin } = useTheme();
  const years = useMemo(
    () => [...summaries].sort((a, b) => b.periodYear - a.periodYear),
    [summaries]
  );

  if (years.length < 5) return null;

  const hint = t('dateControl.railNavigates', {
    defaultValue: t('living.dateRail', { defaultValue: 'Go to year' }),
  });

  return (
    <View accessibilityLabel={t('living.dateRail', { defaultValue: hint })}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {years.map((y) => {
          const active = y.periodYear === activePeriodYear;
          return (
            <Pressable
              key={y.key}
              onPress={() => onJumpToYear(y.periodYear)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${y.periodYear}. ${hint}`}
              style={[
                styles.chip,
                {
                  minHeight: Math.max(36, tapMin * 0.75),
                  backgroundColor: active ? colors.primary : colors.surfaceMuted,
                  borderColor: active ? colors.primary : colors.borderLight,
                },
              ]}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: active ? colors.onOlive : colors.border,
                  },
                ]}
              />
              <Text
                style={{
                  color: active ? colors.onOlive : colors.textSecondary,
                  fontWeight: active ? '800' : '700',
                  fontSize: 12,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {y.periodYear}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { gap: spacing.xs, paddingVertical: 2, paddingRight: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

export default ChronologioDateRail;
