import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing, typography } from '../../theme';
import type { HarvestCaptureKind } from '../types';

const HOME_ACTIONS: HarvestCaptureKind[] = ['sacks', 'mill', 'oil', 'expense', 'people', 'note'];

const ACTION_META: Record<
  HarvestCaptureKind,
  { icon: React.ComponentProps<typeof Ionicons>['name']; soft: 'harvest' | 'expense' | 'work' | 'observation' }
> = {
  sacks: { icon: 'bag-handle-outline', soft: 'harvest' },
  mill: { icon: 'scale-outline', soft: 'harvest' },
  oil: { icon: 'water-outline', soft: 'harvest' },
  expense: { icon: 'wallet-outline', soft: 'expense' },
  people: { icon: 'people-outline', soft: 'work' },
  note: { icon: 'camera-outline', soft: 'observation' },
};

export const HarvestActionGrid: React.FC<{
  kinds?: HarvestCaptureKind[];
  onPick: (kind: HarvestCaptureKind) => void;
}> = ({ kinds = HOME_ACTIONS, onPick }) => {
  const { t } = useTranslation('fields');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();

  const softFor = (key: (typeof ACTION_META)[HarvestCaptureKind]['soft']) => {
    if (key === 'expense') return { soft: colors.eventExpenseSoft, accent: colors.eventExpense };
    if (key === 'work') return { soft: colors.eventWorkSoft, accent: colors.eventWork };
    if (key === 'observation') return { soft: colors.eventObservationSoft, accent: colors.eventObservation };
    return { soft: colors.eventHarvestSoft, accent: colors.eventHarvest };
  };

  return (
    <View style={styles.grid}>
      {kinds.map((kind) => {
        const meta = ACTION_META[kind];
        const tone = softFor(meta.soft);
        return (
          <Pressable
            key={kind}
            onPress={() => onPick(kind)}
            style={({ pressed }) => [
              styles.tile,
              {
                minHeight: Math.max(104, tapMin + 44),
                backgroundColor: tone.soft,
                borderColor: colors.borderLight,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={[styles.iconWell, { backgroundColor: colors.surface }]}>
              <Ionicons name={meta.icon} size={22} color={tone.accent} />
            </View>
            <Text
              style={[
                styles.title,
                { color: colors.textPrimary, fontSize: 15 * fontScaleMultiplier },
              ]}
              numberOfLines={2}
            >
              {t(`harvestCampaign.actions.${kind}`)}
            </Text>
            <Text
              style={[styles.hint, { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier }]}
              numberOfLines={2}
            >
              {t(`harvestCampaign.actionHint.${kind}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '48%',
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: 14,
    gap: 8,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '650' as '600', letterSpacing: -0.2 },
  hint: { ...typography.styles.caption, lineHeight: 16 },
});
