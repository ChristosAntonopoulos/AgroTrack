import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import Card from '../ui/Card';
import InfoRow from '../ui/InfoRow';
import { typography, spacing } from '../../theme';

export interface AreaComparisonCardProps {
  measuredAreaSqm?: number;
}

const AreaComparisonCard: React.FC<AreaComparisonCardProps> = ({ measuredAreaSqm }) => {
  const { colors } = useTheme();
  const { t } = useTranslation('fields');
  if (measuredAreaSqm == null || measuredAreaSqm <= 0) return null;

  return (
    <Card variant="outlined" style={{ marginTop: spacing.sm }}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('addField.measuredArea')}</Text>
      <InfoRow
        icon="scan-outline"
        label={t('addField.measuredArea')}
        value={`${Math.round(measuredAreaSqm)} m²`}
        showDivider={false}
      />
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
