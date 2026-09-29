import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import { useTheme } from '../../context/ThemeContext';
import { clampPackInput, packLitresOf, type OilPackInput } from '../../myOil/packInput';
import { formatOilPack } from '../../myOil/formatOilPack';
import { tinCount } from '../../myOil/commitmentCopy';
import type { OilCommitment } from '../../services/oilStockService';
import type { PackLabels } from './types';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  open: boolean;
  commitment: OilCommitment | null;
  pack: OilPackInput;
  setPack: (p: OilPackInput) => void;
  packLabels: PackLabels;
  busy: boolean;
  onClose: () => void;
  onDeliverAll: () => void;
  onDeliverPartial: () => void;
};

export function DeliverPartialSheet({
  open,
  commitment,
  pack,
  setPack,
  packLabels,
  busy,
  onClose,
  onDeliverAll,
  onDeliverPartial,
}: Props) {
  const { t } = useTranslation(['myOil', 'common']);
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);

  if (!commitment) return null;

  return (
    <Sheet
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      edge="end"
      size="lg"
      accent
      title={t('deliverAllPrompt')}
      subtitle={formatOilPack(commitment.remaining, packLabels)}
      footer={
        <View style={styles.footerRow}>
          <Pressable disabled={busy} onPress={onClose} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>{t('cancel')}</Text>
          </Pressable>
          <Pressable
            disabled={busy || packLitresOf(pack) <= 0.05}
            onPress={onDeliverPartial}
            style={[
              styles.btnPrimary,
              (busy || packLitresOf(pack) <= 0.05) && styles.btnPrimaryDisabled,
            ]}
          >
            <Text style={styles.btnPrimaryText}>{t('deliverPartialSave')}</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.flow}>
        <Pressable
          disabled={busy}
          onPress={onDeliverAll}
          style={[styles.btnPrimary, busy && styles.btnPrimaryDisabled, { marginBottom: 12 }]}
        >
          <Text style={styles.btnPrimaryText}>
            {t('deliverAll', {
              count: tinCount(commitment.remaining) || Math.round(commitment.remaining.bulkLitres),
            })}
          </Text>
        </Pressable>

        <Text style={styles.flowStep}>{t('deliverPartial')}</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('sheet.tin16')}</Text>
          <TextInput
            keyboardType="number-pad"
            value={pack.tin16 ? String(pack.tin16) : ''}
            onChangeText={(v) =>
              setPack(
                clampPackInput(
                  { ...pack, tin16: Number(v) || 0 },
                  commitment.remaining
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
                  commitment.remaining
                )
              )
            }
            style={styles.fieldInput}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        {commitment.remaining.bulkLitres > 0.05 ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('sheet.bulk')}</Text>
            <TextInput
              keyboardType="decimal-pad"
              value={pack.bulkLitres ? String(pack.bulkLitres) : ''}
              onChangeText={(v) =>
                setPack(
                  clampPackInput(
                    { ...pack, bulkLitres: Number(v) || 0 },
                    commitment.remaining
                  )
                )
              }
              style={styles.fieldInput}
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}
