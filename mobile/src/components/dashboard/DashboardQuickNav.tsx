import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface DashboardNavItem {
  id: string;
  icon: IconName;
  label: string;
  /** Short human-readable hint, e.g. "5 scheduled" */
  hint?: string;
  badge?: number;
  urgent?: boolean;
  onPress: () => void;
}

interface DashboardQuickNavProps {
  greeting?: string;
  dateLabel?: string;
  statusLine?: string;
  items: DashboardNavItem[];
}

const NavTile: React.FC<DashboardNavItem> = ({
  icon,
  label,
  hint,
  badge,
  urgent,
  onPress,
}) => {
  const { colors } = useTheme();
  const accent = urgent ? colors.error : colors.primaryDark;
  const tint = urgent ? colors.errorLight : colors.primary + '14';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: urgent ? colors.error + '55' : colors.borderLight,
          opacity: pressed ? 0.88 : 1,
          ...createElevation(colors, 'sm'),
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={[label, hint].filter(Boolean).join(', ')}
    >
      <View style={[styles.iconWrap, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={22} color={accent} />
        {badge != null && badge > 0 ? (
          <View style={[styles.badge, { backgroundColor: urgent ? colors.error : colors.primaryDark }]}>
            <Text style={[styles.badgeText, { color: colors.textInverse }]}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.tileLabel, { color: colors.textPrimary }]} numberOfLines={1}>
        {label}
      </Text>
      {hint ? (
        <Text style={[styles.tileHint, { color: urgent ? colors.error : colors.textSecondary }]} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </Pressable>
  );
};

const DashboardQuickNav: React.FC<DashboardQuickNavProps> = ({
  greeting,
  dateLabel,
  statusLine,
  items,
}) => {
  const { colors } = useTheme();

  if (items.length === 0) return null;

  return (
    <View style={[styles.panel, { borderBottomColor: colors.borderLight }]}>
      {greeting || dateLabel || statusLine ? (
        <View style={styles.header}>
          {greeting ? (
            <Text style={[styles.greeting, { color: colors.textPrimary }]} numberOfLines={1}>
              {greeting}
            </Text>
          ) : null}
          {dateLabel ? (
            <Text style={[styles.date, { color: colors.textSecondary }]} numberOfLines={1}>
              {dateLabel}
            </Text>
          ) : null}
          {statusLine ? (
            <Text style={[styles.statusLine, { color: colors.textSecondary }]} numberOfLines={2}>
              {statusLine}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.navRow}>
        {items.map((item) => (
          <NavTile key={item.id} {...item} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    marginBottom: spacing.md,
  },
  greeting: {
    ...typography.styles.h3,
    fontWeight: '700',
    fontSize: 22,
    letterSpacing: -0.3,
  },
  date: {
    ...typography.styles.caption,
    marginTop: 2,
    fontSize: 13,
  },
  statusLine: {
    ...typography.styles.bodySmall,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 96,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tileLabel: {
    ...typography.styles.caption,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  tileHint: {
    ...typography.styles.caption,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
});

export default DashboardQuickNav;
