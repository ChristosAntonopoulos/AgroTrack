import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { radii } from '../../theme';
import { HarvestNumberStepper } from './HarvestNumberStepper';
import {
  formatHarvestOilAmountLabel,
  OIL_TIN_SIZES,
} from '../utils/harvestCalculations';

const round1 = (value: number) => Math.round(value * 10) / 10;

export const tinLitresOf = (counts: Record<number, number>) =>
  OIL_TIN_SIZES.reduce((sum, size) => sum + size * Math.max(0, counts[size] || 0), 0);

type Mode = 'all' | 'tins';

/**
 * Split a known amount of oil into loose bulk or tins.
 * Same control the harvest oil form uses: tap a size to add one tin, then adjust the count.
 */
export function OilTinSplit({
  totalLitres,
  mode,
  onModeChange,
  counts,
  onChangeCount,
  locale,
}: {
  totalLitres: number;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  counts: Record<number, number>;
  onChangeCount: (size: number, count: number) => void;
  locale: string;
}) {
  const { t } = useTranslation('fields');
  const { colors, tapMin } = useTheme();
  const packed = mode === 'tins' ? counts : {};
  const tinLitres = tinLitresOf(packed);
  const bulkLitres = Math.max(0, round1(totalLitres - tinLitres));
  const tinOver = mode === 'tins' && tinLitres > totalLitres + 0.05;
  const tinShare = totalLitres > 0 ? Math.min(100, (tinLitres / totalLitres) * 100) : 0;
  const tinCount = OIL_TIN_SIZES.reduce((sum, size) => sum + (packed[size] || 0), 0);

  return (
    <>
      <View style={styles.barBlock}>
        <View style={[styles.barTrack, { backgroundColor: colors.surfaceMuted }]}>
          {tinShare > 0 ? (
            <View
              style={[
                styles.barFill,
                {
                  width: `${tinOver ? 100 : tinShare}%`,
                  backgroundColor: tinOver ? colors.error : colors.primary,
                },
              ]}
            />
          ) : null}
        </View>
        <View style={styles.barLegend}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>
            {t('harvestCampaign.oil.part.bulk')}{' '}
            {formatHarvestOilAmountLabel(mode === 'tins' ? bulkLitres : totalLitres, 'litres', locale)}
          </Text>
          {mode === 'tins' && tinLitres > 0 ? (
            <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
              {t('harvestCampaign.oil.storedTins')}{' '}
              {formatHarvestOilAmountLabel(round1(tinLitres), 'litres', locale)}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.pair}>
        {(
          [
            ['all', t('harvestCampaign.oil.part.bulk')],
            ['tins', t('harvestCampaign.oil.storedTins')],
          ] as const
        ).map(([next, label]) => {
          const on = mode === next;
          return (
            <Pressable
              key={next}
              onPress={() => onModeChange(next)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[
                styles.choice,
                {
                  backgroundColor: on ? colors.primary : colors.surfaceElevated,
                  borderColor: on ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={{ color: on ? colors.onOlive : colors.textPrimary, fontWeight: '800' }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {mode === 'tins' ? (
        <View style={styles.tinBlock}>
          <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 14 }}>
            {t('harvestCampaign.oil.tinTypeTitle')}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            {t('harvestCampaign.oil.tapTinAdd')}
          </Text>
          <View style={styles.tinChips}>
            {OIL_TIN_SIZES.map((size) => {
              const count = counts[size] || 0;
              const on = count > 0;
              return (
                <Pressable
                  key={size}
                  onPress={() => onChangeCount(size, count + 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`+1 ${size} L`}
                  style={[
                    styles.tinChip,
                    {
                      minHeight: Math.max(48, tapMin * 0.95),
                      backgroundColor: on ? colors.primary : colors.surfaceElevated,
                      borderColor: on ? colors.primaryDark : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: on ? colors.onOlive : colors.textPrimary,
                      fontWeight: '800',
                      fontSize: 16,
                    }}
                  >
                    {size} L
                  </Text>
                  {on ? (
                    <Text style={{ color: colors.onOlive, fontWeight: '700', fontSize: 12 }}>
                      ×{count}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          {tinCount > 0 ? (
            <View style={styles.tinRows}>
              {OIL_TIN_SIZES.filter((size) => (counts[size] || 0) > 0).map((size) => (
                <HarvestNumberStepper
                  key={size}
                  label={`${size} L`}
                  value={counts[size] || 0}
                  onChange={(next) => onChangeCount(size, Math.round(next))}
                  min={0}
                  suffix={t('harvestCampaign.oil.tinSuffix')}
                />
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
              {t('harvestCampaign.oil.tinCountHint')}
            </Text>
          )}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: 10 },
  barBlock: { gap: 6 },
  barTrack: { height: 14, borderRadius: 99, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 99 },
  barLegend: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  choice: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tinBlock: { gap: 10 },
  tinChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tinChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: '30%',
    flexGrow: 1,
  },
  tinRows: { gap: 12 },
});
