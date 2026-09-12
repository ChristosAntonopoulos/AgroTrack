import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, radii } from '../../theme';
import type { FarmerSeason } from '../../utils/farmerSeason';

type Props = {
  season: FarmerSeason;
  attentionCount: number;
  suitableTodayCount: number;
  onPress: () => void;
};

const TaskSeasonStrip = ({ season, attentionCount, suitableTodayCount, onPress }: Props) => {
  const { t } = useTranslation('tasks');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      style={[
        styles.wrap,
        {
          backgroundColor: colors.primaryLight,
          borderColor: colors.oliveBorder,
          minHeight: Math.max(48, tapMin),
        },
      ]}
    >
      <View style={styles.copy}>
        <Text style={[styles.kicker, { color: colors.primary }]}>
          {t('fieldWork.views.now')} · {t(season.labelKey)}
        </Text>
        <Text style={[styles.summary, { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }]}>
          {t('fieldWork.season.summary', {
            attention: attentionCount,
            suitable: suitableTodayCount,
          })}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  copy: { gap: 2 },
  kicker: {
    ...typography.styles.caption,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  summary: {
    ...typography.styles.bodySmall,
    lineHeight: 18,
  },
});

export default TaskSeasonStrip;
