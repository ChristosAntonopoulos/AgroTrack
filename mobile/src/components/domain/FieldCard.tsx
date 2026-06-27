import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import LifecycleIndicator from '../LifecycleIndicator';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';
import { Field } from '../../services/fieldService';
import { WeatherData } from '../../services/weatherService';

export interface FieldCardProps {
  field: Field;
  onPress?: () => void;
  onViewTasks?: () => void;
  onViewCalendar?: () => void;
  taskCount?: number;
  openTaskCount?: number;
  weather?: WeatherData;
}

const FieldCard: React.FC<FieldCardProps> = ({
  field,
  onPress,
  onViewTasks,
  onViewCalendar,
  taskCount,
  openTaskCount,
  weather,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation(['fields', 'common']);
  const hasIrrigation = field.irrigationStatus ?? false;
  const lifecycleAccent =
    field.currentLifecycleYear === 'high' ? colors.success : colors.info;

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: lifecycleAccent }]} />

      <View style={styles.body}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.72}>
          <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name="leaf" size={20} color={colors.primaryDark} />
          </View>
          <View style={styles.titleBlock}>
            <Text style={[styles.fieldName, { color: colors.textPrimary }]} numberOfLines={1}>
              {field.name}
            </Text>
            {field.variety ? (
              <Text style={[styles.variety, { color: colors.textSecondary }]} numberOfLines={1}>
                {field.variety}
              </Text>
            ) : null}
          </View>
          <LifecycleIndicator year={field.currentLifecycleYear} />
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>

        {weather ? (
          <View style={[styles.weatherRow, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={styles.weatherIcon}>{weather.icon}</Text>
            <Text style={[styles.weatherTemp, { color: colors.textPrimary }]}>
              {weather.temperature}°C
            </Text>
            <Text style={[styles.weatherCondition, { color: colors.textSecondary }]}>
              {weather.condition}
            </Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <StatPill icon="resize-outline" label={`${field.area} ha`} colors={colors} />
          <StatPill
            icon="water-outline"
            label={hasIrrigation ? t('fields:irrigated') : t('fields:dry')}
            colors={colors}
          />
          {taskCount !== undefined ? (
            <StatPill
              icon="clipboard-outline"
              label={`${openTaskCount ?? taskCount} ${t('fields:tasksCount').toLowerCase()}`}
              colors={colors}
              highlight={(openTaskCount ?? taskCount) > 0}
            />
          ) : null}
        </View>
        </TouchableOpacity>

        {(onViewTasks || onViewCalendar) ? (
          <View style={[styles.actions, { borderTopColor: colors.borderLight }]}>
            {onViewTasks ? (
              <ActionChip
                icon="list-outline"
                label={t('fields:viewTasks')}
                onPress={onViewTasks}
                colors={colors}
              />
            ) : null}
            {onViewCalendar ? (
              <ActionChip
                icon="calendar-outline"
                label={t('fields:viewCalendar')}
                onPress={onViewCalendar}
                colors={colors}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const StatPill = ({
  icon,
  label,
  colors,
  highlight = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
  highlight?: boolean;
}) => (
  <View style={[styles.statPill, { backgroundColor: colors.surfaceMuted }]}>
    <Ionicons name={icon} size={13} color={highlight ? colors.primaryDark : colors.textTertiary} />
    <Text
      style={[
        styles.statText,
        { color: highlight ? colors.primaryDark : colors.textSecondary },
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </View>
);

const ActionChip = ({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) => (
  <TouchableOpacity
    style={[styles.actionChip, { borderColor: colors.border }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Ionicons name={icon} size={14} color={colors.primaryDark} />
    <Text style={[styles.actionText, { color: colors.primaryDark }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
    minHeight: 88,
  },
  accentBar: { width: 5 },
  body: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1 },
  fieldName: { ...typography.styles.body, fontWeight: '700', fontSize: 16 },
  variety: { ...typography.styles.caption, marginTop: 1 },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
  },
  weatherIcon: { fontSize: 18 },
  weatherTemp: { ...typography.styles.bodySmall, fontWeight: '700' },
  weatherCondition: { ...typography.styles.bodySmall, flex: 1, textTransform: 'capitalize' },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statText: { fontSize: 11, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionText: { fontSize: 11, fontWeight: '700' },
});

export default FieldCard;
