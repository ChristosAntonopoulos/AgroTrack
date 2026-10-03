import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { appFonts, motion, spacing } from '../../theme';
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
  filtersLabel?: string;
  onPressCapture?: () => void;
  captureLabel?: string;
};

/**
 * Period masthead — same row as Χρήματα: circular controls, one title.
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
  filtersLabel = 'Filters',
  onPressCapture,
  captureLabel = 'New record',
}) => {
  const { colors, fontScaleMultiplier } = useTheme();
  const { t } = useTranslation('common');
  const titleSize = (compact ? 20 : 22) * fontScaleMultiplier;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.topRow}>
        {showPeriodNav ? (
          <HeaderIconButton
            icon="chevron-back"
            accessibilityLabel={t('previous', { defaultValue: 'Previous' })}
            onPress={() => onPrevPeriod?.()}
            disabled={!canPrevPeriod}
          />
        ) : null}

        <View style={styles.titleBlock}>
          <Pressable
            onPress={onPressPeriod}
            disabled={!onPressPeriod}
            hitSlop={4}
            style={({ pressed }) => [
              styles.titleHit,
              { opacity: pressed && onPressPeriod ? motion.pressOpacity : 1 },
            ]}
            accessibilityRole={onPressPeriod ? 'button' : 'header'}
          >
            <Text
              style={[
                styles.title,
                {
                  color: colors.textPrimary,
                  fontSize: titleSize,
                  lineHeight: titleSize * 1.2,
                },
              ]}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {periodLabel}
            </Text>
          </Pressable>

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
            <Ionicons name="chevron-down" size={14} color={colors.textTertiary} />
          </Pressable>
        </View>

        {showPeriodNav ? (
          <HeaderIconButton
            icon="chevron-forward"
            accessibilityLabel={t('next', { defaultValue: 'Next' })}
            onPress={() => onNextPeriod?.()}
            disabled={!canNextPeriod}
          />
        ) : null}
        {onPressCapture ? (
          <HeaderIconButton
            icon="add"
            accessibilityLabel={captureLabel}
            onPress={onPressCapture}
          />
        ) : null}
        <HeaderIconButton
          icon="options-outline"
          accessibilityLabel={filtersLabel}
          onPress={onPressFilters}
          active={filtersActive}
          badge={filtersCount > 0 ? filtersCount : undefined}
        />
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
    gap: spacing.sm,
    minHeight: 44,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  titleHit: {
    alignSelf: 'stretch',
  },
  title: {
    fontFamily: appFonts.bold,
    fontWeight: '700',
    letterSpacing: -0.2,
    textTransform: 'capitalize',
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 1,
    maxWidth: '100%',
  },
  context: {
    fontFamily: appFonts.medium,
    fontWeight: '500',
    flexShrink: 1,
    letterSpacing: -0.1,
  },
});

export default ChronologioJournalHeader;
