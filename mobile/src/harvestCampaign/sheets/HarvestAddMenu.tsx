import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing, typography } from '../../theme';
import { millKgNeedingOil, pendingSackTotal } from '../chain';
import { HARVEST_ACTION_ICONS, HARVEST_HOME_ACTIONS } from '../harvestActions';
import type { HarvestCampaign, HarvestCaptureKind } from '../types';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import { HarvestStepRail, type HarvestPathStep } from '../components/HarvestStepRail';

const PRODUCTION: HarvestCaptureKind[] = ['sacks', 'mill', 'oil'];

export const HarvestAddMenu: React.FC<{
  campaign: HarvestCampaign;
  allowedKinds?: HarvestCaptureKind[];
  preferredKind?: HarvestCaptureKind;
  onPick: (kind: HarvestCaptureKind) => void;
}> = ({ campaign, allowedKinds, preferredKind, onPick }) => {
  const { t } = useTranslation('fields');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const openSacks = pendingSackTotal(campaign);
  const openMillKg = millKgNeedingOil(campaign);
  const allowed = new Set(allowedKinds ?? HARVEST_HOME_ACTIONS);
  const production = PRODUCTION.filter((k) => allowed.has(k));
  const other = HARVEST_HOME_ACTIONS.filter((k) => !PRODUCTION.includes(k) && allowed.has(k));

  const titleOf = (kind: HarvestCaptureKind) =>
    PRODUCTION.includes(kind)
      ? t(`harvestCampaign.addMenu.title.${kind}`)
      : t(`harvestCampaign.actions.${kind}`);

  const hintOf = (kind: HarvestCaptureKind) => {
    if (kind === 'mill' && openSacks > 0) {
      return t('harvestCampaign.addMenu.sacksWaiting', { count: openSacks });
    }
    if (kind === 'oil' && openMillKg > 0) {
      return t('harvestCampaign.addMenu.fruitWaiting', { kg: Math.round(openMillKg) });
    }
    if (PRODUCTION.includes(kind)) return t(`harvestCampaign.addMenu.hint.${kind}`);
    return t(`harvestCampaign.actionHint.${kind}`);
  };

  const suggested: HarvestCaptureKind | null = (() => {
    if (preferredKind && production.includes(preferredKind)) return preferredKind;
    if (production.includes('mill') && openSacks > 0) return 'mill';
    if (production.includes('oil') && openMillKg > 0) return 'oil';
    if (production.includes('sacks')) return 'sacks';
    return production[0] ?? null;
  })();

  const waiting =
    (suggested === 'mill' && openSacks > 0) || (suggested === 'oil' && openMillKg > 0);

  const pathSteps = production.filter(
    (kind): kind is HarvestPathStep => kind === 'sacks' || kind === 'mill' || kind === 'oil'
  );
  const pathCurrent: HarvestPathStep | null =
    suggested === 'sacks' || suggested === 'mill' || suggested === 'oil' ? suggested : null;

  const pathFacts: Partial<Record<HarvestPathStep, string>> = {};
  if (openSacks > 0) {
    pathFacts.sacks = t('harvestCampaign.flow.sackCount', { count: openSacks });
  }
  if (openMillKg > 0 && pathCurrent !== 'mill') {
    pathFacts.mill = t('harvestCampaign.flow.fruitLine', { kg: Math.round(openMillKg) });
  }

  const row = (kind: HarvestCaptureKind) => (
    <Pressable
      key={kind}
      onPress={() => onPick(kind)}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: Math.max(64, tapMin + 16),
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.iconWell, { backgroundColor: colors.eventHarvestSoft }]}>
        <Ionicons name={HARVEST_ACTION_ICONS[kind]} size={22} color={colors.eventHarvest} />
      </View>
      <View style={styles.copy}>
        <Text
          style={[styles.title, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}
          numberOfLines={1}
        >
          {titleOf(kind)}
        </Text>
        <Text
          style={[styles.hint, { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }]}
          numberOfLines={2}
        >
          {hintOf(kind)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );

  return (
    <HarvestSheetShell>
      {pathCurrent ? (
        <>
          <Text style={[styles.section, { color: colors.textSecondary }]}>
            {waiting ? t('harvestCampaign.addMenu.next') : t('harvestCampaign.addMenu.start')}
          </Text>
          <HarvestStepRail
            current={pathCurrent}
            facts={pathFacts}
            caption={hintOf(pathCurrent)}
            enabled={pathSteps}
            onPick={onPick}
          />
        </>
      ) : null}
      {other.length > 0 ? (
        <>
          <Text style={[styles.section, { color: colors.textSecondary, marginTop: spacing.md }]}>
            {t('harvestCampaign.chain.other')}
          </Text>
          <View style={styles.list}>{other.map((kind) => row(kind))}</View>
        </>
      ) : null}
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
});
