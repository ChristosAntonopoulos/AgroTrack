import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import { useTheme } from '../../context/ThemeContext';
import { clampPackInput, emptyOilPackInput, packLitresOf, type OilPackInput } from '../../myOil/packInput';
import type { OilLot } from '../../services/oilStockService';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  open: boolean;
  lot: OilLot | null;
  kind: string;
  busy: boolean;
  onClose: () => void;
  onSave: (kind: string, pack: OilPackInput) => Promise<void>;
};

const KIND_OPTIONS = ['gifted', 'home_use', 'consumed', 'correction', 'returned'] as const;

export function AdjustSheet({ open, lot, kind: initialKind, busy, onClose, onSave }: Props) {
  const { t } = useTranslation(['myOil', 'common']);
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const [kind, setKind] = useState(initialKind);
  const [pack, setPack] = useState<OilPackInput>(emptyOilPackInput());
  const additive = kind === 'correction' || kind === 'returned';

  useEffect(() => {
    if (open) {
      setKind(initialKind);
      setPack(emptyOilPackInput());
    }
  }, [open, initialKind]);

  if (!lot) return null;

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
      footer={
        <View style={styles.footerRow}>
          <Pressable disabled={busy} onPress={onClose} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>{t('sheet.cancel')}</Text>
          </Pressable>
          <Pressable
            disabled={busy || packLitresOf(pack) <= 0.05}
            onPress={() => void onSave(kind, pack)}
            style={[
              styles.btnPrimary,
              (busy || packLitresOf(pack) <= 0.05) && styles.btnPrimaryDisabled,
            ]}
          >
            <Text style={styles.btnPrimaryText}>{t('adjustSheet.save')}</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.flow}>
        <Text style={[styles.flowStep, styles.flowStepFirst]}>{t('adjustSheet.kind')}</Text>
        <View style={styles.toggle}>
          {KIND_OPTIONS.map((k) => (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={[styles.toggleBtn, kind === k && styles.toggleBtnOn]}
            >
              <Text style={[styles.toggleBtnText, kind === k && styles.toggleBtnTextOn]}>
                {t(`adjustSheet.${k}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('sheet.tin16')}</Text>
          <TextInput
            keyboardType="number-pad"
            value={pack.tin16 ? String(pack.tin16) : ''}
            onChangeText={(v) =>
              setPack(
                clampPackInput(
                  { ...pack, tin16: Number(v) || 0 },
                  additive ? undefined : lot.available
                )
              )
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
            onChangeText={(v) =>
              setPack(
                clampPackInput(
                  { ...pack, tin17: Number(v) || 0 },
                  additive ? undefined : lot.available
                )
              )
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
            onChangeText={(v) =>
              setPack(
                clampPackInput(
                  { ...pack, bulkLitres: Number(v) || 0 },
                  additive ? undefined : lot.available
                )
              )
            }
            style={styles.fieldInput}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      </View>
    </Sheet>
  );
}
