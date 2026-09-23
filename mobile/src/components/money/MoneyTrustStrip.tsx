import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { YearFinancialSummary } from '../../services/financialSummaryService';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { spacing, typography } from '../../theme';

type Props = {
  summary: YearFinancialSummary;
  fieldCount: number;
  onOpenDrafts: () => void;
};

const MoneyTrustStrip: React.FC<Props> = ({ summary, fieldCount, onOpenDrafts }) => {
  const { t, i18n } = useTranslation('money');
  const { colors } = useTheme();
  const computed = !summary.dataAvailability.hasPostedRecords
    ? null
    : fieldCount > 1
      ? t('computedFrom', { count: summary.transactionCount, fields: fieldCount })
      : fieldCount === 1
        ? t('computedFromOneField', { count: summary.transactionCount })
        : t('computedFromUnassigned', { count: summary.transactionCount });
  const lastUpdate = summary.lastPostedAt
    ? t('lastUpdate', {
        date: new Date(summary.lastPostedAt).toLocaleString(i18n.language, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      })
    : null;

  const availability = summary.dataAvailability;
  const missingArea = (availability.missingAreaFieldNames ?? []).map((name) => friendlyFieldLabel(name));
  const incomplete = (availability.incompleteFieldNames ?? []).map((name) => friendlyFieldLabel(name));
  const exclusions = [
    missingArea.length
      ? t('excludedMissingArea', { names: missingArea.join(', ') })
      : availability.areaIsMissing && availability.hasPostedRecords
        ? t('areaMissingAll')
        : null,
    incomplete.length ? t('excludedIncomplete', { names: incomplete.join(', ') }) : null,
    availability.perAreaExcludesUnassigned ? t('excludedUnassigned') : null,
  ].filter((line): line is string => Boolean(line));

  if (!computed && !lastUpdate && summary.draftCount <= 0 && exclusions.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {computed ? (
        <Text style={[styles.text, { color: colors.textTertiary }]}>{computed}</Text>
      ) : null}
      {exclusions.map((line) => (
        <Text key={line} style={[styles.text, { color: colors.textTertiary }]}>
          {line}
        </Text>
      ))}
      {lastUpdate ? (
        <Text style={[styles.text, { color: colors.textTertiary }]}>{lastUpdate}</Text>
      ) : null}
      {summary.draftCount > 0 ? (
        <Pressable onPress={onOpenDrafts} hitSlop={8}>
          <Text style={[styles.link, { color: colors.primary }]}>
            {t('draftCountClickable', { count: summary.draftCount })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  text: { ...typography.styles.caption, lineHeight: 18 },
  link: { fontWeight: '700', fontSize: 13 },
});

export default MoneyTrustStrip;
