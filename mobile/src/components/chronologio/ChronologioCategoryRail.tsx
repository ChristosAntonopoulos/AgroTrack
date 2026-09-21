import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { ChronologioCategory } from '../../services/chronologioService';
import { motion, radii, spacing } from '../../theme';

export type RailCategory = 'all' | 'task' | 'note' | 'expense' | 'harvest' | 'weather';

const RAIL: RailCategory[] = ['all', 'task', 'note', 'expense', 'harvest', 'weather'];

const accentFor = (
  id: RailCategory,
  colors: {
    primary: string;
    primaryLight: string;
    eventWork: string;
    eventWorkSoft: string;
    eventObservation: string;
    eventObservationSoft: string;
    eventExpense: string;
    eventExpenseSoft: string;
    eventHarvest: string;
    eventHarvestSoft: string;
    eventWeather: string;
    eventWeatherSoft: string;
  }
): { accent: string; soft: string } => {
  switch (id) {
    case 'task':
      return { accent: colors.eventWork, soft: colors.eventWorkSoft };
    case 'note':
      return { accent: colors.eventObservation, soft: colors.eventObservationSoft };
    case 'expense':
      return { accent: colors.eventExpense, soft: colors.eventExpenseSoft };
    case 'harvest':
      return { accent: colors.eventHarvest, soft: colors.eventHarvestSoft };
    case 'weather':
      return { accent: colors.eventWeather, soft: colors.eventWeatherSoft };
    default:
      return { accent: colors.primary, soft: colors.primaryLight };
  }
};

type Props = {
  value: ChronologioCategory | 'all';
  onChange: (value: RailCategory) => void;
};

/**
 * Light category chip rail under zoom — mirrors web CategoryFilterRail.
 */
const ChronologioCategoryRail: React.FC<Props> = ({ value, onChange }) => {
  const { t } = useTranslation('chronologio');
  const { colors, fontScaleMultiplier } = useTheme();
  const selected = RAIL.includes(value as RailCategory) ? (value as RailCategory) : null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.rail}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
      accessibilityLabel={t('filtersTitle')}
    >
      {RAIL.map((id) => {
        const active = selected === id;
        const { accent, soft } = accentFor(id, colors);
        const label =
          id === 'all'
            ? t('primaryCategories.all', { defaultValue: t('categories.all') })
            : id === 'task'
              ? t('primaryCategories.work', { defaultValue: 'Work' })
              : id === 'note'
                ? t('primaryCategories.observation', { defaultValue: 'Notes' })
                : id === 'expense'
                  ? t('primaryCategories.money', { defaultValue: 'Money' })
                  : t(`primaryCategories.${id}`, {
                      defaultValue: t(`categories.${id}`),
                    });

        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: active ? soft : colors.surface,
                borderColor: active ? accent : colors.borderLight,
                opacity: pressed ? motion.pressOpacity : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.label,
                {
                  color: active ? accent : colors.textPrimary,
                  fontSize: 13 * fontScaleMultiplier,
                  fontWeight: active ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
            {active ? (
              <View style={[styles.check, { borderColor: accent }]} />
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  rail: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 2,
    marginLeft: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: spacing.sm,
    paddingRight: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    letterSpacing: -0.1,
  },
  check: {
    width: 6,
    height: 10,
    marginLeft: 1,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }, { translateY: -1 }],
  },
});

export default ChronologioCategoryRail;
