import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { formatLitres } from '../../finance/format';
import { harvestYearSpan } from '../../finance/harvestYear';
import type { OilLot } from '../../services/oilStockService';
import { spacing, typography } from '../../theme';

type Props = {
  year: number;
  lots: OilLot[];
  fieldNames: Record<string, string>;
  locale: string;
  onOpenMyOil?: () => void;
};

const formatWhen = (iso: string, locale: string): string => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
};

const packLabel = (
  lot: Pick<OilLot, 'available'>,
  t: (key: string, options?: Record<string, unknown>) => string,
  locale: string
): string => {
  const pack = lot.available;
  const bits: string[] = [];
  if (pack.tin16 > 0) bits.push(t('unsoldTin', { count: pack.tin16, size: 16 }));
  if (pack.tin17 > 0) bits.push(t('unsoldTin', { count: pack.tin17, size: 17 }));
  if (pack.bulkLitres > 0.05 && (pack.tin16 > 0 || pack.tin17 > 0)) {
    bits.push(t('unsoldBulk', { amount: formatLitres(pack.bulkLitres, locale, '—') }));
  }
  if (bits.length === 0) return formatLitres(pack.litres, locale, '—');
  return bits.join(' · ');
};

/** Oil still free in the signed-in user's cellar (server stock). */
const UnsoldOilStock: React.FC<Props> = ({ year, lots, fieldNames, locale, onOpenMyOil }) => {
  const { t } = useTranslation(['money', 'myOil']);
  const { colors } = useTheme();
  const available = lots.filter((lot) => (lot.available?.litres || 0) > 0.05);
  if (available.length === 0) return null;

  const thisYear = available.filter((lot) => lot.resultYear === year);
  const other = available.filter((lot) => lot.resultYear !== year);
  const totalLitres = available.reduce((sum, lot) => sum + (lot.available.litres || 0), 0);
  const showGroups = thisYear.length > 0 && other.length > 0;

  const renderLots = (rows: OilLot[]) =>
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
            index > 0
              ? { borderTopColor: colors.borderLight, borderTopWidth: StyleSheet.hairlineWidth }
              : null,
          ]}
        >
          <View style={styles.lotCopy}>
            <Text style={[styles.when, { color: colors.textPrimary }]}>
              {formatWhen(lot.pressedOn, locale)}
            </Text>
            {where ? (
              <Text style={[styles.where, { color: colors.textSecondary }]} numberOfLines={2}>
                {where}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.pack, { color: colors.textPrimary }]}>{packLabel(lot, t, locale)}</Text>
        </View>
      );
    });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('money:unsoldTitle')}</Text>
          <Text style={[styles.kicker, { color: colors.textSecondary }]}>{t('money:unsoldHint')}</Text>
        </View>
        <Text style={[styles.total, { color: colors.textPrimary }]}>
          {formatLitres(totalLitres, locale, '—')}
        </Text>
      </View>
      {thisYear.length > 0 ? (
        <View style={styles.group}>
          {showGroups ? (
            <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
              {t('money:unsoldThisYear')}
            </Text>
          ) : null}
          {renderLots(thisYear)}
        </View>
      ) : null}
      {[...new Set(other.map((l) => l.resultYear))]
        .sort((a, b) => b - a)
        .map((y) => (
          <View key={y} style={styles.group}>
            <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
              {t('money:unsoldYear', { span: harvestYearSpan(y) })}
            </Text>
            {renderLots(other.filter((l) => l.resultYear === y))}
          </View>
        ))}
      {onOpenMyOil ? (
        <Pressable onPress={onOpenMyOil} style={styles.link}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('myOil:seeMyOil')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title: { ...typography.styles.body, fontWeight: '700' },
  kicker: { fontSize: 13, marginTop: 2 },
  total: { fontSize: 18, fontWeight: '800' },
  group: { gap: 0 },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 6,
  },
  lot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 10,
  },
  lotCopy: { flex: 1, gap: 2 },
  when: { fontWeight: '650' as '600', fontSize: 14 },
  where: { fontSize: 12 },
  pack: { fontWeight: '700', fontSize: 14 },
  link: { paddingTop: 8 },
});

export default UnsoldOilStock;
