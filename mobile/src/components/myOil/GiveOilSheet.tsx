import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import { useTheme } from '../../context/ThemeContext';
import { clampPackInput, emptyOilPackInput, packLitresOf, type OilPackInput } from '../../myOil/packInput';
import { formatOilNumber } from '../../myOil/formatOilPack';
import { poolHasFreeOil, poolLabel, type FieldOilPool } from '../../myOil/fieldPools';
import type { OilPack } from '../../services/oilStockService';
import SaleBuyerPicker from './SaleBuyerPicker';
import { createMyOilStyles } from './myOilStyles';

export type GiveOilSaveInput = {
  counterpartyName: string;
  requested: OilPackInput;
  isSale: boolean;
  amount?: number;
  alreadyDelivered: boolean;
  alreadyPaid: boolean;
  forHome: boolean;
  /** Field pile this promise draws from. Omitted when the cellar is one pile. */
  poolKey?: string;
};

type WhoMode = 'someone' | 'home' | 'unnamed';

type Props = {
  open: boolean;
  available?: OilPack;
  pools?: FieldOilPool[];
  fieldNames?: Record<string, string>;
  busy: boolean;
  onClose: () => void;
  onSave: (input: GiveOilSaveInput) => Promise<void>;
  /** Prefill who-mode (e.g. set-aside for home). */
  initialWho?: WhoMode;
};

