import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing, typography } from '../../theme';
import { millKgNeedingOil, pendingSackTotal } from '../chain';
import type { HarvestCampaign, HarvestCaptureKind } from '../types';
import { HarvestSheetShell } from '../components/HarvestSheetShell';

const PRODUCTION: HarvestCaptureKind[] = ['sacks', 'mill', 'oil'];
const OTHER: HarvestCaptureKind[] = ['expense', 'people', 'note'];

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

export const HarvestAddMenu: React.FC<{
  campaign: HarvestCampaign;
  onPick: (kind: HarvestCaptureKind) => void;
}> = ({ campaign, onPick }) => {
  const { t } = useTranslation('fields');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const openSacks = pendingSackTotal(campaign);
  const openMillKg = millKgNeedingOil(campaign);

  const softFor = (key: (typeof ACTION_META)[HarvestCaptureKind]['soft']) => {
    if (key === 'expense') return { soft: colors.eventExpenseSoft, accent: colors.eventExpense };
    if (key === 'work') return { soft: colors.eventWorkSoft, accent: colors.eventWork };
    if (key === 'observation') return { soft: colors.eventObservationSoft, accent: colors.eventObservation };
    return { soft: colors.eventHarvestSoft, accent: colors.eventHarvest };
  };

  const row = (kind: HarvestCaptureKind, badge?: string | null) => {
    const meta = ACTION_META[kind];
    const tone = softFor(meta.soft);
    return (
      <Pressable
        key={kind}
        onPress={() => onPick(kind)}
        style={({ pressed }) => [
          styles.row,
          {
            minHeight: Math.max(64, tapMin + 16),
            backgroundColor: tone.soft,
            borderColor: colors.borderLight,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View style={[styles.iconWell, { backgroundColor: colors.surface }]}>
          <Ionicons name={meta.icon} size={22} color={tone.accent} />
        </View>
        <View style={styles.copy}>
          <Text
            style={[styles.title, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}
            numberOfLines={1}
          >
            {t(`harvestCampaign.actions.${kind}`)}
          </Text>
          <Text
            style={[styles.hint, { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }]}
            numberOfLines={2}
          >
            {t(`harvestCampaign.actionHint.${kind}`)}
          </Text>
        </View>
        {badge ? (
          <Text style={[styles.badge, { backgroundColor: colors.surface, color: tone.accent }]}>
            {badge}
          </Text>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        )}
      </Pressable>
    );
  };

  return (
    <HarvestSheetShell>
      <Text style={[styles.section, { color: colors.textSecondary }]}>
        {t('harvestCampaign.chain.production')}
      </Text>
      <View style={styles.list}>
        {row('sacks')}
        {row(
          'mill',
          openSacks > 0
            ? t('harvestCampaign.chain.openSacksBadge', { count: openSacks })
            : null
        )}
        {row(
          'oil',
          openMillKg > 0
            ? t('harvestCampaign.chain.openMillBadge', { kg: Math.round(openMillKg) })
            : null
        )}
      </View>
      <Text style={[styles.section, { color: colors.textSecondary, marginTop: spacing.md }]}>
        {t('harvestCampaign.chain.other')}
      </Text>
      <View style={styles.list}>{OTHER.map((kind) => row(kind))}</View>
    </HarvestSheetShell>
  );
};

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  section: { fontSize: 13, fontWeight: '700', marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.xl,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2 },
  title: { fontWeight: '650' as '600', letterSpacing: -0.2 },
  hint: { ...typography.styles.caption, lineHeight: 17 },
  badge: {
    maxWidth: 110,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
