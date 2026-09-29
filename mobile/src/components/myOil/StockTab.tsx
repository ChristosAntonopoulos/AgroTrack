import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { formatHeroStock, formatOilNumber, formatOilPack } from '../../myOil/formatOilPack';
import {
  sumHouseholdPack,
  tinCount,
  visibleHouseholdCommitments,
} from '../../myOil/commitmentCopy';
import type { OilCommitment, OilStockSummary } from '../../services/oilStockService';
import type { PackLabels } from './types';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  summary: OilStockSummary;
  closed?: OilCommitment[];
  packLabels: PackLabels;
  onSetAside: () => void;
  onManageHome: () => void;
};

/** Physical stock: 16L, 17L, bulk, and home allocation. */
export function StockTab({ summary, closed = [], packLabels, onSetAside, onManageHome }: Props) {
  const { t, i18n } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const locale = i18n.language;
  const { physical, available } = summary;
  const held16 = Math.max(0, physical.tin16 - available.tin16);
  const held17 = Math.max(0, physical.tin17 - available.tin17);

  const packLine = formatHeroStock(available, locale, {
    tins: (count) => t('hero.tins', { count }),
    bulkPlus: (amount) => t('hero.bulkPlus', { amount }),
    bulkOnly: (amount) => t('hero.bulkOnly', { amount }),
    empty: t('hero.zero'),
  }).replace(' + ', ' · ');

  const homeHeld = sumHouseholdPack(visibleHouseholdCommitments(summary.openCommitments, closed));
  const hasHome = tinCount(homeHeld) > 0 || homeHeld.bulkLitres > 0.05;

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.stockHero}>
        <Text style={styles.stockEyebrow}>{t('stock.title')}</Text>
        <Text style={styles.stockHeroAmount}>
          {t('hero.approxTotal', { amount: formatOilNumber(available.litres || 0, locale) })}
        </Text>
        <Text style={styles.stockHeroPack}>{packLine}</Text>
        <Text style={styles.stockHeroNote}>{t('warehouse.readyNote')}</Text>
      </View>

      <View style={styles.stockGrid}>
        {(physical.tin16 > 0 || available.tin16 > 0) && (
          <View style={styles.stockCard}>
            <Text style={styles.stockCardLabel}>{t('warehouse.pack16')}</Text>
            <Text style={styles.stockCardValue}>{available.tin16}</Text>
            <Text style={styles.stockCardMeta}>{t('stock.available')}</Text>
            {held16 > 0 ? (
              <View style={styles.stockHeldPill}>
                <Text style={styles.stockHeldText}>{t('warehouse.heldCount', { count: held16 })}</Text>
              </View>
            ) : null}
          </View>
        )}
        {(physical.tin17 > 0 || available.tin17 > 0) && (
          <View style={styles.stockCard}>
            <Text style={styles.stockCardLabel}>{t('warehouse.pack17')}</Text>
            <Text style={styles.stockCardValue}>{available.tin17}</Text>
            <Text style={styles.stockCardMeta}>{t('stock.available')}</Text>
            {held17 > 0 ? (
              <View style={styles.stockHeldPill}>
                <Text style={styles.stockHeldText}>{t('warehouse.heldCount', { count: held17 })}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {(physical.bulkLitres > 0.05 || available.bulkLitres > 0.05) && (
        <View style={styles.stockBulk}>
          <View style={styles.stockBulkIcon}>
            <Ionicons name="water-outline" size={18} color={colors.accentGold} />
          </View>
          <View style={styles.stockBulkCopy}>
            <Text style={styles.stockCardLabel}>{t('warehouse.packBulk')}</Text>
            <Text style={styles.stockCardMeta}>{t('stock.available')}</Text>
          </View>
          <Text style={styles.stockBulkValue}>{formatOilNumber(available.bulkLitres, locale)} L</Text>
        </View>
      )}

      <View style={styles.stockHome}>
        <View style={styles.stockHomeHead}>
          <View style={styles.sectionTitle}>
            <Ionicons name="home-outline" size={15} color={colors.primary} />
            <Text style={styles.sectionTitleText}>{t('household.title')}</Text>
          </View>
          {hasHome ? (
            <Pressable onPress={onManageHome} hitSlop={8} accessibilityRole="button">
              <Text style={styles.linkishText}>{t('household.manage')}</Text>
            </Pressable>
          ) : null}
        </View>
        {hasHome ? (
          <>
            <Text style={styles.householdBannerQty}>{formatOilPack(homeHeld, packLabels)}</Text>
            <Text style={[styles.householdBannerNote, { color: colors.textSecondary }]}>
              {t('household.totalLitres', {
                amount: formatOilNumber(homeHeld.litres, locale),
                defaultValue: `${formatOilNumber(homeHeld.litres, locale)} L total`,
              })}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.emptyBody}>{t('household.empty')}</Text>
            <Pressable onPress={onSetAside} style={[styles.btnSecondary, styles.btnSm, { marginTop: 10 }]}>
              <Text style={styles.btnSecondaryText}>{t('household.setAsideCta')}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
