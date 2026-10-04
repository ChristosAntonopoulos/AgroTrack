import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { YearFinancialSummary } from '../../services/financialSummaryService';
import { formatLitres, formatOfficialAmount, formatOfficialNet } from '../../finance/format';
import { createElevation, radii, spacing, typography } from '../../theme';

type Props = {
  summary: YearFinancialSummary;
  oilLitres: number;
  locale: string;
  hideIncome?: boolean;
  onAdd?: () => void;
  onOpenOil?: () => void;
};

type Tile = {
  key: string;
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string;
  onPress?: () => void;
};

/** Income, expenses, and oil still in the cellar — one card, watermarked tiles, one add. */
const MoneyStatGrid: React.FC<Props> = ({
  summary,
  oilLitres,
  locale,
  hideIncome,
  onAdd,
  onOpenOil,
}) => {
  const { t } = useTranslation('money');
  const { colors, fontScaleMultiplier, tapMin } = useTheme();
  const currency = summary.currency || 'EUR';
  const dash = '—';
  const money = (amount: number | null) =>
    amount == null ? dash : formatOfficialAmount(amount, currency, locale, dash);

  const tiles: Tile[] = [
    ...(!hideIncome
      ? [
          {
            key: 'income',
            label: t('income'),
            value: money(summary.totalIncome),
            icon: 'trending-up' as const,
            tint: colors.eventIncome,
          },
        ]
      : []),
    {
      key: 'expenses',
      label: t('expenses'),
      value: money(summary.totalExpenses),
      icon: 'trending-down',
      tint: colors.eventExpense,
    },
    {
      key: 'oil',
      label: t('availableOil'),
      value: formatLitres(oilLitres, locale, dash),
      icon: 'water',
      tint: colors.accentGold,
      onPress: onOpenOil,
    },
  ];

  const net = summary.netResult;
  const netColor =
    net == null ? colors.textSecondary : net < 0 ? colors.eventExpense : net > 0 ? colors.eventIncome : colors.textPrimary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'flat'),
        },
      ]}
    >
      <View style={styles.grid}>
        {tiles.map((tile) => {
          const body = (
            <>
              <Ionicons
                name={tile.icon}
                size={64}
                color={tile.tint}
                style={styles.watermark}
              />
              <View style={[styles.iconWell, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={tile.icon} size={16} color={tile.tint} />
              </View>
              <Text style={[styles.kicker, { color: colors.textTertiary }]} numberOfLines={2}>
                {tile.label}
              </Text>
              <Text
                style={[styles.value, { color: colors.textPrimary, fontSize: 18 * fontScaleMultiplier }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {tile.value}
              </Text>
            </>
          );
          const tileStyle = [
            styles.tile,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.borderLight,
              minHeight: Math.max(96, tapMin),
            },
          ];
          if (!tile.onPress) {
            return (
              <View key={tile.key} style={tileStyle}>
                {body}
              </View>
            );
          }
          return (
            <Pressable
              key={tile.key}
              onPress={tile.onPress}
              accessibilityRole="button"
              accessibilityLabel={tile.label}
              style={tileStyle}
            >
              {body}
            </Pressable>
          );
        })}
      </View>

      {!hideIncome && summary.dataAvailability.hasPostedRecords ? (
        <Text style={[styles.result, { color: netColor, fontSize: 13 * fontScaleMultiplier }]}>
          {t('result')} {formatOfficialNet(net, currency, locale, dash)}
        </Text>
      ) : null}

      {onAdd ? (
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={t('addEntry')}
          style={({ pressed }) => [
            styles.add,
            {
              backgroundColor: colors.primary,
              minHeight: Math.max(52, tapMin),
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Ionicons name="add" size={22} color={colors.onOlive} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.addTitle, { color: colors.onOlive, fontSize: 16 * fontScaleMultiplier }]}>
              {t('addEntry')}
            </Text>
            <Text style={[styles.addHint, { color: colors.onOlive }]}>{t('addEntryHint')}</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.dock,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
    overflow: 'hidden',
    gap: 4,
  },
  watermark: {
    position: 'absolute',
    right: -10,
    bottom: -14,
    opacity: 0.14,
  },
  iconWell: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    ...typography.styles.overline,
    marginTop: 4,
  },
  value: {
    fontWeight: '700',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  result: {
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addTitle: { fontWeight: '700' },
  addHint: { fontSize: 12, fontWeight: '500', opacity: 0.85 },
});

export default MoneyStatGrid;
