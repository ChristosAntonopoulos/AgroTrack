import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing, typography } from '../../theme';

type Props = {
  year: number;
  onYearChange: (year: number) => void;
};

const FieldResultYearControl: React.FC<Props> = ({ year, onYearChange }) => {
  const { t } = useTranslation('fields');
  const { colors, tapMin } = useTheme();
  const size = Math.max(tapMin, 48);

  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: colors.borderLight,
          backgroundColor: colors.surface,
          minHeight: size,
        },
      ]}
      accessibilityRole="adjustable"
      accessibilityLabel={t('page.yearAria')}
    >
      <Pressable
        onPress={() => onYearChange(year - 1)}
        accessibilityRole="button"
        accessibilityLabel={t('page.prevYear')}
        style={[styles.btn, { minWidth: size, minHeight: size }]}
      >
        <Text style={[styles.chevron, { color: colors.textPrimary }]}>‹</Text>
      </Pressable>
      <Text style={[styles.year, { color: colors.textPrimary }]} accessibilityLiveRegion="polite">
        {year}
      </Text>
      <Pressable
        onPress={() => onYearChange(year + 1)}
        accessibilityRole="button"
        accessibilityLabel={t('page.nextYear')}
        style={[styles.btn, { minWidth: size, minHeight: size }]}
      >
        <Text style={[styles.chevron, { color: colors.textPrimary }]}>›</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    flex: 1,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 20,
    fontWeight: '600',
  },
  year: {
    ...typography.styles.h4,
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    paddingHorizontal: spacing.sm,
  },
});

export default FieldResultYearControl;
