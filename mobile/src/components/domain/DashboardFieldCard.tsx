import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';
import { Field } from '../../services/fieldService';
import { normalizeStage } from '../../utils/lifecycleUtils';

export interface DashboardFieldCardProps {
  field: Field;
  openTaskCount?: number;
  hasOverdue?: boolean;
  nextJobTitle?: string;
  onPress?: () => void;
  onViewTasks?: () => void;
  onViewCalendar?: () => void;
  onViewDetails?: () => void;
}

const DashboardFieldCard: React.FC<DashboardFieldCardProps> = ({
  field,
  hasOverdue = false,
  nextJobTitle,
  onPress,
}) => {
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier } = usePreferences();
  const { t } = useTranslation(['fields', 'common']);
  const stage = normalizeStage(field.currentLifecycleStage);
  const yearKey = field.currentLifecycleYear === 'high' ? 'high' : 'low';
  const seasonLine = t('fields:everydaySeasonLine', {
    stage: t(`common:lifecycleStage.${stage}`),
    year: t(`common:lifecycleYear.${yearKey}`),
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: hasOverdue ? colors.error : colors.borderLight,
          minHeight: Math.max(tapMin + 24, 88),
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      <View style={styles.body}>
        <Text
          style={[styles.name, { color: colors.textPrimary, fontSize: 18 * fontScaleMultiplier }]}
          numberOfLines={1}
        >
          {field.name}
        </Text>
        <Text
          style={[styles.season, { color: colors.textSecondary, fontSize: 15 * fontScaleMultiplier }]}
          numberOfLines={2}
        >
          {seasonLine}
        </Text>
        <View style={styles.jobRow}>
          <Ionicons
            name={nextJobTitle ? 'clipboard-outline' : 'checkmark-circle-outline'}
            size={16}
            color={hasOverdue ? colors.error : colors.textTertiary}
          />
          <Text
            style={{
              color: hasOverdue ? colors.error : colors.textSecondary,
              fontWeight: '600',
              flex: 1,
              fontSize: 15 * fontScaleMultiplier,
            }}
            numberOfLines={1}
          >
            {nextJobTitle || t('fields:noJobsToday')}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.textTertiary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.sm,
  },
  body: { flex: 1, padding: spacing.md, gap: 4 },
  name: { ...typography.styles.body, fontWeight: '800' },
  season: { ...typography.styles.body },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
});

export default DashboardFieldCard;
