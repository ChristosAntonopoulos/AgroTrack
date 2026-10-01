import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import Button from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { appFonts, createElevation, harvestPipelinePalette, radii, spacing } from '../../theme';
import { formatKg } from '../../utils/harvestUtils';
import { HARVEST_ACTION_ICONS } from '../harvestActions';
import { farmerOilLitres } from '../oilSaleLots';
import type { HarvestCampaignTotals } from '../totals';
import type { HarvestCampaign } from '../types';
import { HarvestCard } from './HarvestCard';
import { HarvestFlowView } from './HarvestFlowView';

type Props = {
  campaign: HarvestCampaign;
  fields: Field[];
  totals: HarvestCampaignTotals;
  onNeedsMill?: () => void;
  onNeedsOil?: () => void;
  onAddFields?: () => void;
  onMarkDone?: (fieldId: string) => void;
  onOpenMill?: (sackIds: string[]) => void;
  onOpenOil?: (millIds: string[]) => void;
  onAdd?: () => void;
  canPause?: boolean;
  canComplete?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
};

type PipelineStep = {
  key: keyof typeof harvestPipelinePalette;
  title: string;
  value: string;
  detail: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  alert?: boolean;
};

/**
 * Totals tab: clear sacks → fruit → oil strip, then the pressable field diagram.
 */
