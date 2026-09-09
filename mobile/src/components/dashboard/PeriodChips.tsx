import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme';

export interface PeriodChipsProps {
  period: 'today' | 'week' | 'month';
  onChange: (period: 'today' | 'week' | 'month') => void;
  tapMin?: number;
}

const PeriodChips: React.FC<PeriodChipsProps> = ({ period, onChange, tapMin = 44 }) => {
  const { colors } = useTheme();
  const { t } = useTranslation('dashboard');
  const options: Array<'today' | 'week' | 'month'> = ['today', 'week', 'month'];

  return (
    <View style={styles.row} accessibilityRole="tablist">
      {options.map((p) => {
        const active = period === p;
        return (
          <TouchableOpacity
            key={p}
            style={[
              styles.chip,
              {
                minHeight: tapMin,
                backgroundColor: active ? colors.primary : colors.surfaceElevated,
                borderColor: active ? colors.primary : colors.borderLight,
              },
            ]}
            onPress={() => onChange(p)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={{ color: active ? '#fff' : colors.textSecondary, fontWeight: '700' }}>
              {t(`myActions.period.${p}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PeriodChips;
