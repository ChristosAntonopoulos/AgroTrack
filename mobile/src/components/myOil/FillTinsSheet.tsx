import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import { useTheme } from '../../context/ThemeContext';
import { formatOilNumber } from '../../myOil/formatOilPack';
import { poolLabel, type FieldOilPool } from '../../myOil/fieldPools';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  open: boolean;
  pools: FieldOilPool[];
  fieldNames?: Record<string, string>;
  /** When set, fill this field and skip the chooser. */
  preferredKey?: string | null;
  busy: boolean;
  onClose: () => void;
  onSave: (pool: FieldOilPool, add16: number, add17: number) => Promise<void>;
};

type Step = 'source' | 'fill';

export function FillTinsSheet({
  open,
  pools,
  fieldNames = {},
  preferredKey,
  busy,
  onClose,
  onSave,
}: Props) {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const locale = i18n.language;
  const unnamed = t('lots.noField');

  const withBulk = useMemo(
    () => pools.filter((pool) => pool.available.bulkLitres > 0.05),
    [pools]
  );

  const [step, setStep] = useState<Step>('fill');
  const [poolKey, setPoolKey] = useState<string | null>(null);
  const [add16, setAdd16] = useState(0);
  const [add17, setAdd17] = useState(0);

  useEffect(() => {
    if (!open) return;
    setAdd16(0);
    setAdd17(0);
    const preferred = preferredKey ? withBulk.find((pool) => pool.key === preferredKey) : null;
    if (preferred) {
      setPoolKey(preferred.key);
      setStep('fill');
      return;
    }
    setPoolKey(withBulk[0]?.key ?? null);
    setStep(withBulk.length > 1 ? 'source' : 'fill');
  }, [open, preferredKey, withBulk]);

  const selected = withBulk.find((pool) => pool.key === poolKey) || withBulk[0] || null;
  const bulk = selected?.available.bulkLitres || 0;
  const used = add16 * 16 + add17 * 17;
  const left = Math.round((bulk - used) * 10) / 10;
  const canSave = !!selected && used > 0 && left >= -0.05;
  const label = selected ? poolLabel(selected, fieldNames, unnamed) : '';
  const mustChoose = !preferredKey && withBulk.length > 1;

  const footer =
    withBulk.length === 0 ? (
      <View style={styles.footerRow}>
        <Pressable disabled={busy} onPress={onClose} style={styles.btnSecondary}>
          <Text style={styles.btnSecondaryText}>{t('fill.cancel')}</Text>
        </Pressable>
      </View>
    ) : step === 'source' ? (
      <View style={styles.footerRow}>
        <Pressable disabled={busy} onPress={onClose} style={styles.btnSecondary}>
          <Text style={styles.btnSecondaryText}>{t('fill.cancel')}</Text>
        </Pressable>
        <Pressable
          disabled={!selected}
          onPress={() => {
            setAdd16(0);
            setAdd17(0);
            setStep('fill');
          }}
          style={[styles.btnPrimary, !selected && styles.btnPrimaryDisabled]}
        >
          <Text style={styles.btnPrimaryText}>{t('fill.continue')}</Text>
        </Pressable>
      </View>
    ) : (
      <View style={styles.footerRow}>
        <Pressable
          disabled={busy}
          onPress={() => {
            if (mustChoose) setStep('source');
            else onClose();
          }}
          style={styles.btnSecondary}
        >
          <Text style={styles.btnSecondaryText}>{mustChoose ? t('fill.back') : t('fill.cancel')}</Text>
        </Pressable>
        <Pressable
          disabled={busy || !canSave}
          onPress={() => selected && void onSave(selected, add16, add17)}
          style={[styles.btnPrimary, (busy || !canSave) && styles.btnPrimaryDisabled]}
        >
          <Text style={styles.btnPrimaryText}>{t('fill.save')}</Text>
        </Pressable>
      </View>
    );

  return (
    <Sheet
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      edge="end"
      size="lg"
      accent
      title={t('fill.title')}
      subtitle={step === 'source' ? t('fill.sourceSubtitle') : label || undefined}
      icon={<Ionicons name="cube-outline" size={18} color={colors.primary} />}
      footer={footer}
    >
      <View style={styles.flow}>
        {withBulk.length === 0 ? (
          <Text style={styles.emptyBody}>{t('fill.noBulk')}</Text>
        ) : step === 'source' ? (
          <>
            <Text style={[styles.flowStep, styles.flowStepFirst]}>{t('fill.chooseSource')}</Text>
            <View style={styles.sourceList}>
              {withBulk.map((pool) => {
                const name = poolLabel(pool, fieldNames, unnamed);
                const on = pool.key === (selected?.key ?? null);
                return (
                  <Pressable
                    key={pool.key}
                    onPress={() => setPoolKey(pool.key)}
                    style={[styles.sourceCard, on && styles.sourceCardOn]}
                  >
                    <View style={styles.sourceCardIcon}>
                      <Ionicons name="leaf-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.sourceCardBody}>
                      <Text style={styles.sourceCardTitle}>{name}</Text>
                      <Text style={styles.sourceCardMeta}>
                        {t('fill.bulkChip', {
                          amount: formatOilNumber(pool.available.bulkLitres, locale),
                        })}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.flowStep}>{t('fill.bulkAvailable')}</Text>
            <Text style={styles.flowQty}>{formatOilNumber(bulk, locale)} L</Text>

            <Text style={styles.flowStep}>{t('fill.what')}</Text>
            <View style={styles.stepper}>
              <View style={styles.stepperRow}>
                <Text style={styles.stepperLabel}>16 L</Text>
                <View style={styles.stepperControls}>
                  <Pressable
                    onPress={() => setAdd16((n) => Math.max(0, n - 1))}
                    disabled={add16 <= 0}
                    style={[styles.stepperBtn, add16 <= 0 && styles.stepperBtnDisabled]}
                  >
                    <Text style={styles.stepperValue}>−</Text>
                  </Pressable>
                  <Text style={styles.stepperValue}>{add16}</Text>
                  <Pressable
                    onPress={() => setAdd16((n) => n + 1)}
                    disabled={left - 16 < -0.05}
                    style={[styles.stepperBtn, left - 16 < -0.05 && styles.stepperBtnDisabled]}
                  >
                    <Text style={styles.stepperValue}>+</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.stepperRow}>
                <Text style={styles.stepperLabel}>17 L</Text>
                <View style={styles.stepperControls}>
                  <Pressable
                    onPress={() => setAdd17((n) => Math.max(0, n - 1))}
                    disabled={add17 <= 0}
                    style={[styles.stepperBtn, add17 <= 0 && styles.stepperBtnDisabled]}
                  >
                    <Text style={styles.stepperValue}>−</Text>
                  </Pressable>
                  <Text style={styles.stepperValue}>{add17}</Text>
                  <Pressable
                    onPress={() => setAdd17((n) => n + 1)}
                    disabled={left - 17 < -0.05}
                    style={[styles.stepperBtn, left - 17 < -0.05 && styles.stepperBtnDisabled]}
                  >
                    <Text style={styles.stepperValue}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <Text style={styles.flowTotal}>
              {t('fill.used', { amount: formatOilNumber(used, locale) })}
            </Text>
            <Text style={styles.flowHint}>
              {t('fill.left', { amount: formatOilNumber(Math.max(0, left), locale) })}
            </Text>
          </>
        )}
      </View>
    </Sheet>
  );
}
