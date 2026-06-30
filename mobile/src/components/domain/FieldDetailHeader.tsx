import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { formatFieldArea } from '../../utils/fieldGeo';
import { normalizeStage } from '../../utils/lifecycleUtils';

interface FieldDetailHeaderProps {
  field: Field;
  currentYear: string;
  currentStage: string;
  openTaskCount: number;
  overdueCount: number;
  health: 'healthy' | 'monitor';
}

const FieldDetailHeader: React.FC<FieldDetailHeaderProps> = ({
  field,
  currentYear,
  currentStage,
  openTaskCount,
  overdueCount,
  health,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation(['fields', 'common', 'dashboard']);

  const metaParts: string[] = [];
  if (field.variety) metaParts.push(field.variety);
  metaParts.push(formatFieldArea(field));
  metaParts.push(t(`common:lifecycleYear.${currentYear}`));
  metaParts.push(t(`common:lifecycleStage.${normalizeStage(currentStage)}`));

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={2}>
          {field.name}
        </Text>
        <View
          style={[
            styles.healthChip,
            {
              backgroundColor:
                health === 'healthy' ? colors.success + '22' : colors.warning + '22',
              borderColor: health === 'healthy' ? colors.success + '55' : colors.warning + '55',
            },
          ]}
        >
          <View
            style={[
              styles.healthDot,
              { backgroundColor: health === 'healthy' ? colors.success : colors.warning },
            ]}
          />
          <Text
            style={[
              styles.healthLabel,
              { color: health === 'healthy' ? colors.success : colors.warning },
            ]}
          >
            {health === 'healthy' ? t('dashboard:fieldHealthy') : t('dashboard:fieldMonitor')}
          </Text>
        </View>
      </View>

      <Text style={[styles.metaLine, { color: colors.textSecondary }]} numberOfLines={2}>
        {metaParts.join(' · ')}
      </Text>

      <View style={styles.factsRow}>
        {field.irrigationStatus ? (
          <FactChip
            icon="water"
            label={t('fields:irrigated')}
            colors={colors}
            tint={colors.info}
          />
        ) : (
          <FactChip
            icon="water-outline"
            label={t('fields:dry')}
            colors={colors}
            tint={colors.textTertiary}
          />
        )}
        <FactChip
          icon="clipboard-outline"
          label={
            openTaskCount > 0
              ? t('fields:openTasksShort', { count: openTaskCount })
              : t('fields:noOpenTasks')
          }
          colors={colors}
          tint={overdueCount > 0 ? colors.error : colors.textSecondary}
          emphasize={overdueCount > 0}
        />
        {field.locationText ? (
          <FactChip
            icon="location-outline"
            label={field.locationText}
            colors={colors}
            tint={colors.textSecondary}
            flex
          />
        ) : null}
      </View>
    </View>
  );
};

const FactChip = ({
  icon,
  label,
  colors,
  tint,
  emphasize,
  flex,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
  tint: string;
  emphasize?: boolean;
  flex?: boolean;
}) => (
  <View
    style={[
      styles.factChip,
      flex && styles.factChipFlex,
      { backgroundColor: colors.surface, borderColor: colors.borderLight },
    ]}
  >
    <Ionicons name={icon} size={12} color={tint} />
    <Text
      style={[
        styles.factText,
        { color: emphasize ? tint : colors.textSecondary },
        flex && styles.factTextFlex,
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  name: {
    ...typography.styles.h2,
    fontWeight: '700',
    fontSize: 20,
    flex: 1,
    lineHeight: 26,
  },
  healthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 2,
  },
  healthDot: { width: 6, height: 6, borderRadius: 3 },
  healthLabel: { ...typography.styles.caption, fontWeight: '700', fontSize: 10 },
  metaLine: {
    ...typography.styles.bodySmall,
    lineHeight: 20,
  },
  factsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  factChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: '100%',
  },
  factChipFlex: { flex: 1, minWidth: 0 },
  factText: { ...typography.styles.caption, fontSize: 11, fontWeight: '500' },
  factTextFlex: { flexShrink: 1 },
});

export default FieldDetailHeader;