export function HarvestSeasonSummary({
  campaign,
  fields,
  totals,
  onNeedsMill,
  onNeedsOil,
  onAddFields,
  onMarkDone,
  onOpenMill,
  onOpenOil,
  onAdd,
  canPause,
  canComplete,
  onPause,
  onResume,
  onStop,
}: Props) {
  const { t } = useTranslation('fields');
  const { colors, fontScaleMultiplier: scale, tapMin } = useTheme();

  const sackTotal = useMemo(
    () => campaign.sacks.reduce((sum, row) => sum + (Number(row.sacks) || 0), 0),
    [campaign.sacks]
  );
  const oilLitres = useMemo(
    () => Math.round(campaign.oils.reduce((sum, row) => sum + farmerOilLitres(row), 0)),
    [campaign.oils]
  );
  const yieldPct =
    totals.extractionYield != null ? Math.round(totals.extractionYield * 10) / 10 : null;

  const steps: PipelineStep[] = [
    {
      key: 'sacks',
      title: t('harvestCampaign.pipeline.sacks'),
      value: String(sackTotal),
      detail:
        totals.unweighedSacks > 0
          ? t('harvestCampaign.pipeline.sacksPending', { count: totals.unweighedSacks })
          : t('harvestCampaign.pipeline.sacksOk'),
      icon: HARVEST_ACTION_ICONS.sacks,
      onPress: totals.unweighedSacks > 0 ? onNeedsMill : undefined,
      alert: totals.unweighedSacks > 0,
    },
    {
      key: 'fruit',
      title: t('harvestCampaign.pipeline.fruit'),
      value: formatKg(totals.officialKg),
      detail:
        totals.millKgWithoutOil > 0
          ? t('harvestCampaign.pipeline.fruitPending', {
              kg: formatKg(totals.millKgWithoutOil),
            })
          : t('harvestCampaign.pipeline.fruitUnit'),
      icon: HARVEST_ACTION_ICONS.mill,
      onPress: totals.millKgWithoutOil > 0 ? onNeedsOil : undefined,
      alert: totals.millKgWithoutOil > 0,
    },
    {
      key: 'oil',
      title: t('harvestCampaign.pipeline.oil'),
      value: oilLitres > 0 ? String(oilLitres) : formatKg(totals.oilKg),
      detail: oilLitres > 0 ? t('harvestCampaign.pipeline.oilLitres') : t('harvestCampaign.pipeline.oilKg'),
      icon: HARVEST_ACTION_ICONS.oil,
    },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.pipeline}>
        {steps.map((step, index) => {
          const tone = harvestPipelinePalette[step.key];
          return (
            <React.Fragment key={step.key}>
              {index > 0 ? (
                <View style={styles.arrowWrap} accessibilityElementsHidden>
                  <Ionicons name="caret-forward" size={16} color={colors.primaryDark} />
                </View>
              ) : null}
              <Pressable
                disabled={!step.onPress}
                onPress={step.onPress}
                accessibilityRole={step.onPress ? 'button' : undefined}
                accessibilityLabel={`${step.title}: ${step.value}. ${step.detail}`}
                style={({ pressed }) => [
                  styles.step,
                  {
                    minHeight: Math.max(108, tapMin + 56),
                    backgroundColor: step.alert ? colors.warningLight : tone.bg,
                    ...createElevation(colors, 'sm'),
                    opacity: pressed && step.onPress ? 0.92 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.stepIcon,
                    { backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  <Ionicons
                    name={step.icon}
                    size={22}
                    color={step.alert ? colors.warningDark : tone.icon}
                  />
                </View>
                <Text
                  style={[
                    styles.stepTitle,
                    {
                      color: step.alert ? colors.warningDark : tone.icon,
                      fontSize: 12 * scale,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {step.title}
                </Text>
                <Text
                  style={[
                    styles.stepValue,
                    {
                      color: colors.textPrimary,
                      fontSize: 30 * scale,
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {step.value}
                </Text>
                <Text
                  style={[
                    styles.stepDetail,
                    {
                      color: colors.textSecondary,
                      fontSize: 12 * scale,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {step.detail}
                </Text>
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>

      {yieldPct != null || totals.harvestDays > 0 ? (
        <View style={styles.insightRow}>
          {yieldPct != null ? (
            <View
              style={[
                styles.insightCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  ...createElevation(colors, 'sm'),
                },
              ]}
            >
              <View style={styles.insightHead}>
                <View style={[styles.insightIcon, { backgroundColor: colors.eventHarvestSoft }]}>
                  <Ionicons name="speedometer" size={18} color={colors.eventHarvest} />
                </View>
                <Text
                  style={[
                    styles.insightLabel,
                    { color: '#A94E2D', fontSize: 11 * scale },
                  ]}
                >
                  {t('harvestCampaign.dashboard.yieldLabel')}
                </Text>
              </View>
              <Text
                style={[
                  styles.insightValue,
                  { color: colors.textPrimary, fontSize: 28 * scale },
                ]}
              >
                {yieldPct}%
              </Text>
              <Text
                style={[
                  styles.insightHint,
                  { color: colors.textSecondary, fontSize: 12 * scale },
                ]}
              >
                {t('harvestCampaign.pipeline.yieldHint')}
              </Text>
            </View>
          ) : null}
          {totals.harvestDays > 0 ? (
            <View
              style={[
                styles.insightCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  ...createElevation(colors, 'sm'),
                },
              ]}
            >
              <View style={styles.insightHead}>
                <View style={[styles.insightIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="calendar" size={18} color={colors.primary} />
                </View>
                <Text
                  style={[
                    styles.insightLabel,
                    { color: colors.primaryDark, fontSize: 11 * scale },
                  ]}
                >
                  {t('harvestCampaign.pipeline.daysLabel')}
                </Text>
              </View>
              <Text
                style={[
                  styles.insightValue,
                  { color: colors.textPrimary, fontSize: 28 * scale },
                ]}
              >
                {totals.harvestDays}
              </Text>
              <Text
                style={[
                  styles.insightHint,
                  { color: colors.textSecondary, fontSize: 12 * scale },
                ]}
              >
                {t('harvestCampaign.pipeline.daysHint', { count: totals.harvestDays })}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {campaign.fieldOrder.length === 0 ? (
        <HarvestCard tone="hero">
          <Button title={t('harvestCampaign.fieldsEmpty.add')} onPress={onAddFields} fullWidth />
        </HarvestCard>
      ) : (
        <HarvestFlowView
          campaign={campaign}
          fields={fields}
          hideSummary
          onMarkDone={(fieldId) => onMarkDone?.(fieldId)}
          onOpenMill={onOpenMill}
          onOpenOil={onOpenOil}
          onAdd={onAdd}
        />
      )}

      {(canPause || canComplete) && (
        <View style={styles.actions}>
          {canPause ? (
            campaign.status === 'paused' ? (
              <Button title={t('harvestCampaign.resume')} onPress={onResume} fullWidth />
            ) : (
              <Button
                title={t('harvestCampaign.pause')}
                variant="outline"
                onPress={onPause}
                fullWidth
              />
            )
          ) : null}
          {canComplete ? (
            <Button
              title={t('harvestCampaign.stop')}
              variant="outline"
              onPress={onStop}
              fullWidth
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  pipeline: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  arrowWrap: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: radii.lg,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  stepTitle: {
    fontFamily: appFonts.bold,
    fontWeight: '800',
    letterSpacing: 0.15,
  },
  stepValue: {
    fontFamily: appFonts.bold,
    fontWeight: '700',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  stepDetail: {
    fontFamily: appFonts.semibold,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
  },
  insightRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  insightCard: {
    flex: 1,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 4,
  },
  insightHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightLabel: {
    fontFamily: appFonts.bold,
    fontWeight: '800',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
  },
  insightValue: {
    fontFamily: appFonts.bold,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  insightHint: {
    fontFamily: appFonts.semibold,
    fontWeight: '600',
    lineHeight: 16,
  },
  actions: {
    gap: spacing.sm,
  },
});