export function GiveOilSheet({
  open,
  available,
  pools = [],
  fieldNames = {},
  busy,
  onClose,
  onSave,
  initialWho = 'someone',
}: Props) {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const [whoMode, setWhoMode] = useState<WhoMode>(initialWho);
  const [name, setName] = useState('');
  const [pack, setPack] = useState<OilPackInput>(emptyOilPackInput());
  const [takesNow, setTakesNow] = useState(false);
  const [isSale, setIsSale] = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState(true);
  const [amount, setAmount] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [poolKey, setPoolKey] = useState<string | null>(null);

  const freePools = useMemo(() => pools.filter(poolHasFreeOil), [pools]);
  const fullestPool = [...freePools].sort((a, b) => b.available.litres - a.available.litres)[0] || null;
  const selectedPool = freePools.find((pool) => pool.key === poolKey) || fullestPool;
  const max = selectedPool?.available || available;
  const unnamed = t('lots.noField');

  useEffect(() => {
    if (open) {
      setWhoMode(initialWho);
      setName('');
      setPack(emptyOilPackInput());
      setTakesNow(false);
      setIsSale(false);
      setAlreadyPaid(true);
      setAmount('');
      setSaveError(null);
      setPoolKey(null);
      if (initialWho === 'home') {
        setIsSale(false);
        setTakesNow(false);
      }
    }
  }, [open, initialWho]);

  const totalLitres = packLitresOf(pack);

  const bump = (key: keyof OilPackInput, delta: number) => {
    setPack((prev) => {
      const next = { ...prev };
      if (key === 'bulkLitres') {
        next.bulkLitres = Math.max(0, Math.round((prev.bulkLitres + delta) * 10) / 10);
      } else {
        next[key] = Math.max(0, prev[key] + delta);
      }
      return clampPackInput(next, max);
    });
  };

  const nameOk =
    whoMode === 'home' || whoMode === 'unnamed' || (whoMode === 'someone' && name.trim().length > 0);

  const canSave =
    nameOk &&
    totalLitres > 0.05 &&
    (!isSale || whoMode !== 'home') &&
    (!isSale || Number(amount) > 0);

  const resolvedName = useMemo(() => {
    if (whoMode === 'home') return t('give.homeName');
    if (whoMode === 'unnamed') return t('give.unnamed');
    return name.trim();
  }, [whoMode, name, t]);

  const requestClose = () => {
    if (!busy) onClose();
  };

  const submit = () => {
    setSaveError(null);
    void onSave({
      counterpartyName: resolvedName,
      requested: pack,
      isSale: whoMode === 'home' ? false : isSale,
      amount: isSale && whoMode !== 'home' ? Number(amount) : undefined,
      alreadyDelivered: takesNow,
      alreadyPaid: isSale ? alreadyPaid : false,
      forHome: whoMode === 'home',
      poolKey: selectedPool?.key,
    }).catch(() => setSaveError(t('error')));
  };

  const steppers = (
    [
      ['tin16', t('give.tin16')],
      ['tin17', t('give.tin17')],
      ['bulkLitres', t('give.bulk')],
    ] as const
  );

  return (
    <Sheet
      open={open}
      onClose={requestClose}
      edge="end"
      size="lg"
      accent
      title={t('give.title')}
      icon={<Ionicons name="water-outline" size={18} color={colors.primary} />}
      footer={
        <View style={styles.footerRow}>
          <Pressable disabled={busy} onPress={requestClose} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>{t('give.cancel')}</Text>
          </Pressable>
          <Pressable
            disabled={!canSave || busy}
            onPress={submit}
            style={[styles.btnPrimary, (!canSave || busy) && styles.btnPrimaryDisabled]}
          >
            <Text style={styles.btnPrimaryText}>{busy ? t('give.saving') : t('give.save')}</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.flow}>
        <Text style={[styles.flowStep, styles.flowStepFirst]}>{t('give.who')}</Text>
        <View style={styles.toggle}>
          {(
            [
              ['someone', t('give.forSomeone')],
              ['unnamed', t('give.noName')],
              ['home', t('give.forHome')],
            ] as const
          ).map(([mode, label]) => (
            <Pressable
              key={mode}
              onPress={() => {
                setWhoMode(mode);
                if (mode === 'home') setIsSale(false);
              }}
              style={[styles.toggleBtn, whoMode === mode && styles.toggleBtnOn]}
            >
              <Text style={[styles.toggleBtnText, whoMode === mode && styles.toggleBtnTextOn]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        {whoMode === 'someone' ? (
          <View style={styles.field}>
            <SaleBuyerPicker value={name} onChange={setName} compact />
          </View>
        ) : null}

        {freePools.length > 1 ? (
          <>
            <Text style={styles.flowStep}>{t('give.field')}</Text>
            <View style={styles.sourceList}>
              {freePools.map((pool) => {
                const on = pool.key === selectedPool?.key;
                return (
                  <Pressable
                    key={pool.key}
                    onPress={() => {
                      setPoolKey(pool.key);
                      setPack(emptyOilPackInput());
                    }}
                    style={[styles.sourceCard, on && styles.sourceCardOn]}
                  >
                    <View style={styles.sourceCardIcon}>
                      <Ionicons name="leaf-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.sourceCardBody}>
                      <Text style={styles.sourceCardTitle}>
                        {poolLabel(pool, fieldNames, unnamed)}
                      </Text>
                      <Text style={styles.sourceCardMeta}>
                        {t('give.totalLitres', {
                          amount: formatOilNumber(pool.available.litres, i18n.language),
                        })}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <Text style={styles.flowStep}>{t('give.what')}</Text>
        <View style={styles.stepper}>
          {steppers.map(([key, label]) => (
            <View key={key} style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>{label}</Text>
              <View style={styles.stepperControls}>
                <Pressable
                  accessibilityLabel="−"
                  onPress={() => bump(key, -1)}
                  disabled={pack[key] <= 0}
                  style={[styles.stepperBtn, pack[key] <= 0 && styles.stepperBtnDisabled]}
                >
                  <Text style={styles.stepperValue}>−</Text>
                </Pressable>
                <Text style={styles.stepperValue}>{pack[key] || 0}</Text>
                <Pressable
                  accessibilityLabel="+"
                  onPress={() => bump(key, 1)}
                  disabled={
                    max != null &&
                    (key === 'bulkLitres'
                      ? pack.bulkLitres >= max.bulkLitres
                      : pack[key] >= max[key])
                  }
                  style={[
                    styles.stepperBtn,
                    max != null &&
                      (key === 'bulkLitres'
                        ? pack.bulkLitres >= max.bulkLitres
                        : pack[key] >= max[key]) &&
                      styles.stepperBtnDisabled,
                  ]}
                >
                  <Text style={styles.stepperValue}>+</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
        {totalLitres > 0.05 ? (
          <Text style={styles.flowTotal}>
            {t('give.totalLitres', { amount: formatOilNumber(totalLitres, i18n.language) })}
          </Text>
        ) : null}

        <Text style={styles.flowStep}>{t('give.when')}</Text>
        <View style={styles.toggle}>
          <Pressable
            onPress={() => setTakesNow(false)}
            style={[styles.toggleBtn, !takesNow && styles.toggleBtnOn]}
          >
            <Text style={[styles.toggleBtnText, !takesNow && styles.toggleBtnTextOn]}>
              {t('give.later')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTakesNow(true)}
            style={[styles.toggleBtn, takesNow && styles.toggleBtnOn]}
          >
            <Text style={[styles.toggleBtnText, takesNow && styles.toggleBtnTextOn]}>
              {t('give.now')}
            </Text>
          </Pressable>
        </View>

        {whoMode !== 'home' ? (
          <>
            <Text style={styles.flowStep}>{t('give.isSale')}</Text>
            <View style={styles.toggle}>
              <Pressable
                onPress={() => setIsSale(false)}
                style={[styles.toggleBtn, !isSale && styles.toggleBtnOn]}
              >
                <Text style={[styles.toggleBtnText, !isSale && styles.toggleBtnTextOn]}>
                  {t('give.no')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setIsSale(true)}
                style={[styles.toggleBtn, isSale && styles.toggleBtnOn]}
              >
                <Text style={[styles.toggleBtnText, isSale && styles.toggleBtnTextOn]}>
                  {t('give.yes')}
                </Text>
              </Pressable>
            </View>
            {isSale ? (
              <>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('give.amount')}</Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    style={styles.fieldInput}
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                <Pressable
                  style={styles.checkRow}
                  onPress={() => setAlreadyPaid((v) => !v)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: alreadyPaid }}
                >
                  <View style={[styles.checkBox, alreadyPaid && styles.checkBoxOn]}>
                    {alreadyPaid ? (
                      <Ionicons name="checkmark" size={14} color={colors.onOlive} />
                    ) : null}
                  </View>
                  <Text style={styles.toggleBtnText}>{t('give.alreadyPaid')}</Text>
                </Pressable>
              </>
            ) : null}
          </>
        ) : null}

        {saveError ? <Text style={styles.giveError}>{saveError}</Text> : null}
      </View>
    </Sheet>
  );
}
