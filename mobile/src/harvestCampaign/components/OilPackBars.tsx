import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme';
import {
  fillOilPack,
  packLitres,
  setPackAmount,
  type OilPackStock,
} from '../oilSaleLots';
import { formatHarvestOilAmount, TIN_16_LITRES, TIN_17_LITRES } from '../utils/harvestCalculations';
import { HarvestNumberInput } from './HarvestNumberInput';
import { HarvestNumberStepper } from './HarvestNumberStepper';

type Props = {
  stock: OilPackStock;
  value: OilPackStock;
  availableLitres: number;
  onChange: (next: OilPackStock) => void;
};

export const OilPackBars: React.FC<Props> = ({ stock, value, availableLitres, onChange }) => {
  const { t, i18n } = useTranslation('capture');
  const locale = i18n.language || 'el';
  const { colors } = useTheme();
  const sold = packLitres(value);
  const parts = [
    value.tin16 > 0 ? `${value.tin16} × ${TIN_16_LITRES} L` : '',
    value.tin17 > 0 ? `${value.tin17} × ${TIN_17_LITRES} L` : '',
    value.bulkLitres > 0 ? formatHarvestOilAmount(value.bulkLitres, 'litres', locale) : '',
  ].filter(Boolean);

  return (
    <View style={styles.wrap}>
      <View style={styles.tools}>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('money.packHint')}</Text>
        <Pressable onPress={() => onChange(fillOilPack(stock, availableLitres))}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('money.packAll')}</Text>
        </Pressable>
      </View>
      {stock.tin16 > 0 ? (
        <HarvestNumberStepper
          label={t('money.packTin16')}
          value={value.tin16}
          min={0}
          suffix={t('money.packTinValue', { count: value.tin16 })}
          onChange={(next) => onChange(setPackAmount(value, stock, availableLitres, 'tin16', next))}
        />
      ) : null}
      {stock.tin17 > 0 ? (
        <HarvestNumberStepper
          label={t('money.packTin17')}
          value={value.tin17}
          min={0}
          suffix={t('money.packTinValue', { count: value.tin17 })}
          onChange={(next) => onChange(setPackAmount(value, stock, availableLitres, 'tin17', next))}
        />
      ) : null}
      {stock.bulkLitres > 0 ? (
        <HarvestNumberInput
          label={t('money.packBulk')}
          value={value.bulkLitres ? String(value.bulkLitres) : ''}
          suffix="L"
          min={0}
          onChange={(raw) => {
            const n = Number(raw.replace(',', '.'));
            onChange(setPackAmount(value, stock, availableLitres, 'bulkLitres', Number.isFinite(n) ? n : 0));
          }}
        />
      ) : null}
      {sold > 0 ? (
        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
          {parts.join(' + ')} → {formatHarvestOilAmount(sold, 'litres', locale)}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  tools: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  hint: { flex: 1, fontSize: 13, lineHeight: 18 },
});
