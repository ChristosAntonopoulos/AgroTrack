import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';
import type { MeDashboardSeriesPoint } from '../../services/meDashboardService';

export interface ActionSparklineProps {
  series: MeDashboardSeriesPoint[];
}

const ActionSparkline: React.FC<ActionSparklineProps> = ({ series }) => {
  const { colors } = useTheme();
  const { t } = useTranslation('dashboard');
  if (!series.length) return null;

  const max = Math.max(1, ...series.map((s) => s.total));

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'sm'),
        },
      ]}
      accessibilityLabel={t('myActions.sparklineTitle')}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('myActions.sparklineTitle')}</Text>
      <View style={styles.bars}>
        {series.slice(-14).map((point) => (
          <View key={point.date} style={styles.barCol}>
            <View
              style={[
                styles.bar,
                {
                  height: Math.max(4, Math.round((point.total / max) * 56)),
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: { ...typography.styles.bodySmall, fontWeight: '700', marginBottom: spacing.sm },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 64,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '80%', borderRadius: 3, minHeight: 4 },
});

export default ActionSparkline;
