import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Field } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { spacing, radii, typography, motion } from '../../theme';
import { createElevation } from '../../theme/elevation';
import { resolveFieldColor } from '../../utils/fieldColors';
import { isFieldSetupIncomplete } from '../../utils/fieldDisplay';
import FieldIdentity from '../fields/FieldIdentity';
import FieldPolygonThumbnail from '../fields/FieldPolygonThumbnail';
import FieldPinMark from '../maps/FieldPinMark';

export interface FieldCardStats {
  todayTaskCount: number;
  tasksReady?: boolean;
}

interface FieldCardProps {
  field: Field;
  stats: FieldCardStats;
  compact?: boolean;
  selected?: boolean;
  onPress?: () => void;
  onSelect?: () => void;
}

/**
 * Field list card — quiet limestone surface, circular colour + boundary preview.
 */
const FieldCard: React.FC<FieldCardProps> = ({
  field,
  stats,
  compact = false,
  selected,
  onPress,
  onSelect,
}) => {
  const { colors } = useTheme();
  const { tapMin } = usePreferences();
  const { t } = useTranslation('fields');
  const accent = resolveFieldColor(field.color, field.id);
  const incomplete = isFieldSetupIncomplete(field.status);
  const hasTasks = Boolean(stats.tasksReady) && stats.todayTaskCount > 0;
  const todayLine = !stats.tasksReady
    ? t('card.todayTasksLoading')
    : stats.todayTaskCount === 0
      ? t('card.todayTasks_zero')
      : t('card.todayTasks', { count: stats.todayTaskCount });
  const openLabel = incomplete ? t('card.continueSetup') : t('card.open');

  const handleActivate = () => {
    if (onSelect) onSelect();
    else onPress?.();
  };

  return (
    <Pressable
      onPress={handleActivate}
      accessibilityRole={onSelect ? 'button' : 'link'}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        {
          backgroundColor: selected ? colors.surfaceSelected : colors.surface,
          borderColor: selected || hasTasks ? colors.oliveBorder : colors.borderLight,
          borderLeftWidth: 3,
          borderLeftColor: hasTasks ? colors.primary : accent,
          minHeight: Math.max(tapMin + 24, compact ? 76 : 92),
          opacity: pressed ? motion.pressOpacity : 1,
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      {compact ? (
        <View style={styles.pinWrap} pointerEvents="none">
          <FieldPinMark color={accent} selected={selected} compact />
        </View>
      ) : null}
      <View style={styles.main}>
        <FieldIdentity field={field} size="card" />
        <View style={styles.footer}>
          <Text
            style={[
              styles.today,
              {
                color: hasTasks ? colors.primary : colors.textSecondary,
                fontStyle: stats.tasksReady ? 'normal' : 'italic',
              },
            ]}
            numberOfLines={1}
          >
            {todayLine}
          </Text>
          <View style={styles.openRow} accessibilityElementsHidden>
            <Text style={[styles.open, { color: colors.primary }]}>{openLabel}</Text>
            <Ionicons name="chevron-forward" size={15} color={colors.primary} />
          </View>
        </View>
      </View>
      {compact ? null : <FieldPolygonThumbnail field={field} size={76} circular />}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  cardCompact: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radii.lg,
  },
  pinWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1, minWidth: 0, gap: spacing.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: 2,
    marginLeft: 22,
  },
  today: {
    ...typography.styles.caption,
    fontWeight: '600',
    flexShrink: 1,
    fontSize: 13,
  },
  openRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, gap: 1 },
  open: { fontSize: 13, fontWeight: '700' },
});

export default FieldCard;
