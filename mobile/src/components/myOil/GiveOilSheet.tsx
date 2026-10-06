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
import { OilRecipientStep, type RecipientPlace } from './OilRecipientStep';
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
export type GiveOilIntent = 'hold' | 'give' | 'sell';
type Step = 'who' | 'howMuch' | 'intent';

const STEPS: Step[] = ['who', 'howMuch', 'intent'];

/** Accepts "12" or "12,5" while the grower is still typing. */
const countDraftOk = (text: string, decimal: boolean) =>
  decimal ? /^\d*([,.]\d?)?$/.test(text) : /^\d*$/.test(text);

const countFromDraft = (text: string): number | null => {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed || trimmed === '.') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
};

function PackStepperInput({
  value,
  max,
  decimal,
  label,
  display,
  onChange,
  style,
  color,
}: {
  value: number;
  max?: number;
  decimal: boolean;
  label: string;
  display: string;
  onChange: (next: number) => void;
  style: object;
  color: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const draftRef = React.useRef<string | null>(null);
  const focused = React.useRef(false);
  const writeDraft = (next: string | null) => {
    draftRef.current = next;
    setDraft(next);
  };

  React.useEffect(() => {
    const current = draftRef.current;
    if (!focused.current || current == null || current === '' || /[,.]$/.test(current)) return;
    const parsed = countFromDraft(current);
    if (parsed == null || Math.abs(parsed - value) > 0.05) writeDraft(null);
  }, [value]);

  const commit = (text: string) => {
    const parsed = countFromDraft(text);
    const next = parsed == null ? 0 : decimal ? Math.round(parsed * 10) / 10 : Math.round(parsed);
    const capped = max == null ? Math.max(0, next) : Math.min(max, Math.max(0, next));
    onChange(capped);
    writeDraft(null);
  };

  return (
    <TextInput
      value={draft ?? display}
      onFocus={() => {
        focused.current = true;
        writeDraft(display);
      }}
      onBlur={() => {
        focused.current = false;
        commit(draftRef.current ?? display);
      }}
      onChangeText={(text) => {
        if (!countDraftOk(text, decimal)) return;
        writeDraft(text);
        const parsed = countFromDraft(text);
        if (parsed == null) {
          onChange(0);
          return;
        }
        const next = decimal ? Math.round(parsed * 10) / 10 : Math.round(parsed);
        onChange(max == null ? Math.max(0, next) : Math.min(max, Math.max(0, next)));
      }}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      inputMode={decimal ? 'decimal' : 'numeric'}
      selectTextOnFocus
      accessibilityLabel={label}
      style={[style, { color }]}
    />
  );
}

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
  /** Prefill what is happening, so Give / Sell / Hold each open ready to go. */
  initialIntent?: GiveOilIntent;
};

