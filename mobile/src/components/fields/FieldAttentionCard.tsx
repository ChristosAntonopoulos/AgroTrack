import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { FieldAttentionModel } from '../../utils/fieldOverviewAttention';
import { formatCompactDate, numberLocaleFor } from '../../utils/fieldDisplay';
import { typography } from '../../theme';
import FieldOverviewCard from './FieldOverviewCard';

type Props = {
  attention: FieldAttentionModel;
  onPrimary: () => void;
  onKeepDate?: (taskId: string) => void;
};

/**
 * Needs-now card — same attention model as web, limestone chrome as YearGlance.
 */
const FieldAttentionCard: React.FC<Props> = ({ attention, onPrimary, onKeepDate }) => {
  const { t, i18n } = useTranslation('fields');
  const { colors } = useTheme();
  const locale = numberLocaleFor(i18n.language);

  const windowLabel =
    attention.window && !Number.isNaN(new Date(attention.window).getTime())
      ? formatCompactDate(attention.window, locale)
      : attention.window;

  const title =
    attention.kind === 'none'
      ? t(
          attention.id === 'draft'
            ? 'overview.attention.draftTitle'
            : 'overview.attention.noneTitle'
        )
      : attention.title;

  const explanation = t(attention.explanationKey, attention.explanationParams as Record<string, string>);

  const accent =
    attention.severity === 'critical'
      ? colors.error
      : attention.severity === 'warning'
        ? colors.warning
        : attention.severity === 'ok'
          ? colors.oliveBorder
          : colors.primary;

  const showPrimary =
    attention.primaryAction &&
    attention.primaryAction !== 'none' &&
    Boolean(attention.primaryKey);

  return (
    <FieldOverviewCard accentColor={accent}>
      <Text style={[styles.kicker, { color: colors.textTertiary }]}>
        {t('overview.needsNow')}
      </Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{explanation}</Text>
      {windowLabel ? (
        <Text style={[styles.meta, { color: colors.textTertiary }]}>{windowLabel}</Text>
      ) : null}
      {attention.reason ? (
        <Text style={[styles.meta, { color: colors.textTertiary }]}>{attention.reason}</Text>
      ) : null}

      <View style={styles.actions}>
        {showPrimary ? (
          <Pressable
            onPress={onPrimary}
            style={[styles.primaryBtn, { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder }]}
            hitSlop={4}
          >
            <Text style={[styles.primaryText, { color: colors.primary }]}>
              {t(attention.primaryKey)}
            </Text>
          </Pressable>
        ) : null}
        {attention.secondaryKey && attention.taskId ? (
          <Pressable
            onPress={() => onKeepDate?.(attention.taskId!)}
            style={styles.secondaryBtn}
            hitSlop={4}
          >
            <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>
              {t(attention.secondaryKey)}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </FieldOverviewCard>
  );
};

const styles = StyleSheet.create({
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.styles.body,
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  primaryBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  primaryText: {
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  secondaryText: {
    fontWeight: '600',
    fontSize: 13,
  },
});

export default FieldAttentionCard;
