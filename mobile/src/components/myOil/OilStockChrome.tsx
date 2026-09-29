import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { formatHeroStock, formatOilPack } from '../../myOil/formatOilPack';
import {
  isHouseholdCommitment,
  movementActionKey,
  sumCommitmentPack,
  tinCount,
} from '../../myOil/commitmentCopy';
import type { OilCommitment, OilStockSummary, StockMovement } from '../../services/oilStockService';
import type { PackLabels } from './types';
import { createMyOilStyles } from './myOilStyles';

type ActivityProps = {
  summary: OilStockSummary;
  waiting: OilCommitment[];
  latestMove?: StockMovement | null;
  packLabels: PackLabels;
  formatDate: (iso: string) => string;
};

export function OilStockActivityBar({
  summary,
  waiting,
  latestMove,
  packLabels,
  formatDate,
}: ActivityProps) {
  const { t, i18n } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const locale = i18n.language;
  const available = summary.available;
  const homeHeld = sumCommitmentPack(summary.openCommitments.filter(isHouseholdCommitment));
  const thirdParty = waiting.filter((c) => !isHouseholdCommitment(c));
  const held = thirdParty.filter((c) => c.derivedStatus === 'reserved').length;
  const pending = thirdParty.filter((c) => c.derivedStatus === 'pending_delivery').length;

  const warehouseLine = formatHeroStock(available, locale, {
    tins: (count) => t('hero.tins', { count }),
    bulkPlus: (amount) => t('hero.bulkPlus', { amount }),
    bulkOnly: (amount) => t('hero.bulkOnly', { amount }),
    empty: t('hero.zero'),
  });

  const hasHome = tinCount(homeHeld) > 0 || homeHeld.bulkLitres > 0.05;
  const homeLine = hasHome ? formatOilPack(homeHeld, packLabels) : t('activity.householdEmpty');

  const othersLine =
    held === 0 && pending === 0
      ? t('activity.noneHeld')
      : t('activity.heldPending', { held, pending });

  let lastMove = t('activity.lastMoveEmpty');
  if (latestMove) {
    const action = movementActionKey(latestMove.kind);
    lastMove = `${t(`timeline.${action}`)} · ${formatDate(latestMove.occurredOn)}`;
  }

  const next =
    thirdParty.length > 0
      ? t('activity.nextPerson', {
          name: thirdParty[0].counterpartyName,
          pack: formatOilPack(thirdParty[0].remaining, packLabels),
        })
      : t('activity.nextNone');

  const pills: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    value: string;
  }[] = [
    { icon: 'business-outline', label: t('activity.warehouse'), value: warehouseLine },
    { icon: 'home-outline', label: t('activity.household'), value: homeLine },
    { icon: 'bookmark-outline', label: t('activity.holds'), value: othersLine },
    {
      icon: thirdParty.length ? 'car-outline' : 'time-outline',
      label: t('activity.nextAction'),
      value: next || lastMove,
    },
  ];

  return (
    <View style={styles.activity} accessibilityLabel={t('activity.title')}>
      <Text style={styles.activityTitle}>{t('activity.title')}</Text>
      <View style={styles.activityRow}>
        {pills.map((p) => (
          <View key={p.label} style={styles.activityPill}>
            <View style={styles.activityIconWell}>
              <Ionicons name={p.icon} size={15} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.activityLabel}>{p.label}</Text>
              <Text style={styles.activityValue} numberOfLines={2}>
                {p.value}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function OilStockPageHeader({ season }: { season: string }) {
  const { t } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const support = t('pageSupport');
  return (
    <View style={styles.header}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {support ? <Text style={styles.sectionIntro}>{support}</Text> : null}
      </View>
      <View style={styles.seasonBadge}>
        <Text style={styles.seasonText}>{t('seasonLabel', { season })}</Text>
      </View>
    </View>
  );
}

export function OilSectionHeader({
  titleKey,
  introKey,
  icon,
}: {
  titleKey: string;
  introKey?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const { t } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionTitle}>
        {icon ? <Ionicons name={icon} size={14} color={colors.primary} /> : null}
        <Text style={styles.sectionTitleText}>{t(titleKey)}</Text>
      </View>
      {introKey ? <Text style={styles.sectionIntro}>{t(introKey)}</Text> : null}
    </View>
  );
}
