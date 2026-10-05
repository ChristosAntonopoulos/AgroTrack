import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import { useTheme } from '../../context/ThemeContext';
import { radii } from '../../theme';
import { HarvestQuickChips } from '../../harvestCampaign/components/HarvestFormPager';
import { OilTinSplit, tinLitresOf } from '../../harvestCampaign/components/OilTinSplit';
import {
  formatHarvestOilAmountLabel,
  OIL_TIN_SIZES,
} from '../../harvestCampaign/utils/harvestCalculations';
import { isPositiveAmount, parseHarvestDecimal } from '../../harvestCampaign/utils/harvestValidation';
import type { OilPackInput } from '../../myOil/packInput';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (pack: OilPackInput, notes: string) => Promise<void>;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

/** 16 L and 17 L stay tins. Any other size's litres stay in the loose remainder. */
const packFromSplit = (
  totalLitres: number,
  mode: 'all' | 'tins',
  counts: Record<number, number>
): OilPackInput => {
  if (mode !== 'tins') {
    return { tin16: 0, tin17: 0, bulkLitres: round1(Math.max(0, totalLitres)) };
  }
  const tin16 = Math.max(0, Math.round(counts[16] || 0));
  const tin17 = Math.max(0, Math.round(counts[17] || 0));
  const named = tin16 * 16 + tin17 * 17;
  return {
    tin16,
    tin17,
    bulkLitres: round1(Math.max(0, totalLitres - named)),
  };
};

/**
 * Add oil already in storage: the whole amount first, then the harvest tin split.
 */
export function AddOilSheet({ open, busy, onClose, onSave }: Props) {
  const { t, i18n } = useTranslation(['myOil', 'fields', 'common']);
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const locale = i18n.language;
  const [step, setStep] = useState<'amount' | 'tins'>('amount');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'all' | 'tins'>('all');
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep('amount');
    setAmount('');
    setMode('all');
    setCounts({});
    setNote('');
  }, [open]);

  const litres = parseHarvestDecimal(amount);
  const total = isPositiveAmount(litres) ? litres : 0;
  const tinLitres = mode === 'tins' ? tinLitresOf(counts) : 0;
  const tinCount = OIL_TIN_SIZES.reduce((sum, size) => sum + (counts[size] || 0), 0);
  const tinOver = mode === 'tins' && tinLitres > total + 0.05;
  const packBlocked = mode === 'tins' && (tinCount <= 0 || tinOver);
  const canContinue = isPositiveAmount(litres);
  const canSave = canContinue && !packBlocked;

  const setTinCount = (size: number, count: number) => {
    setCounts((prev) => ({ ...prev, [size]: Math.max(0, count) }));
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      edge="end"
      size="md"
      accent
      title={step === 'amount' ? t('add.title') : t('fields:harvestCampaign.oil.storedTitle')}
      subtitle={step === 'amount' ? t('add.hint') : t('add.subtitle')}
      icon={<Ionicons name="water-outline" size={18} color={colors.primary} />}
      footer={
        <View style={styles.footerRow}>
          <Pressable
            onPress={() => {
              if (step === 'tins') setStep('amount');
              else onClose();
            }}
            disabled={busy}
            style={styles.btnSecondary}
          >
            <Text style={styles.btnSecondaryText}>
              {step === 'tins' ? t('common:back', { defaultValue: 'Back' }) : t('sheet.cancel')}
            </Text>
          </Pressable>
          {step === 'amount' ? (
            <Pressable
              disabled={!canContinue}
              onPress={() => setStep('tins')}
              style={[styles.btnPrimary, !canContinue && styles.btnPrimaryDisabled]}
            >
              <Text style={styles.btnPrimaryText}>{t('common:next', { defaultValue: 'Next' })}</Text>
            </Pressable>
          ) : (
            <Pressable
              disabled={busy || !canSave}
              onPress={() => void onSave(packFromSplit(total, mode, counts), note)}
              style={[styles.btnPrimary, (busy || !canSave) && styles.btnPrimaryDisabled]}
            >
              <Text style={styles.btnPrimaryText}>{t('add.save')}</Text>
            </Pressable>
          )}
        </View>
      }
    >
      {step === 'amount' ? (
        <View style={local.amount}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            {t('fields:harvestCampaign.oil.litres')}
          </Text>
          <View
            style={[
              local.amountRow,
              { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
            ]}
          >
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              accessibilityLabel={t('fields:harvestCampaign.oil.litres')}
              style={[local.amountInput, { color: colors.textPrimary }]}
            />
            <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>L</Text>
          </View>
          <HarvestQuickChips
            values={[10, 20, 50, 100]}
            suffix="L"
            onPick={(add) => setAmount(String(round1((parseHarvestDecimal(amount) ?? 0) + add)))}
          />
        </View>
      ) : (
        <View style={styles.flow}>
          <OilTinSplit
            totalLitres={total}
            mode={mode}
            onModeChange={setMode}
            counts={counts}
            onChangeCount={setTinCount}
            locale={locale}
          />
          {tinOver ? (
            <Text style={{ color: colors.error, fontWeight: '700' }}>
              {t('fields:harvestCampaign.oil.overTins', {
                amount: formatHarvestOilAmountLabel(round1(tinLitres - total), 'litres', locale),
              })}
            </Text>
          ) : null}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('add.note')}</Text>
            <TextInput
              style={styles.fieldInput}
              value={note}
              onChangeText={setNote}
              placeholder={t('add.notePlaceholder')}
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>
      )}
    </Sheet>
  );
}

const local = StyleSheet.create({
  amount: { gap: 10 },
  amountRow: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '800', paddingVertical: 6 },
});
