import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { formatLitres } from '../../finance/format';
import { harvestYearSpan } from '../../finance/harvestYear';
import {
  groupUnsoldOil,
  sumUnsoldOil,
  type UnsoldOilLot,
} from '../../finance/unsoldOilStock';
import { spacing, typography } from '../../theme';

type Props = {
  year: number;
  lots: UnsoldOilLot[];
  fieldNames: Record<string, string>;
  locale: string;
};

const formatWhen = (date: string, locale: string): string => {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
};

const packLabel = (
  lot: Pick<UnsoldOilLot, 'tin16' | 'tin17' | 'bulkLitres' | 'litres'>,
  t: (key: string, options?: Record<string, unknown>) => string,
  locale: string
): string => {
  const bits: string[] = [];
  if (lot.tin16 > 0) bits.push(t('unsoldTin', { count: lot.tin16, size: 16 }));
  if (lot.tin17 > 0) bits.push(t('unsoldTin', { count: lot.tin17, size: 17 }));
  if (lot.bulkLitres > 0.05 && (lot.tin16 > 0 || lot.tin17 > 0)) {
    bits.push(t('unsoldBulk', { amount: formatLitres(lot.bulkLitres, locale, '—') }));
  }
  if (bits.length === 0) return formatLitres(lot.litres, locale, '—');
  return bits.join(' · ');
};

const UnsoldOilStock: React.FC<Props> = ({ year, lots, fieldNames, locale }) => {
  const { t } = useTranslation('money');
  const { colors } = useTheme();
  if (lots.length === 0) return null;

  const totals = sumUnsoldOil(lots);
  const { thisYear, otherYears } = groupUnsoldOil(lots, year);
  const showGroups = thisYear.length > 0 && otherYears.length > 0;
  const showPack = totals.tin16 > 0 || totals.tin17 > 0;
  const pack = (lot: Pick<UnsoldOilLot, 'tin16' | 'tin17' | 'bulkLitres' | 'litres'>) =>
    packLabel(lot, t, locale);

  const renderLots = (rows: UnsoldOilLot[]) =>
    rows.map((lot, index) => {
      const where = lot.fieldIds
        .map((id) => fieldNames[id])
        .filter(Boolean)
        .join(' · ');
      return (
        <View
          key={lot.id}
          style={[
            styles.lot,
            index > 0 ? { borderTopColor: colors.borderLight, borderTopWidth: StyleSheet.hairlineWidth } : null,
          ]}
        >
          <View style={styles.lotCopy}>
            <Text style={[styles.when, { color: colors.textPrimary }]}>{formatWhen(lot.date, locale)}</Text>
            {where ? (
              <Text style={[styles.where, { color: colors.textSecondary }]} numberOfLines={2}>
                {where}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.pack, { color: colors.textPrimary }]}>{pack(lot)}</Text>
        </View>
      );
    });

  return (
    <View
      accessibilityLabel={t('unsoldTitle')}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
    >
      <View style={styles.head}>
        <View style={styles.headCopy}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('unsoldTitle')}</Text>
          <Text style={[styles.kicker, { color: colors.textSecondary }]}>{t('unsoldHint')}</Text>
        </View>
        <Text style={[styles.total, { color: colors.textPrimary }]}>
          {formatLitres(totals.litres, locale, '—')}
        </Text>
      </View>
      {showPack ? (
        <Text style={[styles.packLine, { color: colors.textSecondary }]}>
          {pack({ ...totals, litres: totals.litres })}
        </Text>
      ) : null}
      {thisYear.length > 0 ? (
        <View style={styles.group}>
          {showGroups ? (
            <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>{t('unsoldThisYear')}</Text>
          ) : null}
          {renderLots(thisYear)}
        </View>
      ) : null}
      {otherYears.map((group) => (
        <View key={group.harvestYear} style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>
            {t('unsoldYear', { span: harvestYearSpan(group.harvestYear) })}
          </Text>
          {renderLots(group.lots)}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.base,
    gap: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  headCopy: { flex: 1, gap: 4 },
  title: { fontWeight: '700', fontSize: 18 },
  kicker: { ...typography.styles.caption, lineHeight: 18 },
  total: { fontWeight: '700', fontSize: 22, fontVariant: ['tabular-nums'] },
  packLine: { fontVariant: ['tabular-nums'], fontWeight: '600' },
  group: { gap: 0 },
  groupTitle: {
    ...typography.styles.overline,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  lot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  lotCopy: { flex: 1, gap: 2 },
  when: { fontWeight: '600' },
  where: { ...typography.styles.caption },
  pack: { fontWeight: '600', fontVariant: ['tabular-nums'], textAlign: 'right', flexShrink: 1 },
});

export default UnsoldOilStock;
