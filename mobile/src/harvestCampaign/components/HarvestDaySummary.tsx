import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { appFonts, radii, spacing } from '../../theme';
import { formatCompactMassKg, formatOilLitresFromKg } from '../../utils/harvestUtils';
import { FieldNameRow, type FieldNameRef } from '../../components/fields/FieldName';
import type { HarvestDaySummary as DayTotals } from '../totals';

type Props = {
  day: DayTotals;
  isToday: boolean;
  fieldRefs: FieldNameRef[];
  onAddSacks?: () => void;
  onAddMill?: () => void;
  onAddOil?: () => void;
};

type Column = {
  key: string;
  value: string;
  label: string;
  hint: string;
  muted: boolean;
  onPress?: () => void;
};

/**
 * One day’s harvest at a glance — three columns in a single card.
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

  const columns: Column[] = [
    {
      key: 'sacks',
      value: day.sacks > 0 ? String(day.sacks) : '—',
      label: t('harvestCampaign.pipeline.sacks'),
      hint:
        day.sacks > 0
          ? t('harvestCampaign.pipeline.sacksOk')
          : t('harvestCampaign.dayGuide.tapAdd'),
      muted: day.sacks <= 0,
      onPress: day.sacks <= 0 ? onAddSacks : undefined,
    },
    {
      key: 'fruit',
      value: day.officialKg > 0 ? formatCompactMassKg(day.officialKg) : '—',
      label: t('harvestCampaign.pipeline.fruitShort', {
        defaultValue: t('harvestCampaign.pipeline.fruit'),
      }),
      hint:
        day.officialKg > 0
          ? t('harvestCampaign.pipeline.fruitUnit')
          : day.estimatedKg > 0
            ? t('harvestCampaign.approx', { kg: formatCompactMassKg(day.estimatedKg) })
            : t('harvestCampaign.dayGuide.tapAdd'),
      muted: day.officialKg <= 0,
      onPress: day.officialKg <= 0 ? onAddMill : undefined,
    },
    {
      key: 'oil',
      value: day.oilKg > 0 ? formatOilLitresFromKg(day.oilKg) : '—',
      label: t('harvestCampaign.pipeline.oil'),
      hint:
        day.oilKg > 0
          ? t('harvestCampaign.pipeline.oilLitres')
          : t('harvestCampaign.pipeline.oilPending'),
      muted: day.oilKg <= 0,
      onPress: day.oilKg <= 0 ? onAddOil : undefined,
    },
  ];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.kicker, { color: colors.textSecondary, fontSize: 11 * scale }]}>
        {isToday ? t('harvestCampaign.dayNav.today') : t('harvestCampaign.today.label')}
      </Text>

      <View style={styles.columns}>
        {columns.map((col, index) => (
          <React.Fragment key={col.key}>
            {index > 0 ? (
              <View style={[styles.sep, { backgroundColor: colors.borderLight }]} />
            ) : null}
            <Pressable
              disabled={!col.onPress}
              onPress={col.onPress}
              accessibilityRole={col.onPress ? 'button' : undefined}
              accessibilityLabel={`${col.label}: ${col.value}. ${col.hint}`}
              style={({ pressed }) => [
                styles.col,
                {
                  minHeight: Math.max(64, tapMin + 12),
                  opacity: pressed && col.onPress ? 0.88 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.value,
                  {
                    color: col.muted ? colors.textTertiary : colors.textPrimary,
                    fontSize: 24 * scale,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {col.value}
              </Text>
              <Text
                style={[
                  styles.label,
                  {
                    color: col.muted ? colors.textTertiary : colors.textPrimary,
                    fontSize: 13 * scale,
                  },
                ]}
                numberOfLines={1}
              >
                {col.label}
              </Text>
              <Text
                style={[
                  styles.hint,
                  {
                    color: colors.textSecondary,
                    fontSize: 11 * scale,
                  },
                ]}
                numberOfLines={2}
              >
                {col.hint}
              </Text>
            </Pressable>
          </React.Fragment>
        ))}
      </View>

      {!empty && fieldRefs.length > 0 ? (
        <View style={[styles.fields, { borderTopColor: colors.borderLight }]}>
          <Text style={[styles.fieldsLabel, { color: colors.textSecondary, fontSize: 11 * scale }]}>
            {t('harvestCampaign.today.fieldsLabel')}
          </Text>
          <FieldNameRow fields={fieldRefs} size="sm" variant="legend" />
        </View>
      ) : null}

      {!empty && (day.expenseEur > 0 || day.people > 0) ? (
        <View style={styles.metaLine}>
          {day.people > 0 ? (
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {t('harvestCampaign.today.people', { count: day.people })}
            </Text>
          ) : null}
          {day.people > 0 && day.expenseEur > 0 ? (
            <Text style={{ color: colors.borderLight }}>·</Text>
          ) : null}
          {day.expenseEur > 0 ? (
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {t('harvestCampaign.today.expense', { amount: day.expenseEur })}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  kicker: {
    fontFamily: appFonts.semibold,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  sep: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  value: {
    fontFamily: appFonts.bold,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    width: '100%',
  },
  label: {
    fontFamily: appFonts.semibold,
    fontWeight: '650' as '600',
    textAlign: 'center',
  },
  hint: {
    fontFamily: appFonts.medium,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
  fields: {
    gap: 6,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fieldsLabel: {
    fontFamily: appFonts.semibold,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  metaLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    fontFamily: appFonts.medium,
    fontWeight: '500',
  },
});
