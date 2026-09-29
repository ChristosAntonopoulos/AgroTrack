import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { formatHeroStock, formatOilNumber } from '../../myOil/formatOilPack';
import {
  isHouseholdCommitment,
  sumHouseholdPack,
  tinCount,
  visibleHouseholdCommitments,
} from '../../myOil/commitmentCopy';
import type { OilCommitment, OilStockSummary } from '../../services/oilStockService';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  summary: OilStockSummary;
  closed?: OilCommitment[];
  onOpenHome: () => void;
  onOpenHolds: () => void;
};

/** Compact cellar total — litres first, pack line once, two status chips. */
export function OilStockHero({ summary, closed = [], onOpenHome, onOpenHolds }: Props) {
  const { t, i18n } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const locale = i18n.language;
  const physical = summary.physical;

  const homeHeld = sumHouseholdPack(visibleHouseholdCommitments(summary.openCommitments, closed));
  const thirdParty = summary.openCommitments.filter((c) => !isHouseholdCommitment(c));
  const pending = thirdParty.filter((c) => c.derivedStatus === 'pending_delivery').length;
  const held = thirdParty.filter((c) => c.derivedStatus === 'reserved').length;
  const homeTins = tinCount(homeHeld);
  const hasHome = homeTins > 0 || homeHeld.bulkLitres > 0.05;

  const packLine = formatHeroStock(physical, locale, {
    tins: (count) => t('hero.tins', { count }),
    bulkPlus: (amount) => t('hero.bulkPlus', { amount }),
    bulkOnly: (amount) => t('hero.bulkOnly', { amount }),
    empty: t('hero.empty'),
  }).replace(' + ', ' · ');

  const homeValue = hasHome
    ? homeTins > 0
      ? t('hero.tins', { count: homeTins })
      : t('hero.bulkOnly', { amount: formatOilNumber(homeHeld.bulkLitres, locale) })
    : t('hero.householdEmpty');

  const holdsValue =
    pending > 0
      ? t('hero.pendingCount', { count: pending })
      : held > 0
        ? t('hero.heldCount', { count: held })
        : t('hero.holdsEmpty');

  return (
    <View style={styles.heroCompact}>
      <Text style={styles.heroEyebrow}>{t('hero.eyebrow')}</Text>
      <Text style={styles.heroTotal}>
        {t('hero.approxTotal', { amount: formatOilNumber(physical.litres || 0, locale) })}
      </Text>
      <Text style={styles.heroPackLine}>{packLine}</Text>

      <View style={styles.heroStatusRow}>
        <Pressable onPress={onOpenHome} style={styles.heroStatusCard}>
          <View style={styles.heroStatusLabel}>
            <Ionicons name="home-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.heroStatusLabelText}>{t('hero.household')}</Text>
          </View>
          <Text style={styles.heroStatusValue}>{homeValue}</Text>
        </Pressable>
        <Pressable onPress={onOpenHolds} style={styles.heroStatusCard}>
          <View style={styles.heroStatusLabel}>
            <Ionicons name="bookmark-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.heroStatusLabelText}>{t('hero.holds')}</Text>
          </View>
          <Text style={styles.heroStatusValue}>{holdsValue}</Text>
        </Pressable>
      </View>
    </View>
  );
}
