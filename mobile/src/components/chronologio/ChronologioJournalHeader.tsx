import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { motion, radii, spacing, typography } from '../../theme';
import HeaderIconButton from '../layout/HeaderIconButton';

type Props = {
  /** Temporal hero — “Today”, “September 2026”, “2026”, “Years”. */
  periodLabel: string;
  contextLabel: string;
  onPressContext: () => void;
  onPressFilters: () => void;
  filtersActive?: boolean;
  filtersCount?: number;
  compact?: boolean;
  showPeriodNav?: boolean;
  onPrevPeriod?: () => void;
  onNextPeriod?: () => void;
  canPrevPeriod?: boolean;
  canNextPeriod?: boolean;
  onPressPeriod?: () => void;
  showToday?: boolean;
  onPressToday?: () => void;
  todayLabel?: string;
  filtersLabel?: string;
};

/**
 * Compact period masthead — Calendar grammar, shared HeaderIconButton for filters.
 */
const ChronologioJournalHeader: React.FC<Props> = ({
  periodLabel,
  contextLabel,
  onPressContext,
  onPressFilters,
  filtersActive = false,
  filtersCount = 0,
  compact = false,
  showPeriodNav = false,
  onPrevPeriod,
  onNextPeriod,
  canPrevPeriod = true,
  canNextPeriod = true,
  onPressPeriod,
  showToday = false,
  onPressToday,
  todayLabel = 'Today',
  filtersLabel = 'Filters',
}) => {
  const { colors, fontScaleMultiplier } = useTheme();
  const titleSize = (compact ? 20 : 26) * fontScaleMultiplier;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            {showPeriodNav ? (
              <Pressable
                onPress={onPrevPeriod}
                disabled={!canPrevPeriod}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Previous period"
                style={({ pressed }) => [
                  styles.chevron,
                  {
                    opacity: !canPrevPeriod ? 0.28 : pressed ? motion.pressOpacity : 0.65,
                  },
                ]}
              >
                <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
              </Pressable>
            ) : null}

            <Pressable
              onPress={onPressPeriod}
              disabled={!onPressPeriod}
              hitSlop={4}
              style={({ pressed }) => [
                styles.titleHit,
                { opacity: pressed && onPressPeriod ? motion.pressOpacity : 1 },
              ]}
              accessibilityRole={onPressPeriod ? 'button' : undefined}
            >
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.textPrimary,
                    fontSize: titleSize,
                    lineHeight: titleSize * 1.15,
                    letterSpacing: typography.letterSpacing.title,
                  },
                ]}
                numberOfLines={1}
              >
                {periodLabel}
              </Text>
            </Pressable>

            {showPeriodNav ? (
              <Pressable
                onPress={onNextPeriod}
                disabled={!canNextPeriod}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Next period"
                style={({ pressed }) => [
                  styles.chevron,
                  {
                    opacity: !canNextPeriod ? 0.28 : pressed ? motion.pressOpacity : 0.65,
                  },
                ]}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={onPressContext}
            hitSlop={6}
            style={({ pressed }) => [
              styles.contextRow,
              { opacity: pressed ? motion.pressOpacity : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={contextLabel}
          >
            <Text
              style={[
                styles.context,
                {
                  color: colors.textSecondary,
                  fontSize: (compact ? 12 : 13) * fontScaleMultiplier,
                },
              ]}
              numberOfLines={1}
            >
              {contextLabel}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.textTertiary} />
          </Pressable>
        </View>

        <View style={styles.actions}>
          {showToday && onPressToday ? (
            <Pressable
              onPress={onPressToday}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={todayLabel}
              style={({ pressed }) => [
                styles.todayPill,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.oliveBorder,
                  opacity: pressed ? motion.pressOpacity : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.todayText,
                  {
                    color: colors.primary,
                    fontSize: 12 * fontScaleMultiplier,
                  },
                ]}
              >
                {todayLabel}
              </Text>
            </Pressable>
          ) : null}
          <HeaderIconButton
            compact
            icon="options-outline"
            accessibilityLabel={filtersLabel}
            onPress={onPressFilters}
            active={filtersActive}
            badge={filtersCount > 0 ? filtersCount : undefined}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: spacing.xs,
  },
  wrapCompact: {
    paddingBottom: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginLeft: -4,
  },
  chevron: {
    width: 24,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleHit: {
    flexShrink: 1,
    maxWidth: '100%',
  },
  title: {
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 2,
    marginLeft: 2,
    maxWidth: '100%',
  },
  context: {
    fontWeight: '500',
    flexShrink: 1,
    letterSpacing: -0.1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  todayText: {
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});

export default ChronologioJournalHeader;
