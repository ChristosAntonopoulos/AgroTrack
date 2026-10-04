import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import {
  quantityUnitLabel,
  UNIT_ABBREVIATION,
} from '../../finance/moneyUi';
import type {
  FinancialCalculationMode,
  FinancialQuantityUnit,
} from '../../finance/quantityCalculator';
import { spacing } from '../../theme';

type Props = {
  mode: FinancialCalculationMode;
  onModeChange: (mode: FinancialCalculationMode) => void;
  quantity: string;
  onQuantityChange: (value: string) => void;
  unit: FinancialQuantityUnit;
  units: FinancialQuantityUnit[];
  onUnitChange: (unit: FinancialQuantityUnit) => void;
  unitPrice: string;
  onUnitPriceChange: (value: string) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  calculatedAmount?: string | null;
  calculatedUnitPrice?: string | null;
  hideModeToggle?: boolean;
  quantityLocked?: boolean;
};

export const QuantityPriceCalculator: React.FC<Props> = ({
  mode,
  onModeChange,
  quantity,
  onQuantityChange,
  unit,
  units,
  onUnitChange,
  unitPrice,
  onUnitPriceChange,
  amount,
  onAmountChange,
  calculatedAmount,
  calculatedUnitPrice,
  hideModeToggle,
  quantityLocked,
}) => {
  const { t, i18n } = useTranslation('capture');
  const { colors, tapMin } = useTheme();
  const abbr = UNIT_ABBREVIATION[unit] || unit;
  const byQuantity = mode !== 'total_only';

  if (!byQuantity) {
    return (
      <View style={styles.block}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('money.amount')}</Text>
        <TextInput
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={onAmountChange}
          placeholder="0,00"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={t('money.amount')}
        />
        {hideModeToggle ? null : (
          <Pressable onPress={() => onModeChange('quantity_times_unit_price')} style={{ minHeight: tapMin * 0.7, justifyContent: 'center' }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('money.qtyTimesPrice')}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
      <View style={styles.head}>
        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{t('money.qtyTimesPrice')}</Text>
        {hideModeToggle ? null : (
          <Pressable onPress={() => onModeChange('total_only')}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('money.totalOnly')}</Text>
          </Pressable>
        )}
      </View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('money.quantity')}</Text>
      <TextInput
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, opacity: quantityLocked ? 0.7 : 1 }]}
        keyboardType="decimal-pad"
        value={quantity}
        onChangeText={onQuantityChange}
        placeholder="0"
        placeholderTextColor={colors.textSecondary}
        editable={!quantityLocked}
      />
      {units.length > 1 ? (
        <View style={styles.chips}>
          {units.map((item) => {
            const on = item === unit;
            return (
              <Pressable
                key={item}
                onPress={() => onUnitChange(item)}
                style={[
                  styles.chip,
                  {
                    minHeight: tapMin * 0.75,
                    borderColor: on ? colors.primary : colors.border,
                    backgroundColor: on ? colors.primary + '22' : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: on ? colors.primary : colors.textPrimary }}>
                  {quantityUnitLabel(item, i18n.language)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
          {quantityUnitLabel(unit, i18n.language)}
        </Text>
      )}
      {mode === 'quantity_and_total' ? (
        <>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('money.total')}</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={onAmountChange}
            placeholder="0,00"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={{ color: colors.textSecondary }}>
            {t('money.unitPrice', { unit: abbr })} · {calculatedUnitPrice || '—'} €/{abbr}
          </Text>
        </>
      ) : (
        <>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('money.unitPrice', { unit: abbr })}
          </Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
            keyboardType="decimal-pad"
            value={unitPrice}
            onChangeText={onUnitPriceChange}
            placeholder="0,00"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {t('money.total')} · {calculatedAmount || '—'} €
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  block: { gap: 4, marginBottom: 8 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: spacing.md,
    gap: 6,
    marginBottom: 10,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
});
