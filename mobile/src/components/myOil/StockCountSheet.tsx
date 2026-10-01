import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import { useTheme } from '../../context/ThemeContext';
import { formatOilNumber } from '../../myOil/formatOilPack';
import { deltaLitres, isEmptyDelta, stockCountDeltas, type PackDelta } from '../../myOil/stockCount';
import type { OilPack } from '../../services/oilStockService';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  open: boolean;
  /** What the books say is in the cellar right now. */
  expected: OilPack;
  busy: boolean;
  onClose: () => void;
  onSave: (actual: PackDelta, reason: string) => Promise<void>;
};

/**
 * The farmer walks the cellar and types what is actually there. The difference against the books
 * becomes one correction, with their own words as the reason.
 */
export function StockCountSheet({ open, expected, busy, onClose, onSave }: Props) {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const locale = i18n.language;
  const [tin16, setTin16] = useState('');
  const [tin17, setTin17] = useState('');
  const [bulk, setBulk] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) return;
    setTin16(String(expected.tin16));
    setTin17(String(expected.tin17));
    setBulk(String(expected.bulkLitres));
    setReason('');
  }, [open, expected.tin16, expected.tin17, expected.bulkLitres]);

  const actual: PackDelta = {
    tin16: Math.max(0, Math.round(Number(tin16) || 0)),
    tin17: Math.max(0, Math.round(Number(tin17) || 0)),
    bulkLitres: Math.max(0, Number(bulk) || 0),
  };
  const { add, remove } = stockCountDeltas(expected, actual);
  const changed = !isEmptyDelta(add) || !isEmptyDelta(remove);
  const net = deltaLitres(add) - deltaLitres(remove);

  const rows: {
    key: keyof PackDelta;
    label: string;
    value: string;
    set: (v: string) => void;
    /** What the books say, ready to drop back into the field. */
    book: string;
    bookLabel: string;
  }[] = [
    {
      key: 'tin16',
      label: t('sheet.tin16'),
      value: tin16,
      set: setTin16,
      book: String(expected.tin16),
      bookLabel: `${t('warehouse.pack16')} · ${expected.tin16}`,
    },
    {
      key: 'tin17',
      label: t('sheet.tin17'),
      value: tin17,
      set: setTin17,
      book: String(expected.tin17),
      bookLabel: `${t('warehouse.pack17')} · ${expected.tin17}`,
    },
    {
      key: 'bulkLitres',
      label: t('sheet.bulk'),
      value: bulk,
      set: setBulk,
      book: String(expected.bulkLitres),
      bookLabel: `${t('warehouse.packBulk')} · ${formatOilNumber(expected.bulkLitres, locale)} L`,
    },
  ];

  return (
    <Sheet
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      edge="end"
      size="md"
      accent
      title={t('count.title')}
      subtitle={t('count.subtitle')}
      icon={<Ionicons name="options-outline" size={18} color={colors.primary} />}
      footer={
        <View style={styles.footerRow}>
          <Pressable onPress={onClose} disabled={busy} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>{t('sheet.cancel')}</Text>
          </Pressable>
          <Pressable
            disabled={busy || !changed}
            onPress={() => void onSave(actual, reason.trim())}
            style={[styles.btnPrimary, (busy || !changed) && styles.btnPrimaryDisabled]}
          >
            <Text style={styles.btnPrimaryText}>{t('count.save')}</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.flow}>
        <Text style={[styles.flowStep, styles.flowStepFirst]}>{t('count.actual')}</Text>
        {rows.map((row) => (
          <View style={styles.field} key={row.key}>
            <Text style={styles.fieldLabel}>{row.label}</Text>
            <TextInput
              style={styles.fieldInput}
              keyboardType="decimal-pad"
              value={row.value}
              onChangeText={row.set}
            />
          </View>
        ))}

        {/* The books stay a quiet reference; tapping one puts that number back in the field. */}
        <Text style={styles.flowStep}>{t('count.expected')}</Text>
        <View style={styles.chipsRow}>
          {rows.map((row) => (
            <Pressable key={row.key} onPress={() => row.set(row.book)} style={styles.chipFilter}>
              <Text style={styles.chipFilterText}>{row.bookLabel}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.flowHint, net < -0.05 && styles.waitingMetaWarn]}>
          {!changed
            ? t('count.matches')
            : net >= 0
              ? t('count.surplus', { amount: formatOilNumber(Math.abs(net), locale) })
              : t('count.shortfall', { amount: formatOilNumber(Math.abs(net), locale) })}
        </Text>

        {changed ? (
          <View style={[styles.field, { marginTop: 14 }]}>
            <Text style={styles.fieldLabel}>{t('count.reason')}</Text>
            <TextInput
              style={styles.fieldInput}
              value={reason}
              onChangeText={setReason}
              placeholder={t('count.reasonPlaceholder')}
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}
