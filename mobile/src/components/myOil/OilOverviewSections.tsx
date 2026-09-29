import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { formatOilPack, formatOilNumber, formatHeroStock } from '../../myOil/formatOilPack';
import {
  commitmentStoryKey,
  isHouseholdCommitment,
  sumCommitmentPack,
  tinCount,
} from '../../myOil/commitmentCopy';
import { commitmentFieldLabel } from '../../myOil/fieldPools';
import { OilSectionHeader } from './OilStockChrome';
import type { OilCommitment, OilLot, OilPack, OilStockSummary } from '../../services/oilStockService';
import type { PackLabels } from './types';
import { createMyOilStyles } from './myOilStyles';

type PendingProps = {
  waiting: OilCommitment[];
  lots?: OilLot[];
  fieldNames?: Record<string, string>;
  packLabels: PackLabels;
  onOpen: () => void;
  formatDate: (iso: string) => string;
};

export function OilPendingSection({
  waiting,
  lots = [],
  fieldNames = {},
  packLabels,
  onOpen,
  formatDate,
}: PendingProps) {
  const { t } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const first = waiting[0];

  const storyFor = (c: OilCommitment) => {
    const key = commitmentStoryKey(c);
    if (key === 'heldForDate' && c.promisedFor) {
      return t('story.heldForDate', { date: formatDate(c.promisedFor) });
    }
    if (key === 'heldForSomeone') {
      return t('story.heldForSomeone', { name: c.counterpartyName });
    }
    return t(`story.${key}`);
  };

  const place = first
    ? commitmentFieldLabel(first.allocations, lots, fieldNames, t('lots.noField'))
    : null;

  return (
    <View style={[styles.panel, first ? styles.panelAction : styles.panelCalm]}>
      <OilSectionHeader titleKey="needsNow.title" />
      {!first ? (
        <View style={styles.attentionClear}>
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.attentionClearText}>{t('needsNow.emptyTitle')}</Text>
        </View>
      ) : (
        <Pressable onPress={onOpen} style={styles.attentionCard}>
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <Text style={styles.waitingName} numberOfLines={1}>
              {(first.counterpartyName || '').trim() ||
                t('commitments.unnamedHold', { defaultValue: t('commitments.unnamed') })}
            </Text>
            {place ? (
              <Text style={styles.waitingStory} numberOfLines={1}>
                {place}
              </Text>
            ) : null}
            <Text style={styles.waitingPack}>{formatOilPack(first.remaining, packLabels)}</Text>
            <Text style={styles.waitingStory} numberOfLines={1}>
              {storyFor(first)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

type InvProps = {
  summary: OilStockSummary;
  onSelectPack: (kind: 'tin16' | 'tin17' | 'bulk') => void;
};

function Meter({
  free,
  held,
  total,
  styles,
}: {
  free: number;
  held: number;
  total: number;
  styles: ReturnType<typeof createMyOilStyles>;
}) {
  if (total <= 0) return null;
  const freePct = Math.min(100, Math.round((free / total) * 100));
  const heldPct = Math.min(100 - freePct, Math.round((held / total) * 100));
  return (
    <View style={styles.meter} accessibilityElementsHidden>
      <View style={[styles.meterAvail, { width: `${freePct}%` as unknown as number }]} />
      <View style={[styles.meterHeld, { width: `${heldPct}%` as unknown as number }]} />
    </View>
  );
}

/** Remaining free stock in the warehouse — not household set-aside. */
export function OilInventorySummary({ summary, onSelectPack }: InvProps) {
  const { t, i18n } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const locale = i18n.language;
  const { physical, available } = summary;
  const held16 = Math.max(0, physical.tin16 - available.tin16);
  const held17 = Math.max(0, physical.tin17 - available.tin17);
  const heldBulk = Math.max(0, Math.round((physical.bulkLitres - available.bulkLitres) * 10) / 10);

  const warehouseLine = formatHeroStock(available, locale, {
    tins: (count) => t('hero.tins', { count }),
    bulkPlus: (amount) => t('hero.bulkPlus', { amount }),
    bulkOnly: (amount) => t('hero.bulkOnly', { amount }),
    empty: t('hero.zero'),
  });

  const cards: {
    key: 'tin16' | 'tin17' | 'bulk';
    label: string;
    value: string;
    meta: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    free: number;
    held: number;
    total: number;
    show: boolean;
  }[] = [
    {
      key: 'tin16',
      label: t('warehouse.pack16'),
      value: String(available.tin16),
      meta: held16 > 0 ? t('warehouse.heldCount', { count: held16 }) : t('warehouse.free'),
      icon: 'beaker-outline',
      free: available.tin16,
      held: held16,
      total: physical.tin16,
      show: physical.tin16 > 0 || available.tin16 > 0,
    },
    {
      key: 'tin17',
      label: t('warehouse.pack17'),
      value: String(available.tin17),
      meta: held17 > 0 ? t('warehouse.heldCount', { count: held17 }) : t('warehouse.free'),
      icon: 'beaker-outline',
      free: available.tin17,
      held: held17,
      total: physical.tin17,
      show: physical.tin17 > 0 || available.tin17 > 0,
    },
    {
      key: 'bulk',
      label: t('warehouse.packBulk'),
      value: `${formatOilNumber(available.bulkLitres, locale)} L`,
      meta:
        heldBulk > 0.05
          ? t('warehouse.heldLitres', { amount: formatOilNumber(heldBulk, locale) })
          : t('warehouse.free'),
      icon: 'water-outline',
      free: available.bulkLitres,
      held: heldBulk,
      total: physical.bulkLitres,
      show: physical.bulkLitres > 0.05 || available.bulkLitres > 0.05,
    },
  ];

  return (
    <View style={styles.panel}>
      <OilSectionHeader titleKey="warehouse.title" icon="business-outline" />
      <View style={styles.householdBanner}>
        <Text style={styles.householdBannerQty}>{warehouseLine}</Text>
        <Text style={styles.householdBannerNote}>{t('warehouse.readyNote')}</Text>
      </View>
      <View style={styles.inv}>
        {cards
          .filter((c) => c.show)
          .map((c) => (
            <Pressable key={c.key} style={styles.invCard} onPress={() => onSelectPack(c.key)}>
              <View style={styles.invCardIconWell}>
                <Ionicons name={c.icon} size={16} color={colors.primary} />
              </View>
              <Text style={styles.invCardLabel}>{c.label}</Text>
              <Text style={styles.invCardValue}>{c.value}</Text>
              <Text style={styles.invCardMeta}>{c.meta}</Text>
              <Meter free={c.free} held={c.held} total={c.total} styles={styles} />
            </Pressable>
          ))}
      </View>
    </View>
  );
}

type HouseholdProps = {
  summary: OilStockSummary;
  packLabels: PackLabels;
  onSetAside: () => void;
  onOpenHolds: () => void;
};

/** Only oil explicitly set aside for the house — not the whole warehouse. */
export function OilHouseholdAside({ summary, packLabels, onSetAside, onOpenHolds }: HouseholdProps) {
  const { t, i18n } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const locale = i18n.language;
  const homeItems = summary.openCommitments.filter(isHouseholdCommitment);
  const homeHeld = sumCommitmentPack(homeItems);
  const hasHome = tinCount(homeHeld) > 0 || homeHeld.bulkLitres > 0.05;

  return (
    <View style={[styles.panel, styles.panelHousehold]}>
      <OilSectionHeader titleKey="household.title" icon="home-outline" />
      {hasHome ? (
        <>
          <View style={styles.householdBanner}>
            <Text style={styles.householdBannerQty}>{formatOilPack(homeHeld, packLabels)}</Text>
            <Text style={styles.householdBannerNote}>{t('household.setAsideNote')}</Text>
          </View>
          <View style={styles.householdBits}>
            {homeHeld.tin16 > 0 ? (
              <View style={styles.householdBit}>
                <Text style={styles.householdBitLabel}>{t('warehouse.pack16')}</Text>
                <Text style={styles.householdBitValue}>{homeHeld.tin16}</Text>
              </View>
            ) : null}
            {homeHeld.tin17 > 0 ? (
              <View style={styles.householdBit}>
                <Text style={styles.householdBitLabel}>{t('warehouse.pack17')}</Text>
                <Text style={styles.householdBitValue}>{homeHeld.tin17}</Text>
              </View>
            ) : null}
            {homeHeld.bulkLitres > 0.05 ? (
              <View style={styles.householdBit}>
                <Text style={styles.householdBitLabel}>{t('warehouse.packBulk')}</Text>
                <Text style={styles.householdBitValue}>
                  {formatOilNumber(homeHeld.bulkLitres, locale)} L
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable style={styles.linkish} onPress={onOpenHolds}>
            <Text style={styles.linkishText}>{t('household.manage')}</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyBody}>{t('household.empty')}</Text>
          <Pressable onPress={onSetAside} style={[styles.btnSecondary, styles.btnSm, { marginTop: 12 }]}>
            <Text style={styles.btnSecondaryText}>{t('household.setAsideCta')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

type OthersSummaryProps = {
  summary: OilStockSummary;
  packLabels: PackLabels;
  onSeeAll: () => void;
  onOpen: (c: OilCommitment) => void;
  formatDate: (iso: string) => string;
};

export function OilForOthersSummary({
  summary,
  packLabels,
  onSeeAll,
  onOpen,
  formatDate,
}: OthersSummaryProps) {
  const { t } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const waiting = summary.openCommitments.filter((c) => !isHouseholdCommitment(c));
  const held = waiting.filter((c) => c.derivedStatus === 'reserved').length;
  const pending = waiting.filter((c) => c.derivedStatus === 'pending_delivery').length;

  return (
    <View style={styles.panel}>
      <OilSectionHeader titleKey="forOthersSummary.title" />
      {waiting.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyBody}>{t('forOthersSummary.empty')}</Text>
        </View>
      ) : (
        <>
          <View style={[styles.heroChips, { marginBottom: 12 }]}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{t('forOthersSummary.held', { count: held })}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{t('forOthersSummary.pending', { count: pending })}</Text>
            </View>
          </View>
          <View style={styles.waiting}>
            {waiting.slice(0, 2).map((c) => (
              <View key={c.id} style={styles.waitingItem}>
                <Pressable style={styles.linkish} onPress={() => onOpen(c)}>
                  <Text style={styles.linkishText}>
                    {c.counterpartyName} — {formatOilPack(c.remaining, packLabels)}
                  </Text>
                </Pressable>
                {c.promisedFor ? (
                  <Text style={styles.waitingStory}>{formatDate(c.promisedFor)}</Text>
                ) : null}
              </View>
            ))}
          </View>
          <Pressable style={styles.linkish} onPress={onSeeAll}>
            <Text style={styles.linkishText}>{t('forOthersSummary.seeAll')}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

export function packHasType(pack: OilPack, kind: 'tin16' | 'tin17' | 'bulk'): boolean {
  if (kind === 'tin16') return pack.tin16 > 0;
  if (kind === 'tin17') return pack.tin17 > 0;
  return pack.bulkLitres > 0.05;
}
