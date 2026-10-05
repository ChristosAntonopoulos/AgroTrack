import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { formatOilNumber } from '../../myOil/formatOilPack';
import { cellarFlow, cellarSlices, type StockSliceKey } from '../../myOil/stockPicture';
import type { OilCommitment, OilStockSummary } from '../../services/oilStockService';
import { OilStockDonut } from './OilStockDonut';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  summary: OilStockSummary;
  /** Open and closed promises, so sold and given oil can sit beside the stock ring. */
  history?: OilCommitment[];
};

const SLICE_KEY: Record<StockSliceKey, string> = {
  free: 'hero.sliceFree',
  held: 'hero.sliceHeld',
  awaiting: 'hero.sliceAwaiting',
};

const TIN_MARKS = 8;

/** Share of a slice. A real amount that rounds to 0% is shown as <0,1%. */
const shareLabel = (pct: number, litres: number, locale: string): string => {
  if (litres > 0.05 && pct < 0.05) {
    const tiny = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(0.1);
    return `<${tiny}%`;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(pct)}%`;
};

/** A short run of square marks. The number next to them is the real count. */
function TinMarks({ count, color }: { count: number; color: string }) {
  const shown = Math.min(TIN_MARKS, Math.max(0, count));
  if (shown === 0) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: shown }, (_, index) => (
        <View
          key={index}
          style={{ width: 7, height: 7, borderRadius: 1, backgroundColor: color }}
        />
      ))}
    </View>
  );
}

/**
 * Stock in one glance: litres on hand, how they split, this year's flow, and how it is packed.
 * Actions live on the dock +, not on this page.
 */
export function OilStockHero({ summary, history = [] }: Props) {
  const { t, i18n } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const locale = i18n.language;
  const picture = useMemo(() => cellarSlices(summary), [summary]);
  const flow = useMemo(() => cellarFlow(history), [history]);
  const onHand = summary.onHand;
  const tinCount = Math.max(0, onHand.tin16) + Math.max(0, onHand.tin17);
  const tinLitres = Math.max(0, onHand.tin16) * 16 + Math.max(0, onHand.tin17) * 17;

  const sliceColor: Record<StockSliceKey, string> = {
    free: colors.primary,
    held: colors.accentGold,
    awaiting: colors.warning,
  };

  const euro = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: Math.abs(amount - Math.round(amount)) < 0.005 ? 0 : 2,
    }).format(amount);

  const litres = (amount: number) => `${formatOilNumber(amount, locale)} L`;

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.floorHero}>
        <View style={styles.heroTotalRow}>
          <Ionicons name="water" size={16} color={colors.accentGold} />
          <Text style={styles.heroTotal}>{litres(picture.total)}</Text>
        </View>
        <Text style={styles.heroCaption}>{t('hero.totalCaption')}</Text>

        <View style={styles.ringRow}>
          <View style={styles.ringWrap}>
            <OilStockDonut slices={picture.slices} colors={sliceColor} track={colors.surfaceElevated} />
            <View style={styles.ringCenter} pointerEvents="none">
              <Text style={styles.ringCenterValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {formatOilNumber(picture.total, locale)}
              </Text>
              <Text style={styles.ringCenterCaption}>{t('hero.ringTotal')}</Text>
            </View>
          </View>
          <View style={styles.ringLegend}>
            {picture.slices.map((slice) => (
              <View key={slice.key} style={styles.ringLegendItem}>
                <View style={[styles.ringDot, { backgroundColor: sliceColor[slice.key] }]} />
                <Text style={styles.ringLegendLabel} numberOfLines={1}>
                  {t(SLICE_KEY[slice.key])}
                </Text>
                <Text style={styles.ringLegendValue} numberOfLines={1}>
                  {litres(slice.litres)}
                </Text>
                <Text style={styles.ringLegendPct}>{shareLabel(slice.pct, slice.litres, locale)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.stockPanel}>
        <Text style={styles.heroEyebrow}>{t('hero.thisYear')}</Text>
        <View style={styles.yearGrid}>
          <View style={styles.yearCell}>
            <Text style={styles.yearLabel}>{t('hero.soldShort')}</Text>
            <Text style={styles.yearValue}>{litres(flow.soldLitres)}</Text>
          </View>
          <View style={styles.yearCell}>
            <Text style={styles.yearLabel}>{t('hero.givenShort')}</Text>
            <Text style={styles.yearValue}>{litres(flow.givenLitres)}</Text>
          </View>
        </View>
        <View style={styles.hairline} />
        <View style={styles.yearGrid}>
          <View style={styles.yearCell}>
            <Text style={styles.yearLabel}>{t('hero.revenue')}</Text>
            <Text style={styles.yearValue}>{euro(flow.revenue)}</Text>
          </View>
          <View style={styles.yearCell}>
            <Text style={styles.yearLabel}>{t('hero.unpaid')}</Text>
            <Text style={styles.yearValue}>{euro(flow.unpaid)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.stockPanel}>
        <Text style={styles.packTitle}>{t('hero.howPacked')}</Text>
        <View style={styles.packBlock}>
          <View style={styles.packTitleRow}>
            <Ionicons name="water-outline" size={15} color={colors.primary} />
            <Text style={styles.packName}>{t('hero.formBulk')}</Text>
          </View>
          <Text style={[styles.packLitres, styles.packIndent]}>{litres(onHand.bulkLitres)}</Text>
        </View>
        <View style={styles.packBlock}>
          <View style={styles.packTitleRow}>
            <TinMarks count={onHand.tin16} color={colors.accentGold} />
            <Text style={styles.packName}>{t('hero.tin16Title')}</Text>
          </View>
          <View style={styles.packFigureRow}>
            <Text style={styles.packPieces}>{t('hero.pieces', { count: onHand.tin16 })}</Text>
            <Text style={styles.packLitres}>{litres(Math.max(0, onHand.tin16) * 16)}</Text>
          </View>
        </View>
        <View style={styles.packBlock}>
          <View style={styles.packTitleRow}>
            <TinMarks count={onHand.tin17} color={colors.warning} />
            <Text style={styles.packName}>{t('hero.tin17Title')}</Text>
          </View>
          <View style={styles.packFigureRow}>
            <Text style={styles.packPieces}>{t('hero.pieces', { count: onHand.tin17 })}</Text>
            <Text style={styles.packLitres}>{litres(Math.max(0, onHand.tin17) * 17)}</Text>
          </View>
        </View>
        {tinCount > 0 ? (
          <>
            <View style={styles.hairline} />
            <View style={styles.packFigureRow}>
              <Text style={styles.packTotal}>{t('hero.tins', { count: tinCount })}</Text>
              <Text style={styles.packLitres}>{litres(tinLitres)}</Text>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}
