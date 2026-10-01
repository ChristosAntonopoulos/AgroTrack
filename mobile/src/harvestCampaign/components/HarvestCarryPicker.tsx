import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing } from '../../theme';

export const carryColor = (colors: string[]): string | undefined => {
  const unique = [...new Set(colors.filter(Boolean))];
  return unique.length === 1 ? unique[0] : undefined;
};

export type HarvestCarryItem = {
  id: string;
  title: string;
  detail?: string;
  colors: string[];
  badge?: string;
  group?: string;
  disabled?: boolean;
};

export const HarvestCarryPicker: React.FC<{
  label: string;
  items: HarvestCarryItem[];
  selected: string[];
  onToggle: (id: string) => void;
  onSelectAll?: () => void;
  selectAllLabel?: string;
  transfer?: { from: string; to: string; color?: string } | null;
  hint?: string;
  trailing?: React.ReactNode;
  hideHeading?: boolean;
  /** One quiet selected row. The rest stay behind a single line. */
  compact?: boolean;
  moreLabel?: string;
  lessLabel?: string;
}> = ({
  label,
  items,
  selected,
  onToggle,
  onSelectAll,
  selectAllLabel,
  transfer,
  hint,
  trailing,
  hideHeading = false,
  compact = false,
  moreLabel,
  lessLabel,
}) => {
  const { colors, tapMin } = useTheme();
  const [showRest, setShowRest] = useState(false);
  const restCount = compact ? items.filter((item) => !selected.includes(item.id)).length : 0;
  const visible = compact && !showRest
    ? items.filter((item) => selected.includes(item.id)).length > 0
      ? items.filter((item) => selected.includes(item.id))
      : items.slice(0, 1)
    : items;
  let lastGroup = '';

  return (
    <View style={styles.block}>
      {hideHeading ? null : (
        <View style={styles.head}>
          <Text style={[styles.section, { color: colors.textSecondary }]}>{label}</Text>
          {onSelectAll && selectAllLabel ? (
            <Pressable onPress={onSelectAll} hitSlop={8}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{selectAllLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      )}
      <View style={styles.list} accessibilityLabel={label}>
        {visible.map((item) => {
          const on = selected.includes(item.id);
          const showGroup = Boolean(item.group) && item.group !== lastGroup;
          if (item.group) lastGroup = item.group;
          const lead = item.colors[0] || colors.primary;
          const barColors = [...new Set(item.colors.filter(Boolean))].slice(0, 3);
          const stripes = barColors.length > 0 ? barColors : [lead];
          return (
            <React.Fragment key={item.id}>
              {showGroup ? (
                <Text style={[styles.group, { color: colors.textSecondary }]}>{item.group}</Text>
              ) : null}
              <Pressable
                disabled={item.disabled}
                onPress={() => {
                  if (item.disabled) return;
                  onToggle(item.id);
                }}
                style={({ pressed }) => [
                  styles.row,
                  compact && styles.rowCompact,
                  {
                    minHeight: compact ? 46 : Math.max(56, tapMin),
                    backgroundColor: colors.surfaceElevated,
                    borderColor: on ? colors.primary : colors.border,
                    borderWidth: on ? 1.5 : 1,
                    opacity: item.disabled ? 0.5 : pressed ? 0.88 : 1,
                  },
                ]}
              >
                <View style={styles.bar}>
                  {stripes.map((color, index) => (
                    <View key={`${item.id}-${index}`} style={[styles.stripe, { backgroundColor: color }]} />
                  ))}
                </View>
                <View style={styles.copy}>
                  <Text
                    style={[styles.title, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  {item.detail ? (
                    <Text
                      style={[styles.detail, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {item.detail}
                    </Text>
                  ) : null}
                </View>
                {item.badge ? (
                  <Text style={[styles.badge, { color: colors.primary }]}>{item.badge}</Text>
                ) : null}
                {on ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>
      {compact && restCount > 0 && moreLabel ? (
        <Pressable onPress={() => setShowRest((open) => !open)} hitSlop={8} style={styles.more}>
          <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
            {showRest && lessLabel ? lessLabel : moreLabel}
          </Text>
          <Ionicons
            name={showRest ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.textSecondary}
          />
        </Pressable>
      ) : null}
      {transfer ? (
        <Text style={[styles.transfer, { color: transfer.color || colors.textPrimary }]}>
          {transfer.from} → {transfer.to}
        </Text>
      ) : hint ? (
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{hint}</Text>
      ) : null}
      {trailing}
    </View>
  );
};

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  section: { fontSize: 13, fontWeight: '700', flex: 1 },
  list: { gap: 8 },
  group: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.lg,
    paddingVertical: 10,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  bar: { width: 6, alignSelf: 'stretch', borderRadius: 99, overflow: 'hidden' },
  stripe: { flex: 1, minHeight: 8 },
  copy: { flex: 1, gap: 2 },
  title: { fontWeight: '700', fontSize: 15 },
  detail: { fontSize: 13 },
  badge: { fontSize: 11, fontWeight: '700' },
  transfer: { fontSize: 13, fontWeight: '700' },
  rowCompact: { paddingVertical: 8, borderRadius: 14 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
});
