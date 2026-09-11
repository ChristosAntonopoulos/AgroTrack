import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface FieldsSummaryChipProps {
  icon: IconName;
  value: string | number;
  label: string;
  accentColor?: string;
  badge?: number;
  onPress?: () => void;
}

interface FieldsSummaryHeaderProps {
  title: string;
  subtitle?: string;
  chips: FieldsSummaryChipProps[];
  onAddPress?: () => void;
  addLabel?: string;
}

export const SummaryChip: React.FC<FieldsSummaryChipProps> = ({
  icon,
  value,
  label,
  accentColor,
  badge,
  onPress,
}) => {
  const { colors } = useTheme();
  const accent = accentColor ?? colors.primary;

  const content = (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.borderLight,
        },
      ]}
    >
      <View style={[styles.chipIcon, { backgroundColor: accent + '18' }]}>
        <Ionicons name={icon} size={14} color={accent} />
      </View>
      <View style={styles.chipText}>
        <Text style={[styles.chipValue, { color: colors.textPrimary }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[styles.chipLabel, { color: colors.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {badge != null && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <Text style={[styles.badgeText, { color: colors.onOlive }]}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.8 }}>
        {content}
      </Pressable>
    );
  }
  return content;
};

const FieldsSummaryHeader: React.FC<FieldsSummaryHeaderProps> = ({
  title,
  subtitle,
  chips,
  onAddPress,
  addLabel,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { borderBottomColor: colors.borderLight }]}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {onAddPress ? (
          <Pressable
            onPress={onAddPress}
            accessibilityLabel={addLabel}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={22} color={colors.onOlive} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {chips.map((chip) => (
          <SummaryChip key={chip.label} {...chip} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  titleBlock: { flex: 1 },
  title: { ...typography.styles.h3, fontWeight: '700', fontSize: 20 },
  subtitle: { ...typography.styles.caption, marginTop: 3, lineHeight: 18 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  chipsRow: {
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 108,
    maxWidth: 140,
  },
  chipIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { flex: 1, minWidth: 0 },
  chipValue: { ...typography.styles.bodySmall, fontWeight: '700', fontSize: 13 },
  chipLabel: { ...typography.styles.caption, fontSize: 10 },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
});

export default FieldsSummaryHeader;
