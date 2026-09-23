import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { FieldFinancialResult } from '../../services/financialSummaryService';
import type { Field } from '../../services/fieldService';
import { UNASSIGNED_FIELD_QUERY } from '../../finance/buildYearSummary';
import { formatOfficialAmount, formatOfficialNet, perAreaForDisplay } from '../../finance/format';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import { createElevation, radii, spacing, typography } from '../../theme';

type Props = {
  rows: FieldFinancialResult[];
  currency: string;
  locale: string;
  fieldNames: Record<string, string>;
  fields?: Field[];
  missingAreaFieldIds?: string[];
  onSelectField: (fieldId: string) => void;
};

const MoneyFieldRows: React.FC<Props> = ({
  rows,
  currency,
  locale,
  fieldNames,
  fields = [],
  missingAreaFieldIds = [],
  onSelectField,
}) => {
  const { t } = useTranslation('money');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const unknown = t('unknownAmount');
  if (!rows.length) return null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'flat'),
        },
      ]}
    >
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t('byField')}</Text>
      {rows.map((row) => {
        const id = row.isUnassigned ? UNASSIGNED_FIELD_QUERY : row.fieldId || '';
        const name = row.isUnassigned
          ? row.fieldName
          : fieldNames[row.fieldId || ''] || friendlyFieldLabel(row.fieldName);
        const source = fields.find((field) => field.id === row.fieldId);
        const color = row.isUnassigned ? colors.borderLight : resolveFieldColor(source?.color, row.fieldId || id);
        const missingArea = Boolean(row.fieldId && missingAreaFieldIds.includes(row.fieldId));
        const netColor =
          row.netResult == null
            ? colors.textPrimary
            : row.netResult < 0
              ? colors.eventExpense
              : row.netResult > 0
                ? colors.eventIncome
                : colors.textPrimary;
        return (
          <Pressable
            key={id || 'unassigned'}
            onPress={() => onSelectField(id)}
            style={[styles.row, { minHeight: tapMin, borderBottomColor: colors.borderLight }]}
            accessibilityRole="button"
            accessibilityLabel={`${name}. ${t('openField')}`}
          >
            <View style={[styles.swatch, { backgroundColor: color }]} />
            <View style={styles.body}>
              <Text style={[styles.name, { color: colors.textPrimary, fontSize: 15 * fontScaleMultiplier }]}>
                {name}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier }}>
                {t('income')} {formatOfficialAmount(row.income, currency, locale, unknown)}
                {' · '}
                {t('expenses')} {formatOfficialAmount(row.expenses, currency, locale, unknown)}
              </Text>
              {missingArea ? (
                <Text style={{ color: colors.textTertiary, fontSize: 12 * fontScaleMultiplier }}>
                  {t('missingAreaRow')}
                </Text>
              ) : row.costPerHectare != null ? (
                <Text style={{ color: colors.textTertiary, fontSize: 12 * fontScaleMultiplier }}>
                  {t('costPerHectare')}{' '}
                  {formatOfficialAmount(perAreaForDisplay(row.costPerHectare, locale), currency, locale, unknown)}
                </Text>
              ) : null}
            </View>
            <Text
              style={{
                fontWeight: '700',
                color: netColor,
                fontVariant: ['tabular-nums'],
                fontSize: 14 * fontScaleMultiplier,
              }}
            >
              {formatOfficialNet(row.netResult, currency, locale, unknown)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  sectionLabel: { ...typography.styles.overline, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  swatch: { width: 10, height: 10, borderRadius: radii.full },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontWeight: '700' },
});

export default MoneyFieldRows;
