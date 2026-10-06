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
import {
  getFieldStatusLabel,
  isFieldSetupIncomplete,
  viewerFieldRole,
  type ViewerFieldRole,
} from '../../utils/fieldDisplay';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import FieldPolygonThumbnail from '../fields/FieldPolygonThumbnail';
import FieldPeopleStrip from '../fields/FieldPeopleStrip';
import FieldPinMark from '../maps/FieldPinMark';

export interface FieldCardStats {
  todayTaskCount: number;
  tasksReady?: boolean;
}

interface FieldCardProps {
  field: Field;
  stats: FieldCardStats;
  currentUserId?: string | null;
  compact?: boolean;
  selected?: boolean;
  onPress?: () => void;
  onSelect?: () => void;
}

const ROLE_BADGE_TONE: Record<
  ViewerFieldRole,
  { bg: string; fg: string }
> = {
  Admin: { bg: 'rgba(61, 122, 74, 0.16)', fg: '#245734' },
  Partner: { bg: 'rgba(59, 98, 140, 0.14)', fg: '#1e3a5f' },
  Family: { bg: 'rgba(180, 120, 48, 0.16)', fg: '#7a4a12' },
};

/**
 * Field list card — title, place, status/size, role, one metadata line.
 */
const FieldCard: React.FC<FieldCardProps> = ({
  field,
  stats,
  currentUserId,
  compact = false,
  selected,
  onPress,
  onSelect,
}) => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation('fields');
  const accent = resolveFieldColor(field.color, field.id);
  const incomplete = isFieldSetupIncomplete(field.status);
  const role = viewerFieldRole(field, currentUserId);
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

  const roleLabel = role
    ? t(`card.role.${role}`)
    : currentUserId && field.ownerId !== currentUserId
      ? t('card.sharedBadge')
      : null;
  const roleTone = role
    ? ROLE_BADGE_TONE[role]
    : roleLabel
      ? ROLE_BADGE_TONE.Partner
      : null;

  const handleActivate = () => {
    // Map mode: first tap focuses the grove on the map, second opens it.
    if (onSelect) {
      if (selected) onPress?.();
      else onSelect();
      return;
    }
    onPress?.();
  };

  return (
    <Pressable
      onPress={handleActivate}
      accessibilityRole={onSelect ? 'button' : 'link'}
      accessibilityState={{ selected }}
      accessibilityLabel={[displayName, roleLabel, shortLocation, facts, metaLine]
        .filter(Boolean)
        .join(', ')}
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
        {incomplete || roleLabel ? (
          <View style={styles.badgeRow}>
            {incomplete ? (
              <View style={[styles.badge, styles.badgeDraft]}>
                <Text style={styles.badgeDraftText}>{t('card.draftBadge')}</Text>
              </View>
            ) : null}
            {roleLabel && roleTone ? (
              <View style={[styles.badge, { backgroundColor: roleTone.bg }]}>
                <Text style={[styles.badgeText, { color: roleTone.fg }]}>{roleLabel}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
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
        {!compact ? (
          <FieldPeopleStrip
            fieldId={field.id}
            variant="card"
            seed={field.memberships}
            onManage={() => undefined}
          />
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeDraft: {
    backgroundColor: 'rgba(201, 162, 39, 0.22)',
  },
  badgeDraftText: {
    ...typography.styles.caption,
    fontSize: 11,
    fontWeight: '700',
    color: '#7a5b00',
  },
  badgeText: {
    ...typography.styles.caption,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
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
