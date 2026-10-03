import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { appFonts, radii, spacing } from '../../theme';
import { HarvestNumberStepper } from './HarvestNumberStepper';
import { HarvestQuickChips } from './HarvestFormPager';
import { HarvestSegmentedControl } from './HarvestSegmentedControl';
import {
  formatHarvestOilAmountLabel,
  type HarvestOilUnit,
  type OilSettlement,
} from '../utils/harvestCalculations';

type Props = {
  storageMode: 'all' | 'tins';
  onStorageMode: (mode: 'all' | 'tins') => void;
  useTin16: boolean;
  useTin17: boolean;
  onToggleTin16: () => void;
  onToggleTin17: () => void;
  tin16: number;
  tin17: number;
  onTin16: (n: number) => void;
  onTin17: (n: number) => void;
  settlement: OilSettlement | null;
  unit: HarvestOilUnit;
  locale: string;
  /** Parent already chose tins, so the all-vs-tins switch stays hidden. */
  hideMode?: boolean;
};

/**
 * Pack step: all-together vs tins → pick tin sizes → counts → colour total bar.
 */
export function HarvestOilPackSection({
  storageMode,
  onStorageMode,
  useTin16,
  useTin17,
  onToggleTin16,
  onToggleTin17,
  tin16,
  tin17,
  onTin16,
  onTin17,
  settlement,
  unit,
  locale,
  hideMode = false,
}: Props) {
  const { t } = useTranslation('fields');
  const { colors, tapMin, fontScaleMultiplier: scale } = useTheme();

  const millPct = settlement?.millAmount
    ? Math.min(100, (settlement.millAmount / Math.max(settlement.total, 0.001)) * 100)
    : 0;
  const tin16Pct = settlement?.tin16Amount
    ? Math.min(100, (settlement.tin16Amount / Math.max(settlement.total, 0.001)) * 100)
    : 0;
  const tin17Pct = settlement?.tin17Amount
    ? Math.min(100, (settlement.tin17Amount / Math.max(settlement.total, 0.001)) * 100)
    : 0;
  const bulkPct = settlement?.bulkAmount
    ? Math.min(100, (settlement.bulkAmount / Math.max(settlement.total, 0.001)) * 100)
    : 0;
  const over = Boolean(settlement && settlement.overAmount > 0);

  return (
    <View style={styles.root}>
      {hideMode ? null : (
        <HarvestSegmentedControl
          value={storageMode}
          label={t('harvestCampaign.oil.storedTitle')}
          ariaLabel={t('harvestCampaign.oil.storedTitle')}
          onChange={onStorageMode}
          options={[
            {
              value: 'all',
              label: t('harvestCampaign.oil.storedAll'),
              detail: t('harvestCampaign.oil.storedAllDetail'),
            },
            {
              value: 'tins',
              label: t('harvestCampaign.oil.storedTins'),
              detail: t('harvestCampaign.oil.storedTinsDetail'),
            },
          ]}
        />
      )}

      {storageMode === 'tins' ? (
        <>
          <Text style={[styles.section, { color: colors.textPrimary, fontSize: 14 * scale }]}>
            {t('harvestCampaign.oil.tinTypeTitle')}
          </Text>
          <View style={styles.typeRow}>
            {(
              [
                { size: 16 as const, on: useTin16, toggle: onToggleTin16 },
                { size: 17 as const, on: useTin17, toggle: onToggleTin17 },
              ] as const
            ).map((item) => (
              <Pressable
                key={item.size}
                onPress={item.toggle}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.on }}
                style={[
                  styles.typeCard,
                  {
                    minHeight: Math.max(56, tapMin),
                    backgroundColor: item.on ? colors.primary : colors.surfaceElevated,
                    borderColor: item.on ? colors.primaryDark : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeValue,
                    { color: item.on ? colors.onOlive : colors.textPrimary, fontSize: 22 * scale },
                  ]}
                >
                  {item.size}
                </Text>
                <Text
                  style={{
                    color: item.on ? 'rgba(255,255,255,0.9)' : colors.textSecondary,
                    fontWeight: '700',
                    fontSize: 13 * scale,
                  }}
                >
                  L
                </Text>
              </Pressable>
            ))}
          </View>

          {useTin16 ? (
            <View style={styles.countBlock}>
              <HarvestNumberStepper
                label={t('harvestCampaign.oil.tin16')}
                value={tin16}
                onChange={(next) => onTin16(Math.max(0, Math.round(next)))}
                min={0}
                suffix={t('harvestCampaign.oil.tinSuffix')}
              />
              <HarvestQuickChips
                values={[1, 5]}
                suffix={t('harvestCampaign.oil.tinSuffix')}
                onPick={(add) => onTin16(Math.max(0, tin16 + add))}
              />
            </View>
          ) : null}

          {useTin17 ? (
            <View style={styles.countBlock}>
              <HarvestNumberStepper
                label={t('harvestCampaign.oil.tin17')}
                value={tin17}
                onChange={(next) => onTin17(Math.max(0, Math.round(next)))}
                min={0}
                suffix={t('harvestCampaign.oil.tinSuffix')}
              />
              <HarvestQuickChips
                values={[1, 5]}
                suffix={t('harvestCampaign.oil.tinSuffix')}
                onPick={(add) => onTin17(Math.max(0, tin17 + add))}
              />
            </View>
          ) : null}

          {!useTin16 && !useTin17 ? (
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
              {t('harvestCampaign.oil.tinTypeHint')}
            </Text>
          ) : null}
        </>
      ) : null}

      {settlement &&
      settlement.total > 0 &&
      (storageMode === 'all' || useTin16 || useTin17) ? (
        <View style={styles.totalCard}>
          <Text style={[styles.section, { color: colors.textPrimary }]}>
            {t('harvestCampaign.oil.packTotal')}
          </Text>
          <View
            style={[
              styles.barTrack,
              {
                backgroundColor: colors.border,
                borderColor: over ? colors.error : colors.border,
              },
            ]}
          >
            {millPct > 0.5 ? (
              <View style={[styles.seg, { width: `${millPct}%`, backgroundColor: '#9B741C' }]} />
            ) : null}
            {tin16Pct > 0.5 ? (
              <View style={[styles.seg, { width: `${tin16Pct}%`, backgroundColor: colors.primary }]} />
            ) : null}
            {tin17Pct > 0.5 ? (
              <View
                style={[styles.seg, { width: `${tin17Pct}%`, backgroundColor: '#53622E' }]}
              />
            ) : null}
            {bulkPct > 0.5 ? (
              <View style={[styles.seg, { width: `${bulkPct}%`, backgroundColor: '#B86A21' }]} />
            ) : null}
          </View>
          <View style={styles.legend}>
            {settlement.millAmount > 0 ? (
              <Text style={[styles.legendItem, { color: colors.textSecondary }]}>
                {t('harvestCampaign.oil.part.mill')}:{' '}
                {formatHarvestOilAmountLabel(settlement.millAmount, unit, locale)}
              </Text>
            ) : null}
            {settlement.tin16Amount > 0 ? (
              <Text style={[styles.legendItem, { color: colors.textSecondary }]}>
                16 L: {formatHarvestOilAmountLabel(settlement.tin16Amount, unit, locale)}
              </Text>
            ) : null}
            {settlement.tin17Amount > 0 ? (
              <Text style={[styles.legendItem, { color: colors.textSecondary }]}>
                17 L: {formatHarvestOilAmountLabel(settlement.tin17Amount, unit, locale)}
              </Text>
            ) : null}
            {settlement.bulkAmount > 0 ? (
              <Text style={[styles.legendItem, { color: colors.textSecondary }]}>
                {t('harvestCampaign.oil.part.bulk')}:{' '}
                {formatHarvestOilAmountLabel(settlement.bulkAmount, unit, locale)}
              </Text>
            ) : null}
          </View>
          {over ? (
            <Text style={{ color: colors.error, fontWeight: '700' }}>
              {t('harvestCampaign.oil.overTins', {
                amount: formatHarvestOilAmountLabel(settlement.overAmount, unit, locale),
              })}
            </Text>
          ) : settlement.bulkAmount > 0 && storageMode === 'tins' ? (
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
              {t('harvestCampaign.oil.bulkLine', {
                amount: formatHarvestOilAmountLabel(settlement.bulkAmount, unit, locale),
              })}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  section: {
    fontFamily: appFonts.bold,
    fontWeight: '800',
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.lg,
    borderWidth: 2,
    paddingVertical: 12,
  },
  typeValue: {
    fontFamily: appFonts.bold,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  countBlock: { gap: spacing.sm },
  totalCard: { gap: spacing.sm },
  barTrack: {
    height: 16,
    borderRadius: radii.full,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  seg: { height: '100%' },
  legend: { gap: 4 },
  legendItem: { fontSize: 13, fontWeight: '600' },
});
