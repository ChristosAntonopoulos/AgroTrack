import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing } from '../../theme';

type Props = {
  year: number;
  onYearChange: (year: number) => void;
};

/** Compact year stepper for the field page chrome. */
const FieldResultYearControl: React.FC<Props> = ({ year, onYearChange }) => {
  const { t } = useTranslation('fields');
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: colors.borderLight,
          backgroundColor: colors.surfaceElevated,
        },
      ]}
      accessibilityRole="adjustable"
      accessibilityLabel={t('page.yearAria')}
    >
      <Pressable
        onPress={() => onYearChange(year - 1)}
        accessibilityRole="button"
        accessibilityLabel={t('page.prevYear')}
        hitSlop={8}
        style={styles.btn}
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
        hitSlop={8}
        style={styles.btn}
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
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    overflow: 'hidden',
    alignSelf: 'stretch',
    minHeight: 40,
  },
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 20,
    fontWeight: '600',
  },
  year: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    paddingHorizontal: spacing.sm,
  },
});

export default FieldResultYearControl;
