import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radii, typography, motion } from '../../theme';
import { createElevation } from '../../theme/elevation';
import { resolveFieldColor } from '../../utils/fieldColors';
import { formatFieldArea } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { getFieldStatusLabel, isFieldSetupIncomplete } from '../../utils/fieldDisplay';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
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
 * Field list card — title, place, status/size, one metadata line.
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
  const { t, i18n } = useTranslation('fields');
  const accent = resolveFieldColor(field.color, field.id);
  const incomplete = isFieldSetupIncomplete(field.status);
  const hasTasks = Boolean(stats.tasksReady) && stats.todayTaskCount > 0;
  const displayName = friendlyFieldLabel(field.name);
  const shortLocation = getFieldShortLocation(field);
  const status = getFieldStatusLabel(field.status, t);
  const locale = i18n.language?.startsWith('el')
    ? 'el'
    : i18n.language?.startsWith('it')
      ? 'it'
      : 'en';
  const area = formatFieldArea(field, locale);
  const facts = [status, area && area !== '—' ? area : null].filter(Boolean).join(' · ');

  const metaLine = incomplete
    ? t('card.continueSetup')
    : !stats.tasksReady
      ? t('card.todayTasksLoading')
      : hasTasks
        ? t('card.todayTasks', { count: stats.todayTaskCount })
        : null;

  const handleActivate = () => {
    if (onSelect) onSelect();
    else onPress?.();
  };

  return (
    <Pressable
      onPress={handleActivate}
      accessibilityRole={onSelect ? 'button' : 'link'}
      accessibilityState={{ selected }}
      accessibilityLabel={[displayName, shortLocation, facts, metaLine].filter(Boolean).join(', ')}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        {
          backgroundColor: selected ? colors.surfaceSelected : colors.surface,
          borderColor: selected ? colors.oliveBorder : colors.borderLight,
          opacity: pressed ? motion.pressOpacity : 1,
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      {compact ? (
        <View style={styles.pinWrap} pointerEvents="none">
          <FieldPinMark color={accent} selected={selected} compact />
        </View>
      ) : (
        <FieldPolygonThumbnail field={field} size={96} circular={false} />
      )}
      <View style={styles.main}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={2}>
          {displayName}
        </Text>
        {shortLocation ? (
          <Text style={[styles.place, { color: colors.textSecondary }]} numberOfLines={1}>
            {shortLocation}
          </Text>
        ) : null}
        {facts ? (
          <Text style={[styles.facts, { color: colors.textSecondary }]} numberOfLines={1}>
            {facts}
          </Text>
        ) : null}
        {metaLine ? (
          <Text
            style={[
              styles.meta,
              {
                color: incomplete || hasTasks ? colors.primary : colors.textTertiary,
                fontWeight: incomplete || hasTasks ? '700' : '500',
              },
            ]}
            numberOfLines={1}
          >
            {metaLine}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
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
  main: { flex: 1, minWidth: 0, gap: 2 },
  name: {
    ...typography.styles.body,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  place: {
    ...typography.styles.bodySmall,
    fontSize: 13,
    lineHeight: 17,
  },
  facts: {
    ...typography.styles.caption,
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    ...typography.styles.caption,
    marginTop: 2,
    fontSize: 13,
  },
});

export default FieldCard;
