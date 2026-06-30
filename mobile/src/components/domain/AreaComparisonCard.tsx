import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import Card from '../ui/Card';
import InfoRow from '../ui/InfoRow';
import { typography, spacing } from '../../theme';

export interface AreaComparisonCardProps {
  officialAreaSqm?: number;
  measuredAreaSqm?: number;
  differencePercent?: number;
}

const severityColor = (
  colors: ReturnType<typeof useTheme>['colors'],
  percent?: number
): string => {
  if (percent == null) return colors.borderLight;
  if (percent > 15) return colors.error;
  if (percent > 5) return colors.warning;
  return colors.success;
};

const AreaComparisonCard: React.FC<AreaComparisonCardProps> = ({
  officialAreaSqm,
  measuredAreaSqm,
  differencePercent,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation('fields');

  const borderColor = severityColor(colors, differencePercent);

  return (
    <Card
      variant="outlined"
      style={{
        marginTop: spacing.sm,
        borderLeftColor: borderColor,
        borderLeftWidth: 3,
      }}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('addField.areaComparison')}</Text>
      <InfoRow
        icon="scan-outline"
        label={t('addField.measuredArea')}
        value={measuredAreaSqm != null ? `${Math.round(measuredAreaSqm)} m²` : t('addField.notDrawn')}
      />
      <InfoRow
        icon="document-text-outline"
        label={t('addField.officialArea')}
        value={officialAreaSqm != null ? `${Math.round(officialAreaSqm)} m²` : '—'}
      />
      {differencePercent != null ? (
        <InfoRow
          icon="git-compare-outline"
          label={t('addField.difference')}
          value={`${differencePercent.toFixed(1)}%`}
          showDivider={false}
        />
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  title: {
    ...typography.styles.bodySmall,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
});

export default AreaComparisonCard;
