import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';
import { Field } from '../../services/fieldService';
import { fieldGradientColors, fieldHealthStatus } from '../../utils/dashboardUtils';
import { normalizeStage } from '../../utils/lifecycleUtils';

export interface DashboardFieldCardProps {
  field: Field;
  openTaskCount?: number;
  hasOverdue?: boolean;
  onPress?: () => void;
  onViewTasks?: () => void;
  onViewCalendar?: () => void;
  onViewDetails?: () => void;
}

const DashboardFieldCard: React.FC<DashboardFieldCardProps> = ({
  field,
  openTaskCount = 0,
  hasOverdue = false,
  onPress,
  onViewTasks,
  onViewCalendar,
  onViewDetails,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation(['fields', 'common', 'dashboard']);
  const [gradStart, gradEnd] = fieldGradientColors(field.id);
  const health = fieldHealthStatus(field, openTaskCount, hasOverdue);
  const isHealthy = health === 'healthy';
  const producerCount = field.assignedProducerIds?.length ?? 0;
  const hasGps = field.latitude != null && field.longitude != null;
  const stageKey = field.currentLifecycleStage;

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
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <View style={[styles.imageHeader, { backgroundColor: gradStart }]}>
          <View style={[styles.imageOverlay, { backgroundColor: gradEnd + 'AA' }]} />
          <View style={styles.imageContent}>
            <Ionicons name="leaf" size={48} color={colors.textInverse + '55'} style={styles.watermark} />
            <View
              style={[
                styles.healthBadge,
                {
                  backgroundColor: isHealthy ? colors.success : colors.warning,
                },
              ]}
            >
              <Text style={[styles.healthText, { color: colors.textInverse }]}>
                {isHealthy ? t('dashboard:fieldHealthy') : t('dashboard:fieldMonitor')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {field.name}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
            <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1}>
              {field.variety || t('fields:fieldLabel')}
            </Text>
            <Text style={[styles.area, { color: colors.textPrimary }]}>{field.area} ha</Text>
          </View>
          <View style={styles.chips}>
            {stageKey ? (
              <Chip
                label={t(`common:lifecycleStage.${normalizeStage(stageKey)}`)}
                colors={colors}
                tint={colors.primary + '18'}
                textColor={colors.primaryDark}
              />
            ) : null}
            <Chip
              label={field.irrigationStatus ? t('fields:irrigated') : t('fields:dry')}
              colors={colors}
              tint={colors.infoLight}
            />
            <Chip
              label={
                field.currentLifecycleYear === 'high'
                  ? t('fields:highYear')
                  : t('fields:lowYear')
              }
              colors={colors}
              tint={colors.warningLight}
            />
            {field.treeAge ? (
              <Chip
                label={t('fields:treeAgeShort', { age: field.treeAge })}
                colors={colors}
                tint={colors.surfaceMuted}
              />
            ) : null}
            {producerCount > 0 ? (
              <Chip
                label={t('fields:producerCount', { count: producerCount })}
                colors={colors}
                tint={colors.surfaceMuted}
              />
            ) : null}
            {hasGps ? (
              <Chip
                label={t('fields:hasGps')}
                colors={colors}
                tint={colors.successLight}
              />
            ) : null}
            {openTaskCount > 0 ? (
              <Chip
                label={t('fields:openTasksShort', { count: openTaskCount })}
                colors={colors}
                tint={hasOverdue ? colors.errorLight : colors.surfaceMuted}
                textColor={hasOverdue ? colors.error : colors.textSecondary}
              />
            ) : null}
          </View>
        </View>
      </TouchableOpacity>

      <View style={[styles.actions, { borderTopColor: colors.borderLight }]}>
        {onViewTasks ? (
          <OutlineBtn icon="list-outline" label={t('fields:viewTasks')} onPress={onViewTasks} colors={colors} />
        ) : null}
        {onViewCalendar ? (
          <OutlineBtn
            icon="calendar-outline"
            label={t('fields:viewCalendar')}
            onPress={onViewCalendar}
            colors={colors}
          />
        ) : null}
        {onViewDetails ? (
          <OutlineBtn
            icon="information-circle-outline"
            label={t('dashboard:details')}
            onPress={onViewDetails}
            colors={colors}
          />
        ) : null}
      </View>
    </View>
  );
};

const Chip = ({
  label,
  colors,
  tint,
  textColor,
}: {
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
  tint: string;
  textColor?: string;
}) => (
  <View style={[styles.chip, { backgroundColor: tint }]}>
    <Text style={[styles.chipText, { color: textColor ?? colors.textSecondary }]}>{label}</Text>
  </View>
);

const OutlineBtn = ({
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
    style={[styles.outlineBtn, { borderColor: colors.border }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Ionicons name={icon} size={14} color={colors.primaryDark} />
    <Text style={[styles.outlineText, { color: colors.primaryDark }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  imageHeader: { height: 100, position: 'relative' },
  imageOverlay: { ...StyleSheet.absoluteFillObject },
  imageContent: { flex: 1, justifyContent: 'flex-start', padding: spacing.sm },
  watermark: { position: 'absolute', right: spacing.md, bottom: -8, opacity: 0.5 },
  healthBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 8,
  },
  healthText: { ...typography.styles.caption, fontWeight: '700', fontSize: 10 },
  body: { padding: spacing.md },
  name: { ...typography.styles.body, fontWeight: '700', fontSize: 16, marginBottom: spacing.xs },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  location: { ...typography.styles.caption, flex: 1 },
  area: { ...typography.styles.caption, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 8 },
  chipText: { fontSize: 10, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  outlineText: { fontSize: 10, fontWeight: '700' },
});

export default DashboardFieldCard;
