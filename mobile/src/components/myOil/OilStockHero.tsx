import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
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
  busy?: boolean;
  onGive: () => void;
  onSell: () => void;
  onHold: () => void;
  onFill: () => void;
};

const SLICE_KEY: Record<StockSliceKey, string> = {
  free: 'hero.sliceFree',
  held: 'hero.sliceHeld',
  awaiting: 'hero.sliceAwaiting',
};

/**
 * The cellar in one glance: how much is here, how it splits, and the four things you came to do.
 */
export function OilStockHero({
  summary,
  history = [],
  busy = false,
  onGive,
  onSell,
  onHold,
  onFill,
}: Props) {
  const { t, i18n } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const locale = i18n.language;
  const picture = useMemo(() => cellarSlices(summary), [summary]);
  const flow = useMemo(() => cellarFlow(history), [history]);
  const onHand = summary.onHand;
  const tinCount = Math.max(0, onHand.tin16) + Math.max(0, onHand.tin17);

  const sliceColor: Record<StockSliceKey, string> = {
    free: colors.primary,
    held: colors.accentGold,
    awaiting: colors.warning,
  };

  const pctLabel = (pct: number) =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(pct)}%`;

  const euro = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: Math.abs(amount - Math.round(amount)) < 0.005 ? 0 : 2,
    }).format(amount);

  const legend = picture.slices.filter((slice) => slice.key !== 'awaiting' || slice.litres > 0.05);
  const ring = legend.filter((slice) => slice.litres > 0.05);

  const verbs: {
    key: string;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    primary: boolean;
    onPress: () => void;
  }[] = [
    { key: 'fill', label: t('actions.fillVerb'), icon: 'cube-outline', primary: true, onPress: onFill },
    { key: 'sell', label: t('actions.sell'), icon: 'cash-outline', primary: true, onPress: onSell },
    { key: 'give', label: t('actions.verbGive'), icon: 'water-outline', primary: false, onPress: onGive },
    { key: 'hold', label: t('actions.hold'), icon: 'bookmark-outline', primary: false, onPress: onHold },
  ];

  const formRows = [
    { key: 'bulk', label: t('hero.formBulk'), value: `${formatOilNumber(onHand.bulkLitres, locale)} L` },
    { key: '16', label: t('hero.form16'), value: t('hero.pieces', { count: onHand.tin16 }) },
    { key: '17', label: t('hero.form17'), value: t('hero.pieces', { count: onHand.tin17 }) },
    { key: 'tins', label: t('hero.formTins'), value: t('hero.pieces', { count: tinCount }) },
  ];

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.floorHero}>
        <Text style={styles.heroEyebrow}>{t('hero.totalInCellar')}</Text>
        <Text style={styles.heroTotal}>{formatOilNumber(picture.total, locale)} L</Text>
        <View style={styles.ringRow}>
          <View style={styles.ringWrap}>
            <OilStockDonut
              slices={ring}
              colors={sliceColor}
              track={colors.surfaceMuted}
            />
            <View style={styles.ringCenter} pointerEvents="none">
              <Text style={styles.ringCenterValue} numberOfLines={1}>
                {formatOilNumber(picture.total, locale)}
              </Text>
              <Text style={styles.ringCenterCaption}>{t('hero.ringTotal')}</Text>
            </View>
          </View>
          <View style={styles.ringLegend}>
            {legend.map((slice) => (
              <View key={slice.key} style={styles.ringLegendItem}>
                <View style={[styles.ringDot, { backgroundColor: sliceColor[slice.key] }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.ringLegendTop}>
                    <Text style={styles.ringLegendLabel} numberOfLines={1}>
                      {t(SLICE_KEY[slice.key])}
                    </Text>
                    <Text style={styles.ringLegendPct}>{pctLabel(slice.pct)}</Text>
                  </View>
                  <Text style={styles.ringLegendValue} numberOfLines={1}>
                    {formatOilNumber(slice.litres, locale)} L
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.flowStrip}>
        <View style={styles.flowCell}>
          <Text style={styles.flowLabel}>{t('hero.soldThisYear')}</Text>
          <Text style={styles.flowValue}>{formatOilNumber(flow.soldLitres, locale)} L</Text>
        </View>
        <View style={styles.flowCell}>
          <Text style={styles.flowLabel}>{t('hero.given')}</Text>
          <Text style={styles.flowValue}>{formatOilNumber(flow.givenLitres, locale)} L</Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.heroEyebrow}>{t('hero.formTitle')}</Text>
        {formRows.map((row) => (
          <View key={row.key} style={styles.formRow}>
            <Text style={styles.formLabel}>{row.label}</Text>
            <Text style={styles.formValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.heroEyebrow}>{t('hero.moneyTitle')}</Text>
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>{t('hero.revenue')}</Text>
          <Text style={styles.formValue}>{euro(flow.revenue)}</Text>
        </View>
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>{t('hero.unpaid')}</Text>
          <Text style={styles.formValue}>{euro(flow.unpaid)}</Text>
        </View>
      </View>

      <View style={styles.verbRow}>
        {verbs.map((verb) => (
          <Pressable
            key={verb.key}
            disabled={busy}
            onPress={verb.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.verb,
              verb.primary ? styles.verbOn : styles.verbOff,
              (pressed || busy) && { opacity: 0.88 },
            ]}
          >
            <Ionicons
              name={verb.icon}
              size={20}
              color={verb.primary ? colors.onOlive : colors.primary}
            />
            <Text
              style={[styles.verbLabel, verb.primary ? styles.verbLabelOn : styles.verbLabelOff]}
              numberOfLines={2}
            >
              {verb.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
