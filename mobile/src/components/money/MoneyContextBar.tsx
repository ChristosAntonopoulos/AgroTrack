import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing, createElevation } from '../../theme';

export type MoneyKindFilter = 'all' | 'income' | 'expense' | 'draft';

type Props = {
  year: number;
  yearRangeLabel?: string;
  kind: MoneyKindFilter;
  hideIncome?: boolean;
  tapMin: number;
  onYearChange: (year: number) => void;
  onKindChange: (kind: MoneyKindFilter) => void;
};

/** Year stepper + kind chips — mirrors web MoneyContextBar. */
const MoneyContextBar: React.FC<Props> = ({
  year,
  yearRangeLabel,
  kind,
  hideIncome,
  tapMin,
  onYearChange,
  onKindChange,
}) => {
  const { t } = useTranslation('money');
  const { colors, fontScaleMultiplier } = useTheme();

  const kinds: Array<{ id: MoneyKindFilter; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }> = [
    { id: 'all', icon: 'grid-outline', label: t('kindAll') },
    ...(!hideIncome
      ? [{ id: 'income' as const, icon: 'trending-up-outline' as const, label: t('kindIncome') }]
      : []),
    { id: 'expense', icon: 'trending-down-outline', label: t('kindExpenses') },
    { id: 'draft', icon: 'document-text-outline', label: t('kindDrafts') },
  ];

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.yearTabs,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            ...createElevation(colors, 'flat'),
          },
        ]}
        accessibilityRole="adjustable"
        accessibilityLabel={t('yearAria')}
      >
        <Pressable
          onPress={() => onYearChange(year - 1)}
          accessibilityLabel={t('prevYear')}
          style={[styles.yearBtn, { minWidth: tapMin, minHeight: tapMin }]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.yearLabel}>
          <Text
            style={[
              styles.year,
              { color: colors.textPrimary, fontSize: 18 * fontScaleMultiplier },
            ]}
            accessibilityLiveRegion="polite"
          >
            {t('agriculturalYearShort', { year })}
          </Text>
          {yearRangeLabel ? (
            <Text
              style={[styles.yearRange, { color: colors.textTertiary, fontSize: 11 * fontScaleMultiplier }]}
              numberOfLines={1}
            >
              {yearRangeLabel}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => onYearChange(year + 1)}
          accessibilityLabel={t('nextYear')}
          style={[styles.yearBtn, { minWidth: tapMin, minHeight: tapMin }]}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kindRail}
        accessibilityRole="tablist"
      >
        {kinds.map(item => {
          const selected = kind === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onKindChange(item.id)}
              style={[
                styles.kindChip,
                {
                  minHeight: Math.max(40, tapMin * 0.85),
                  borderColor: selected ? colors.oliveBorder : colors.borderLight,
                  backgroundColor: selected ? colors.primaryLight : colors.surface,
                },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={16}
                color={selected ? colors.primary : colors.textSecondary}
              />
              <Text
                style={{
                  fontWeight: '600',
                  fontSize: 13 * fontScaleMultiplier,
                  color: selected ? colors.primary : colors.textSecondary,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  yearTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  yearBtn: { alignItems: 'center', justifyContent: 'center' },
  yearLabel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    minWidth: 96,
  },
  year: {
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  yearRange: {
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 1,
  },
  kindRail: { gap: spacing.sm, paddingVertical: 2 },
  kindChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default MoneyContextBar;
