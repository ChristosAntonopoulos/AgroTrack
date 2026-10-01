import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { createElevation, harvestPipelinePalette, radii, spacing } from '../../theme';
import { formatKg } from '../../utils/harvestUtils';
import { FieldNameRow, type FieldNameRef } from '../../components/fields/FieldName';
import { HARVEST_ACTION_ICONS } from '../harvestActions';
import type { HarvestDaySummary as DayTotals } from '../totals';

type Props = {
  day: DayTotals;
  isToday: boolean;
  fieldRefs: FieldNameRef[];
  onAddSacks?: () => void;
  onAddMill?: () => void;
  onAddOil?: () => void;
};

type Step = {
  key: keyof typeof harvestPipelinePalette;
  title: string;
  value: string;
  detail: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  muted?: boolean;
};

/**
 * Day pipeline — same language as Συνολικά, scoped to one day.
 */
export function HarvestDaySummary({
  day,
  isToday,
  fieldRefs,
  onAddSacks,
  onAddMill,
  onAddOil,
}: Props) {
  const { t } = useTranslation('fields');
  const { colors, fontScaleMultiplier: scale, tapMin } = useTheme();
  const empty = day.sacks <= 0 && day.officialKg <= 0 && day.oilKg <= 0 && day.people <= 0;

  const steps: Step[] = [
    {
      key: 'sacks',
      title: t('harvestCampaign.pipeline.sacks'),
      value: String(day.sacks),
      detail:
        day.sacks > 0
          ? t('harvestCampaign.pipeline.sacksOk')
          : t('harvestCampaign.dayGuide.tapAdd'),
      icon: HARVEST_ACTION_ICONS.sacks,
      onPress: day.sacks <= 0 ? onAddSacks : undefined,
      muted: day.sacks <= 0,
    },
    {
      key: 'fruit',
      title: t('harvestCampaign.pipeline.fruit'),
      value: formatKg(day.officialKg),
      detail:
        day.officialKg > 0
          ? t('harvestCampaign.pipeline.fruitUnit')
          : day.estimatedKg > 0
            ? t('harvestCampaign.approx', { kg: formatKg(day.estimatedKg) })
            : t('harvestCampaign.dayGuide.tapAdd'),
      icon: HARVEST_ACTION_ICONS.mill,
      onPress: day.officialKg <= 0 ? onAddMill : undefined,
      muted: day.officialKg <= 0,
    },
    {
      key: 'oil',
      title: t('harvestCampaign.pipeline.oil'),
      value: formatKg(day.oilKg),
      detail:
        day.oilKg > 0 ? t('harvestCampaign.pipeline.oilKg') : t('harvestCampaign.dayGuide.tapAdd'),
      icon: HARVEST_ACTION_ICONS.oil,
      onPress: day.oilKg <= 0 ? onAddOil : undefined,
      muted: day.oilKg <= 0,
    },
  ];

  return (
    <View style={styles.root}>
      <Text style={[styles.kicker, { color: colors.textSecondary, fontSize: 12 * scale }]}>
        {isToday ? t('harvestCampaign.dayNav.today') : t('harvestCampaign.today.label')}
      </Text>
      <View style={styles.pipeline}>
        {steps.map((step, index) => {
          const tone = harvestPipelinePalette[step.key];
          return (
            <React.Fragment key={step.key}>
              {index > 0 ? (
                <View style={styles.arrowWrap} accessibilityElementsHidden>
                  <Ionicons name="caret-forward" size={14} color={colors.primaryDark} />
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
                    minHeight: Math.max(96, tapMin + 48),
                    backgroundColor: step.muted ? colors.surfaceMuted : tone.bg,
                    ...createElevation(colors, 'sm'),
                    opacity: pressed && step.onPress ? 0.9 : 1,
                  },
                ]}
              >
                <View style={[styles.stepIcon, { backgroundColor: colors.surfaceElevated }]}>
                  <Ionicons
                    name={step.icon}
                    size={20}
                    color={step.muted ? colors.textSecondary : tone.icon}
                  />
                </View>
                <Text
                  style={[
                    styles.stepTitle,
                    {
                      color: step.muted ? colors.textSecondary : tone.icon,
                      fontSize: 11 * scale,
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
                      color: step.muted ? colors.textTertiary : colors.textPrimary,
                      fontSize: 26 * scale,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {step.value}
                </Text>
                <Text
                  style={[
                    styles.stepDetail,
                    {
                      color: step.muted ? colors.textTertiary : colors.textSecondary,
                      fontSize: 11 * scale,
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

      {!empty && fieldRefs.length > 0 ? (
        <View style={styles.fields}>
          <FieldNameRow fields={fieldRefs} size="md" />
        </View>
      ) : null}

      {!empty && (day.expenseEur > 0 || day.people > 0) ? (
        <View style={styles.metaRow}>
          {day.people > 0 ? (
            <View
              style={[
                styles.metaPill,
                { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder },
              ]}
            >
              <Ionicons name={HARVEST_ACTION_ICONS.people} size={14} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.textPrimary }]}>
                {t('harvestCampaign.today.people', { count: day.people })}
              </Text>
            </View>
          ) : null}
          {day.expenseEur > 0 ? (
            <View
              style={[
                styles.metaPill,
                { backgroundColor: colors.eventExpenseSoft, borderColor: colors.borderLight },
              ]}
            >
              <Ionicons name="wallet-outline" size={14} color={colors.eventExpense} />
              <Text style={[styles.metaText, { color: colors.textPrimary }]}>
                {t('harvestCampaign.today.expense', { amount: day.expenseEur })}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  kicker: {
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: radii.lg,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  stepTitle: {
    fontWeight: '800',
    letterSpacing: 0.15,
  },
  stepValue: {
    fontWeight: '700',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  stepDetail: {
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  fields: {
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
