import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import { useTheme } from '../../context/ThemeContext';
import { radii } from '../../theme';
import { HarvestNumberStepper } from '../../harvestCampaign/components/HarvestNumberStepper';
import { formatOilNumber } from '../../myOil/formatOilPack';
import { groveShelfTitle, type GroveOilGroup } from '../../myOil/groupLotsByGrove';
import { packLitresOf, type OilPackInput } from '../../myOil/packInput';
import type { OilLot } from '../../services/oilStockService';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  open: boolean;
  group: GroveOilGroup | null;
  fieldNames: Record<string, string>;
  busy: boolean;
  onClose: () => void;
  onSave: (changes: { id: string; packing: OilPackInput }[]) => Promise<void>;
};

type Draft = { tin16: number; tin17: number; bulk: string };

const draftOf = (lot: OilLot): Draft => ({
  tin16: lot.packing.tin16 || 0,
  tin17: lot.packing.tin17 || 0,
  bulk: String(lot.packing.bulkLitres || 0),
});

const asPack = (draft: Draft): OilPackInput => ({
  tin16: Math.max(0, Math.round(draft.tin16 || 0)),
  tin17: Math.max(0, Math.round(draft.tin17 || 0)),
  bulkLitres: Math.max(0, Math.round((Number(draft.bulk) || 0) * 10) / 10),
});

const lotTitle = (lot: OilLot, locale: string, fallback: string) => {
  const date = new Date(lot.pressedOn);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
};

/** Change the loose oil and the 16 L / 17 L tins already sitting on one shelf. */
export function EditShelfSheet({ open, group, fieldNames, busy, onClose, onSave }: Props) {
  const { t, i18n } = useTranslation(['myOil', 'fields', 'common']);
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const locale = i18n.language;
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  useEffect(() => {
    if (!open || !group) return;
    const next: Record<string, Draft> = {};
    group.lots.forEach((lot) => {
      next[lot.id] = draftOf(lot);
    });
    setDrafts(next);
  }, [open, group]);

  const named = group
    ? groveShelfTitle(group, fieldNames, {
        shared: t('byGrove.sharedTitle'),
        unassigned: t('byGrove.unassigned'),
      })
    : null;

  const rows = (group?.lots || []).map((lot) => {
    const draft = drafts[lot.id] || draftOf(lot);
    const pack = asPack(draft);
    const reserved = lot.reserved;
    const underReserved =
      pack.tin16 < (reserved?.tin16 || 0) ||
      pack.tin17 < (reserved?.tin17 || 0) ||
      pack.bulkLitres + 0.05 < (reserved?.bulkLitres || 0);
    const changed =
      pack.tin16 !== (lot.packing.tin16 || 0) ||
      pack.tin17 !== (lot.packing.tin17 || 0) ||
      Math.abs(pack.bulkLitres - (lot.packing.bulkLitres || 0)) > 0.05;
    return { lot, draft, pack, underReserved, changed };
  });

  const blocked = rows.some((row) => row.underReserved);
  const canSave = rows.some((row) => row.changed) && !blocked;

  const setBulk = (id: string, bulk: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { tin16: 0, tin17: 0, bulk: '0' }), bulk },
    }));
  };

  const setTin = (id: string, size: 16 | 17, count: number) => {
    const key = size === 16 ? 'tin16' : 'tin17';
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { tin16: 0, tin17: 0, bulk: '0' }), [key]: Math.max(0, Math.round(count)) },
    }));
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
      title={t('byGrove.editTitle')}
      subtitle={named?.title || t('byGrove.editHint')}
      icon={<Ionicons name="pencil-outline" size={18} color={colors.primary} />}
      footer={
        <View style={styles.footerRow}>
          <Pressable onPress={onClose} disabled={busy} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>{t('sheet.cancel')}</Text>
          </Pressable>
          <Pressable
            disabled={busy || !canSave}
            onPress={() =>
              void onSave(
                rows.filter((row) => row.changed).map((row) => ({ id: row.lot.id, packing: row.pack }))
              )
            }
            style={[styles.btnPrimary, (busy || !canSave) && styles.btnPrimaryDisabled]}
          >
            <Text style={styles.btnPrimaryText}>{t('byGrove.editSave')}</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.flow}>
        <Text style={styles.flowHint}>{t('byGrove.editHint')}</Text>
        {rows.map(({ lot, draft, pack, underReserved }, index) => (
          <View key={lot.id} style={{ gap: 10, marginTop: index === 0 ? 8 : 16 }}>
            {rows.length > 1 ? (
              <Text style={styles.flowStep}>
                {lotTitle(lot, locale, t('byGrove.batch', { batch: lot.batchId }))}
              </Text>
            ) : null}
            <View style={local.amount}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('sheet.bulk')}</Text>
              <View
                style={[
                  local.amountRow,
                  { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
                ]}
              >
                <TextInput
                  value={draft.bulk}
                  onChangeText={(value) => setBulk(lot.id, value)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  autoFocus={index === 0}
                  accessibilityLabel={t('sheet.bulk')}
                  style={[local.amountInput, { color: colors.textPrimary }]}
                />
                <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>L</Text>
              </View>
            </View>
            <HarvestNumberStepper
              label="16 L"
              value={draft.tin16}
              onChange={(next) => setTin(lot.id, 16, next)}
              min={0}
              suffix={t('fields:harvestCampaign.oil.tinSuffix')}
            />
            <HarvestNumberStepper
              label="17 L"
              value={draft.tin17}
              onChange={(next) => setTin(lot.id, 17, next)}
              min={0}
              suffix={t('fields:harvestCampaign.oil.tinSuffix')}
            />
            <Text style={styles.flowTotal}>
              {t('litres', { amount: formatOilNumber(packLitresOf(pack), locale) })}
            </Text>
            {underReserved ? (
              <Text style={{ color: colors.error, fontWeight: '700' }}>{t('byGrove.editReserved')}</Text>
            ) : null}
          </View>
        ))}
      </View>
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