export function OilMovementSheet({
  open,
  available,
  pools = [],
  fieldNames = {},
  busy,
  onClose,
  onSave,
  initialWho = 'someone',
  initialIntent = 'hold',
}: Props) {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const [step, setStep] = useState<Step>('who');
  const [whoMode, setWhoMode] = useState<WhoMode>(initialWho);
  const [place, setPlace] = useState<RecipientPlace>('outside');
  const [name, setName] = useState('');
  const [pack, setPack] = useState<OilPackInput>(emptyOilPackInput());
  const [intent, setIntent] = useState<GiveOilIntent>(initialIntent);
  const [sellTaken, setSellTaken] = useState(true);
  const [alreadyPaid, setAlreadyPaid] = useState(true);
  const [amount, setAmount] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [poolKey, setPoolKey] = useState<string | null>(null);
  const [showPools, setShowPools] = useState(false);

  const freePools = useMemo(() => pools.filter(poolHasFreeOil), [pools]);
  const fullestPool = [...freePools].sort((a, b) => b.available.litres - a.available.litres)[0] || null;
  const selectedPool = freePools.find((pool) => pool.key === poolKey) || fullestPool;
  const max = selectedPool?.available || available;
  const unnamed = t('lots.noField');
  const locale = i18n.language;
  const stepIndex = STEPS.indexOf(step);

  useEffect(() => {
    if (!open) return;
    setWhoMode(initialWho);
    setPlace('outside');
    setName('');
    setPack(emptyOilPackInput());
    setIntent(initialWho === 'home' && initialIntent === 'sell' ? 'hold' : initialIntent);
    setSellTaken(true);
    setAlreadyPaid(true);
    setAmount('');
    setSaveError(null);
    setPoolKey(null);
    setShowPools(false);
    // Home set-aside already knows the recipient, so it opens on the amount.
    setStep(initialWho === 'home' ? 'howMuch' : 'who');
  }, [open, initialWho, initialIntent]);

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

  const setCount = (key: keyof OilPackInput, raw: number) => {
    setPack((prev) => clampPackInput({ ...prev, [key]: raw }, max));
  };

  const nameOk = whoMode === 'home' || name.trim().length > 0;
  const isSale = intent === 'sell' && whoMode !== 'home';
  const alreadyDelivered = intent === 'give' || (isSale && sellTaken);
  const canContinueWho = nameOk;
  const canContinueHowMuch = totalLitres > 0.05;
  const canSave = nameOk && totalLitres > 0.05 && (!isSale || Number(amount) > 0);

  const resolvedName = useMemo(() => {
    if (whoMode === 'home') return t('give.homeName');
    return name.trim();
  }, [whoMode, name, t]);

  const saveLabel = isSale
    ? t('give.saveSell')
    : intent === 'give'
      ? t('give.saveGive')
      : t('give.saveHold');

  const requestClose = () => {
    if (!busy) onClose();
  };

  const submit = () => {
    if (busy) return;
    setSaveError(null);
    void onSave({
      counterpartyName: resolvedName,
      requested: pack,
      isSale,
      amount: isSale ? Number(amount) : undefined,
      alreadyDelivered,
      alreadyPaid: isSale ? alreadyPaid : false,
      forHome: whoMode === 'home',
      poolKey: selectedPool?.key,
    }).catch(() => setSaveError(t('error')));
  };

  const goBack = () => {
    if (step === 'intent') setStep('howMuch');
    else if (step === 'howMuch' && whoMode !== 'home') setStep('who');
    else requestClose();
  };

  const goNext = () => {
    if (step === 'who' && canContinueWho) setStep('howMuch');
    else if (step === 'howMuch' && canContinueHowMuch) setStep('intent');
  };

  const intents: Array<{
    id: GiveOilIntent;
    title: string;
    hint: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
  }> = [
    {
      id: 'hold',
      title: t('give.intentHold'),
      hint: t('give.intentHoldHint'),
      icon: 'bookmark-outline',
    },
    {
      id: 'give',
      title: t('give.intentGive'),
      hint: t('give.intentGiveHint'),
      icon: 'water-outline',
    },
    ...(whoMode === 'home'
      ? []
      : [
          {
            id: 'sell' as const,
            title: t('give.intentSell'),
            hint: t('give.intentSellHint'),
            icon: 'cash-outline' as const,
          },
        ]),
  ];

  const subtitle =
    step === 'who' ? t('give.who') : step === 'howMuch' ? t('give.what') : t('give.intent');

  const steppers = (
    [
      ['tin16', t('give.tin16')],
      ['tin17', t('give.tin17')],
      ['bulkLitres', t('give.bulk')],
    ] as const
  );

  const primary =
    step === 'intent'
      ? {
          label: busy ? t('give.saving') : saveLabel,
          disabled: !canSave || busy,
          onPress: submit,
        }
      : {
          label: t('give.continue'),
          disabled: (step === 'who' ? !canContinueWho : !canContinueHowMuch) || busy,
          onPress: goNext,
        };

  return (
    <Sheet
      open={open}
      onClose={requestClose}
      edge="end"
      size="lg"
      accent
      title={
        intent === 'sell' ? t('actions.sell') : intent === 'give' ? t('actions.verbGive') : t('actions.hold')
      }
      subtitle={subtitle}
      icon={<Ionicons name="water-outline" size={18} color={colors.primary} />}
      footer={
        <View style={styles.footerRow}>
          <Pressable disabled={busy} onPress={goBack} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>
              {step === 'who' ? t('give.cancel') : t('give.back')}
            </Text>
          </Pressable>
          <Pressable
            disabled={primary.disabled}
            onPress={primary.onPress}
            style={[styles.btnPrimary, primary.disabled && styles.btnPrimaryDisabled]}
          >
            <Text style={styles.btnPrimaryText}>{primary.label}</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.flow}>
        <View style={styles.pagerDots} accessibilityRole="progressbar">
          {STEPS.map((id, i) => (
            <View
              key={id}
              style={[
                styles.pagerDot,
                i < stepIndex && styles.pagerDotDone,
                i === stepIndex && styles.pagerDotOn,
              ]}
            />
          ))}
        </View>

        {step === 'who' ? (
          <OilRecipientStep place={place} onPlace={setPlace} name={name} onName={setName} />
        ) : null}

        {step === 'howMuch' ? (
          <>
            <Text style={[styles.flowStep, styles.flowStepFirst]}>{t('give.what')}</Text>
            <View style={styles.stepper}>
              {steppers.map(([key, label]) => {
                const atMax =
                  max != null &&
                  (key === 'bulkLitres' ? pack.bulkLitres >= max.bulkLitres : pack[key] >= max[key]);
                return (
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
                      <PackStepperInput
                        value={pack[key]}
                        max={max ? (key === 'bulkLitres' ? max.bulkLitres : max[key]) : undefined}
                        decimal={key === 'bulkLitres'}
                        label={label}
                        display={
                          key === 'bulkLitres'
                            ? formatOilNumber(pack.bulkLitres, locale)
                            : String(pack[key] || 0)
                        }
                        onChange={(next) => setCount(key, next)}
                        style={styles.stepperInput}
                        color={colors.textPrimary}
                      />
                      <Pressable
                        accessibilityLabel="+"
                        onPress={() => bump(key, 1)}
                        disabled={atMax}
                        style={[styles.stepperBtn, atMax && styles.stepperBtnDisabled]}
                      >
                        <Text style={styles.stepperValue}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
            {totalLitres > 0.05 ? (
              <Text style={styles.flowTotal}>
                {t('give.totalLitres', { amount: formatOilNumber(totalLitres, locale) })}
              </Text>
            ) : null}

            {/* Most cellars are one pile; the field split only matters to the few who ask for it. */}
            {freePools.length > 1 ? (
              <>
                <Pressable style={styles.linkish} onPress={() => setShowPools((v) => !v)}>
                  <Text style={styles.linkishText}>
                    {showPools ? t('give.less') : t('give.more')}
                  </Text>
                </Pressable>
                {showPools ? (
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
                                  amount: formatOilNumber(pool.available.litres, locale),
                                })}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}

        {step === 'intent' ? (
          <>
            <Text style={[styles.flowStep, styles.flowStepFirst]}>{t('give.intent')}</Text>
            <View style={styles.intentList}>
              {intents.map((item) => {
                const on = intent === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setIntent(item.id)}
                    style={[styles.intentCard, on && styles.intentCardOn]}
                  >
                    <View style={styles.intentIcon}>
                      <Ionicons name={item.icon} size={18} color={colors.primary} />
                    </View>
                    <View style={styles.intentBody}>
                      <Text style={styles.intentTitle}>{item.title}</Text>
                      <Text style={styles.intentHint}>{item.hint}</Text>
                    </View>
                  </Pressable>
                );
              })}
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
                <View style={styles.toggle}>
                  <Pressable
                    onPress={() => setAlreadyPaid(true)}
                    style={[styles.toggleBtn, alreadyPaid && styles.toggleBtnOn]}
                  >
                    <Text style={[styles.toggleBtnText, alreadyPaid && styles.toggleBtnTextOn]}>
                      {t('give.paid')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setAlreadyPaid(false)}
                    style={[styles.toggleBtn, !alreadyPaid && styles.toggleBtnOn]}
                  >
                    <Text style={[styles.toggleBtnText, !alreadyPaid && styles.toggleBtnTextOn]}>
                      {t('give.notPaid')}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.toggle}>
                  <Pressable
                    onPress={() => setSellTaken(true)}
                    style={[styles.toggleBtn, sellTaken && styles.toggleBtnOn]}
                  >
                    <Text style={[styles.toggleBtnText, sellTaken && styles.toggleBtnTextOn]}>
                      {t('give.tookIt')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSellTaken(false)}
                    style={[styles.toggleBtn, !sellTaken && styles.toggleBtnOn]}
                  >
                    <Text style={[styles.toggleBtnText, !sellTaken && styles.toggleBtnTextOn]}>
                      {t('give.stillHere')}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {saveError ? <Text style={styles.giveError}>{saveError}</Text> : null}
      </View>
    </Sheet>
  );
}

export { OilMovementSheet as GiveOilSheet };
