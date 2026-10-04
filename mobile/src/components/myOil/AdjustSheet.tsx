import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import { useTheme } from '../../context/ThemeContext';
import { clampPackInput, emptyOilPackInput, packLitresOf, type OilPackInput } from '../../myOil/packInput';
import { poolHasOil, poolLabel, type FieldOilPool } from '../../myOil/fieldPools';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  open: boolean;
  pools: FieldOilPool[];
  fieldNames?: Record<string, string>;
  /** When set, the change stays on this field. */
  lockedKey?: string | null;
  kind: string;
  busy: boolean;
  onClose: () => void;
  onSave: (kind: string, pack: OilPackInput, pool: FieldOilPool) => Promise<void>;
};

const KIND_OPTIONS = ['gifted', 'home_use', 'consumed', 'correction', 'returned'] as const;

export function AdjustSheet({
  open,
  pools,
  fieldNames = {},
  lockedKey,
  kind: initialKind,
  busy,
  onClose,
  onSave,
}: Props) {
  const { t } = useTranslation(['myOil', 'common']);
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const [kind, setKind] = useState(initialKind);
  const [pack, setPack] = useState<OilPackInput>(emptyOilPackInput());
  const [poolKey, setPoolKey] = useState<string | null>(lockedKey ?? null);
  const additive = kind === 'correction' || kind === 'returned';
  const unnamed = t('lots.noField');
  const choices = pools.filter(poolHasOil);
  const selected =
    choices.find((pool) => pool.key === (lockedKey || poolKey)) || choices[0] || null;
  const showPicker = !lockedKey && choices.length > 1;

  useEffect(() => {
    if (!open) return;
    setKind(initialKind);
    setPack(emptyOilPackInput());
    setPoolKey(lockedKey || null);
  }, [open, initialKind, lockedKey]);

  if (!open) return null;

  const max = additive ? undefined : selected?.available;

  return (
    <Sheet
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      edge="end"
      size="lg"
      accent
      title={t('adjustSheet.title')}
      subtitle={selected ? poolLabel(selected, fieldNames, unnamed) : undefined}
      footer={
        <View style={styles.footerRow}>
          <Pressable disabled={busy} onPress={onClose} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>{t('sheet.cancel')}</Text>
          </Pressable>
          <Pressable
            disabled={busy || !selected || packLitresOf(pack) <= 0.05}
            onPress={() => selected && void onSave(kind, pack, selected)}
            style={[
              styles.btnPrimary,
              (busy || !selected || packLitresOf(pack) <= 0.05) && styles.btnPrimaryDisabled,
            ]}
          >
            <Text style={styles.btnPrimaryText}>{t('adjustSheet.save')}</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.flow}>
        {showPicker ? (
          <>
            <Text style={[styles.flowStep, styles.flowStepFirst]}>{t('adjustSheet.field')}</Text>
            <View style={styles.sourceList}>
              {choices.map((pool) => {
                const on = pool.key === selected?.key;
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
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <Text style={[styles.flowStep, !showPicker && styles.flowStepFirst]}>{t('adjustSheet.kind')}</Text>
        <View style={styles.toggle}>
          {KIND_OPTIONS.map((option) => (
            <Pressable
              key={option}
              onPress={() => {
                setKind(option);
                setPack(emptyOilPackInput());
              }}
              style={[styles.toggleBtn, kind === option && styles.toggleBtnOn]}
            >
              <Text style={[styles.toggleBtnText, kind === option && styles.toggleBtnTextOn]}>
                {t(`adjustSheet.${option}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('sheet.tin16')}</Text>
          <TextInput
            keyboardType="number-pad"
            value={pack.tin16 ? String(pack.tin16) : ''}
            onChangeText={(value) =>
              setPack(clampPackInput({ ...pack, tin16: Number(value) || 0 }, max))
            }
            style={styles.fieldInput}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('sheet.tin17')}</Text>
          <TextInput
            keyboardType="number-pad"
            value={pack.tin17 ? String(pack.tin17) : ''}
            onChangeText={(value) =>
              setPack(clampPackInput({ ...pack, tin17: Number(value) || 0 }, max))
            }
            style={styles.fieldInput}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('sheet.bulk')}</Text>
          <TextInput
            keyboardType="decimal-pad"
            value={pack.bulkLitres ? String(pack.bulkLitres) : ''}
            onChangeText={(value) =>
              setPack(clampPackInput({ ...pack, bulkLitres: Number(value) || 0 }, max))
            }
            style={styles.fieldInput}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      </View>
    </Sheet>
  );
}
