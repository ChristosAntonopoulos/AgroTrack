import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { ChronologioCategory } from '../../services/chronologioService';
import { motion, radii, spacing } from '../../theme';

/** Primary rail mirrors web: Όλα / Εργασίες / Παρατηρήσεις / Χρήματα / Συγκομιδή. */
export type RailCategory = 'all' | 'work' | 'observation' | 'money' | 'harvest';

const RAIL: RailCategory[] = ['all', 'work', 'observation', 'money', 'harvest'];

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
  }
): { accent: string; soft: string } => {
  switch (id) {
    case 'work':
      return { accent: colors.eventWork, soft: colors.eventWorkSoft };
    case 'observation':
      return { accent: colors.eventObservation, soft: colors.eventObservationSoft };
    case 'money':
      return { accent: colors.eventExpense, soft: colors.eventExpenseSoft };
    case 'harvest':
      return { accent: colors.eventHarvest, soft: colors.eventHarvestSoft };
    default:
      return { accent: colors.primary, soft: colors.primaryLight };
  }
};

const railFromFilter = (value: ChronologioCategory | 'all' | string): RailCategory | null => {
  if (value === 'all' || value === 'work' || value === 'observation' || value === 'money' || value === 'harvest') {
    return value;
  }
  if (value === 'task') return 'work';
  if (value === 'note' || value === 'photo') return 'observation';
  if (value === 'expense' || value === 'income') return 'money';
  return null;
};

type Props = {
  value: ChronologioCategory | 'all' | string;
  onChange: (value: RailCategory) => void;
};

/**
 * Light category chip rail under zoom — mirrors web CategoryFilterRail primary chips.
 * Weather and other types stay in the more-filters sheet.
 */
const ChronologioCategoryRail: React.FC<Props> = ({ value, onChange }) => {
  const { t } = useTranslation('chronologio');
  const { colors, fontScaleMultiplier } = useTheme();
  const selected = railFromFilter(value);

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
        const label = t(`primaryCategories.${id}`, {
          defaultValue: t(`categories.${id === 'work' ? 'task' : id === 'observation' ? 'note' : id === 'money' ? 'expense' : id}`),
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
