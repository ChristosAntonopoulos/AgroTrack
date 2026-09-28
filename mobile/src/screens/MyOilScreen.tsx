import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ScreenLayout from '../components/layout/ScreenLayout';
import {
  oilStockService,
  type OilCommitment,
  type OilLot,
  type OilStockSummary,
  type StockMovement,
} from '../services/oilStockService';
import { migrateLocalOilPackingOnce } from '../myOil/syncOilLots';
import { formatOilPack } from '../myOil/formatOilPack';
import { clampPackInput, emptyOilPackInput, packLitresOf, type OilPackInput } from '../myOil/packInput';
import { getFieldService } from '../services/serviceFactory';
import { fieldLabelMap } from '../utils/fieldLabels';

const MyOilScreen = () => {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const { user } = useAuth();
  const { colors, tapMin } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [summary, setSummary] = useState<OilStockSummary | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [fieldNames, setFieldNames] = useState<Record<string, string>>({});
  const [showGive, setShowGive] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [repackLot, setRepackLot] = useState<OilLot | null>(null);
  const [adjustLot, setAdjustLot] = useState<OilLot | null>(null);
  const [busy, setBusy] = useState(false);

  const packLabels = useMemo(
    () => ({
      tin: (count: number, size: number) => t('tin', { count, size }),
      bulk: (amount: number) => t('bulk', { amount }),
      litres: (amount: number) => t('litres', { amount }),
    }),
    [t]
  );

  const reload = useCallback(async () => {
    if (!user?.id) return;
    setError(false);
    try {
      await migrateLocalOilPackingOnce(user.id);
      const [next, moves, fields] = await Promise.all([
        oilStockService.getSummary(),
        oilStockService.listMovements(40),
        getFieldService().getFields(user.id, user.role || 'FieldOwner').catch(() => []),
      ]);
      setSummary(next);
      setMovements(moves);
      setFieldNames(fieldLabelMap(fields));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const formatWhen = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const onDeliver = async (commitment: OilCommitment) => {
    setBusy(true);
    try {
      await oilStockService.deliver(commitment.id);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const waiting = summary?.openCommitments || [];
  const hasStock =
    !!summary &&
    (summary.physical.litres > 0.05 ||
      summary.lots.length > 0 ||
      summary.delivered.litres > 0.05 ||
      waiting.length > 0);

  return (
    <ScreenLayout scroll tabBarInset padded>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textPrimary }}>{t('error')}</Text>
          <Pressable onPress={() => void reload()} style={[styles.btn, { backgroundColor: colors.primary, minHeight: tapMin }]}>
            <Text style={styles.btnText}>{t('common:retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      ) : !hasStock ? (
        <View style={styles.center}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('empty')}</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{t('emptyHint')}</Text>
        </View>
      ) : (
        <>
          <Text style={[styles.kicker, { color: colors.textSecondary }]}>{t('available')}</Text>
          <Text style={[styles.hero, { color: colors.textPrimary }]}>
            {t('litresAvailable', { amount: Math.round((summary!.available.litres || 0) * 10) / 10 })}
          </Text>
          <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>
            {formatOilPack(summary!.available, packLabels)}
          </Text>

          <Row label={t('inCellar')} value={formatOilPack(summary!.physical, packLabels)} colors={colors} />
          <Row label={t('reserved')} value={formatOilPack(summary!.reserved, packLabels)} colors={colors} />
          <Row label={t('pendingDelivery')} value={formatOilPack(summary!.pendingDelivery, packLabels)} colors={colors} />
          <Row label={t('delivered')} value={formatOilPack(summary!.delivered, packLabels)} colors={colors} />

          <Pressable
            disabled={busy}
            onPress={() => setShowGive(true)}
            style={[styles.btn, { backgroundColor: colors.primary, minHeight: tapMin, marginTop: 16 }]}
          >
            <Text style={styles.btnText}>{t('giveSell')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowHistory((v) => !v)}
            style={[styles.btnOutline, { borderColor: colors.borderLight, minHeight: tapMin }]}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{t('whyBalance')}</Text>
          </Pressable>

          {waiting.length > 0 ? (
            <View style={{ marginTop: 20 }}>
              <Text style={[styles.section, { color: colors.textPrimary }]}>{t('mustGive')}</Text>
              <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
                {t('personWaiting', { count: waiting.length })}
              </Text>
              {waiting.map((c) => (
                <View key={c.id} style={[styles.card, { borderBottomColor: colors.borderLight }]}>
                  <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{c.counterpartyName}</Text>
                  <Text style={{ color: colors.textSecondary }}>
                    {t(`status.${c.derivedStatus}`, { defaultValue: c.derivedStatus })}
                  </Text>
                  <Text style={{ color: colors.textPrimary }}>{formatOilPack(c.remaining, packLabels)}</Text>
                  <Pressable
                    disabled={busy}
                    onPress={() => void onDeliver(c)}
                    style={[styles.btn, { backgroundColor: colors.primary, minHeight: tapMin, marginTop: 8 }]}
                  >
                    <Text style={styles.btnText}>{t('markDelivered')}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={[styles.section, { color: colors.textPrimary, marginTop: 20 }]}>{t('lots')}</Text>
          {summary!.lots.map((lot) => {
            const where = lot.fieldIds.map((id) => fieldNames[id]).filter(Boolean).join(' · ');
            return (
              <View key={lot.id} style={[styles.card, { borderBottomColor: colors.borderLight }]}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{formatWhen(lot.pressedOn)}</Text>
                {where ? <Text style={{ color: colors.textSecondary }}>{where}</Text> : null}
                <Text style={{ color: colors.textSecondary }}>{formatOilPack(lot.packing, packLabels)}</Text>
                <View style={styles.rowActions}>
                  <Pressable onPress={() => setRepackLot(lot)} style={{ minHeight: tapMin, justifyContent: 'center' }}>
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('repack')}</Text>
                  </Pressable>
                  <Pressable onPress={() => setAdjustLot(lot)} style={{ minHeight: tapMin, justifyContent: 'center' }}>
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('adjust')}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}

          {showHistory ? (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.section, { color: colors.textPrimary }]}>{t('history')}</Text>
              {movements.map((m) => (
                <View key={m.id} style={[styles.histRow, { borderBottomColor: colors.borderLight }]}>
                  <Text style={{ flex: 1, color: colors.textPrimary }}>
                    {t(`movement.${m.kind}`, { defaultValue: m.kind })}
                    {m.notes ? ` — ${m.notes}` : ''}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>
                    {m.litresDelta > 0 ? '+' : ''}
                    {Math.round(m.litresDelta * 10) / 10} L
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}

      <GiveModal
        visible={showGive}
        available={summary?.available}
        busy={busy}
        colors={colors}
        tapMin={tapMin}
        onClose={() => setShowGive(false)}
        onSave={async (input) => {
          setBusy(true);
          try {
            await oilStockService.createCommitment(input);
            setShowGive(false);
            await reload();
          } finally {
            setBusy(false);
          }
        }}
      />

      <RepackModal
        lot={repackLot}
        busy={busy}
        colors={colors}
        tapMin={tapMin}
        onClose={() => setRepackLot(null)}
        onSave={async (add16, add17) => {
          if (!repackLot) return;
          setBusy(true);
          try {
            await oilStockService.repack(repackLot.id, add16, add17);
            setRepackLot(null);
            await reload();
          } finally {
            setBusy(false);
          }
        }}
      />

      <AdjustModal
        lot={adjustLot}
        busy={busy}
        colors={colors}
        tapMin={tapMin}
        onClose={() => setAdjustLot(null)}
        onSave={async (kind, pack) => {
          if (!adjustLot) return;
          setBusy(true);
          try {
            await oilStockService.adjust({ oilLotId: adjustLot.id, kind, pack });
            setAdjustLot(null);
            await reload();
          } finally {
            setBusy(false);
          }
        }}
      />
    </ScreenLayout>
  );
};

const Row = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { textPrimary: string; borderLight: string };
}) => (
  <View style={[styles.stripRow, { borderBottomColor: colors.borderLight }]}>
    <Text style={{ color: colors.textPrimary }}>{label}</Text>
    <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{value}</Text>
  </View>
);

type ThemeBits = {
  textPrimary: string;
  textSecondary: string;
  primary: string;
  borderLight: string;
  surface: string;
};

const GiveModal = ({
  visible,
  available,
  busy,
  colors,
  tapMin,
  onClose,
  onSave,
}: {
  visible: boolean;
  available?: OilStockSummary['available'];
  busy: boolean;
  colors: ThemeBits;
  tapMin: number;
  onClose: () => void;
  onSave: (input: {
    counterpartyName: string;
    requested: OilPackInput;
    isSale: boolean;
    amount?: number;
    alreadyDelivered: boolean;
  }) => Promise<void>;
}) => {
  const { t } = useTranslation('myOil');
  const [name, setName] = useState('');
  const [pack, setPack] = useState<OilPackInput>(emptyOilPackInput());
  const [isSale, setIsSale] = useState(true);
  const [amount, setAmount] = useState('');
  const [already, setAlready] = useState(false);
  const canSave = name.trim().length > 0 && packLitresOf(pack) > 0.05 && (!isSale || Number(amount) > 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <ScrollView style={[styles.modalPanel, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('sheet.title')}</Text>
          <Text style={{ color: colors.textSecondary }}>{t('sheet.who')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.input, { borderColor: colors.borderLight, color: colors.textPrimary }]}
          />
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{t('sheet.tin16')}</Text>
          <TextInput
            keyboardType="number-pad"
            value={pack.tin16 ? String(pack.tin16) : ''}
            onChangeText={(v) => setPack(clampPackInput({ ...pack, tin16: Number(v) || 0 }, available))}
            style={[styles.input, { borderColor: colors.borderLight, color: colors.textPrimary }]}
          />
          <Text style={{ color: colors.textSecondary }}>{t('sheet.tin17')}</Text>
          <TextInput
            keyboardType="number-pad"
            value={pack.tin17 ? String(pack.tin17) : ''}
            onChangeText={(v) => setPack(clampPackInput({ ...pack, tin17: Number(v) || 0 }, available))}
            style={[styles.input, { borderColor: colors.borderLight, color: colors.textPrimary }]}
          />
          <Text style={{ color: colors.textSecondary }}>{t('sheet.bulk')}</Text>
          <TextInput
            keyboardType="decimal-pad"
            value={pack.bulkLitres ? String(pack.bulkLitres) : ''}
            onChangeText={(v) =>
              setPack(clampPackInput({ ...pack, bulkLitres: Number(v) || 0 }, available))
            }
            style={[styles.input, { borderColor: colors.borderLight, color: colors.textPrimary }]}
          />
          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => setIsSale(true)}
              style={[styles.toggle, isSale && { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: isSale ? '#fff' : colors.textPrimary }}>{t('sheet.isSale')}: {t('sheet.yes')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setIsSale(false)}
              style={[styles.toggle, !isSale && { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: !isSale ? '#fff' : colors.textPrimary }}>{t('sheet.no')}</Text>
            </Pressable>
          </View>
          {isSale ? (
            <>
              <Text style={{ color: colors.textSecondary }}>{t('sheet.amount')}</Text>
              <TextInput
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                style={[styles.input, { borderColor: colors.borderLight, color: colors.textPrimary }]}
              />
            </>
          ) : null}
          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => setAlready(true)}
              style={[styles.toggle, already && { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: already ? '#fff' : colors.textPrimary }}>{t('sheet.alreadyTaken')}: {t('sheet.yes')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setAlready(false)}
              style={[styles.toggle, !already && { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: !already ? '#fff' : colors.textPrimary }}>{t('sheet.no')}</Text>
            </Pressable>
          </View>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={[styles.btnOutline, { borderColor: colors.borderLight, minHeight: tapMin, flex: 1 }]}>
              <Text style={{ color: colors.textPrimary }}>{t('sheet.cancel')}</Text>
            </Pressable>
            <Pressable
              disabled={!canSave || busy}
              onPress={() =>
                void onSave({
                  counterpartyName: name.trim(),
                  requested: pack,
                  isSale,
                  amount: isSale ? Number(amount) : undefined,
                  alreadyDelivered: already,
                })
              }
              style={[styles.btn, { backgroundColor: colors.primary, minHeight: tapMin, flex: 1, opacity: canSave ? 1 : 0.5 }]}
            >
              <Text style={styles.btnText}>{busy ? t('sheet.saving') : t('sheet.save')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const RepackModal = ({
  lot,
  busy,
  colors,
  tapMin,
  onClose,
  onSave,
}: {
  lot: OilLot | null;
  busy: boolean;
  colors: ThemeBits;
  tapMin: number;
  onClose: () => void;
  onSave: (add16: number, add17: number) => Promise<void>;
}) => {
  const { t } = useTranslation('myOil');
  const [add16, setAdd16] = useState(0);
  const [add17, setAdd17] = useState(0);
  const need = add16 * 16 + add17 * 17;
  const left = lot ? Math.round((lot.packing.bulkLitres - need) * 10) / 10 : 0;

  useEffect(() => {
    setAdd16(0);
    setAdd17(0);
  }, [lot?.id]);

  return (
    <Modal visible={!!lot} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <View style={[styles.modalPanel, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('repackSheet.title')}</Text>
          <Text style={{ color: colors.textSecondary }}>{t('repackHint')}</Text>
          <TextInput
            keyboardType="number-pad"
            placeholder={t('repackSheet.add16')}
            placeholderTextColor={colors.textSecondary}
            value={add16 ? String(add16) : ''}
            onChangeText={(v) => setAdd16(Math.max(0, Math.round(Number(v) || 0)))}
            style={[styles.input, { borderColor: colors.borderLight, color: colors.textPrimary }]}
          />
          <TextInput
            keyboardType="number-pad"
            placeholder={t('repackSheet.add17')}
            placeholderTextColor={colors.textSecondary}
            value={add17 ? String(add17) : ''}
            onChangeText={(v) => setAdd17(Math.max(0, Math.round(Number(v) || 0)))}
            style={[styles.input, { borderColor: colors.borderLight, color: colors.textPrimary }]}
          />
          <Text style={{ color: colors.textSecondary }}>{t('repackSheet.bulkLeft', { amount: left })}</Text>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={[styles.btnOutline, { borderColor: colors.borderLight, minHeight: tapMin, flex: 1 }]}>
              <Text style={{ color: colors.textPrimary }}>{t('sheet.cancel')}</Text>
            </Pressable>
            <Pressable
              disabled={busy || need <= 0 || left < -0.05}
              onPress={() => void onSave(add16, add17)}
              style={[styles.btn, { backgroundColor: colors.primary, minHeight: tapMin, flex: 1 }]}
            >
              <Text style={styles.btnText}>{t('repackSheet.save')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const AdjustModal = ({
  lot,
  busy,
  colors,
  tapMin,
  onClose,
  onSave,
}: {
  lot: OilLot | null;
  busy: boolean;
  colors: ThemeBits;
  tapMin: number;
  onClose: () => void;
  onSave: (kind: string, pack: OilPackInput) => Promise<void>;
}) => {
  const { t } = useTranslation('myOil');
  const [kind, setKind] = useState('gifted');
  const [pack, setPack] = useState<OilPackInput>(emptyOilPackInput());
  const additive = kind === 'correction' || kind === 'returned';

  useEffect(() => {
    setKind('gifted');
    setPack(emptyOilPackInput());
  }, [lot?.id]);

  return (
    <Modal visible={!!lot} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <ScrollView style={[styles.modalPanel, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('adjustSheet.title')}</Text>
          {(['gifted', 'home_use', 'consumed', 'correction', 'returned'] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={[styles.toggle, { marginBottom: 6 }, kind === k && { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: kind === k ? '#fff' : colors.textPrimary }}>{t(`adjustSheet.${k}`)}</Text>
            </Pressable>
          ))}
          <TextInput
            keyboardType="number-pad"
            placeholder={t('sheet.tin16')}
            placeholderTextColor={colors.textSecondary}
            value={pack.tin16 ? String(pack.tin16) : ''}
            onChangeText={(v) =>
              setPack(clampPackInput({ ...pack, tin16: Number(v) || 0 }, additive || !lot ? undefined : lot.packing))
            }
            style={[styles.input, { borderColor: colors.borderLight, color: colors.textPrimary }]}
          />
          <TextInput
            keyboardType="number-pad"
            placeholder={t('sheet.tin17')}
            placeholderTextColor={colors.textSecondary}
            value={pack.tin17 ? String(pack.tin17) : ''}
            onChangeText={(v) =>
              setPack(clampPackInput({ ...pack, tin17: Number(v) || 0 }, additive || !lot ? undefined : lot.packing))
            }
            style={[styles.input, { borderColor: colors.borderLight, color: colors.textPrimary }]}
          />
          <TextInput
            keyboardType="decimal-pad"
            placeholder={t('sheet.bulk')}
            placeholderTextColor={colors.textSecondary}
            value={pack.bulkLitres ? String(pack.bulkLitres) : ''}
            onChangeText={(v) =>
              setPack(
                clampPackInput({ ...pack, bulkLitres: Number(v) || 0 }, additive || !lot ? undefined : lot.packing)
              )
            }
            style={[styles.input, { borderColor: colors.borderLight, color: colors.textPrimary }]}
          />
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={[styles.btnOutline, { borderColor: colors.borderLight, minHeight: tapMin, flex: 1 }]}>
              <Text style={{ color: colors.textPrimary }}>{t('sheet.cancel')}</Text>
            </Pressable>
            <Pressable
              disabled={busy || packLitresOf(pack) <= 0.05}
              onPress={() => void onSave(kind, pack)}
              style={[styles.btn, { backgroundColor: colors.primary, minHeight: tapMin, flex: 1 }]}
            >
              <Text style={styles.btnText}>{t('adjustSheet.save')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  center: { paddingTop: 40, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  kicker: { textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 12 },
  hero: { fontSize: 34, fontWeight: '700', marginTop: 4 },
  section: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  stripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  btnOutline: {
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 14,
  },
  card: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowActions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  histRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalPanel: {
    maxHeight: '90%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  toggleRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  toggle: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 24 },
});

export default MyOilScreen;
