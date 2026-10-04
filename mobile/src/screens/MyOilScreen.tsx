/**
 * Mobile Αποθήκη — how much is here, four actions, shelves, then where the oil went.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { useRegisterCapturePage } from '../context/CapturePageContext';
import ScreenLayout from '../components/layout/ScreenLayout';
import {
  OilStockTabs,
  OilStockHero,
  OilShelfPreview,
  OilShelvesSheet,
  OilPendingPressings,
  CommitmentsTab,
  MovementsTab,
  GiveOilSheet,
  FillTinsSheet,
  AdjustSheet,
  DeliverPartialSheet,
  StockCountSheet,
  createMyOilStyles,
  type GiveOilIntent,
  type GiveOilSaveInput,
} from '../components/myOil';
import { OilShareRequestsSection } from '../components/myOil/OilShareRequestsSection';
import {
  oilStockService,
  type OilCommitment,
  type OilPressing,
  type OilShareRequest,
  type OilStockSummary,
  type StockMovement,
} from '../services/oilStockService';
import { migrateLocalOilPackingOnce } from '../myOil/syncOilLots';
import { formatOilNumber } from '../myOil/formatOilPack';
import {
  drainCovers,
  groupLotsByField,
  planFieldAdd,
  planFieldDrain,
  planFieldFill,
  poolHasOil,
} from '../myOil/fieldPools';
import { groupLotsByGrove } from '../myOil/groupLotsByGrove';
import {
  holdState,
  needsNowCommitments,
  type OilStockTab,
} from '../myOil/commitmentCopy';
import {
  isEmptyDelta,
  newestLotId,
  planLotDrain,
  stockCountDeltas,
  type PackDelta,
} from '../myOil/stockCount';
import { emptyOilPackInput, type OilPackInput } from '../myOil/packInput';
import { agriculturalYearFor } from '../chronologio/agriculturalYear';
import { getFieldService } from '../services/serviceFactory';
import { fieldLabelMap } from '../utils/fieldLabels';
import { openHarvestCampaign } from '../navigation/intents';
import type { RootStackParamList } from '../navigation/types';

const MyOilScreen = () => {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const { user } = useAuth();
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'MyOil'>>();
  const focusFieldId = (route.params?.field || '').trim() || null;

  useRegisterCapturePage({
    sourcePage: 'warehouse',
    fieldId: focusFieldId || undefined,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [summary, setSummary] = useState<OilStockSummary | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [closedCommitments, setClosedCommitments] = useState<OilCommitment[]>([]);
  const [shareInbox, setShareInbox] = useState<OilShareRequest[]>([]);
  const [pendingPressings, setPendingPressings] = useState<OilPressing[]>([]);
  const [fieldNames, setFieldNames] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<OilStockTab>('stock');
  const [showGive, setShowGive] = useState(false);
  const [giveWho, setGiveWho] = useState<'someone' | 'home' | 'unnamed'>('someone');
  const [giveIntent, setGiveIntent] = useState<GiveOilIntent>('hold');
  const [showFill, setShowFill] = useState(false);
  const [fillPoolKey, setFillPoolKey] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustLock] = useState<string | null>(null);
  const [adjustKind] = useState('home_use');
  const [showCount, setShowCount] = useState(false);
  const [showShelves, setShowShelves] = useState(false);
  const [partialFor, setPartialFor] = useState<OilCommitment | null>(null);
  const [partialPack, setPartialPack] = useState<OilPackInput>(emptyOilPackInput());
  const [busy, setBusy] = useState(false);

  const seasonStart = agriculturalYearFor(new Date());
  const seasonLabel = `${seasonStart}/${String(seasonStart + 1).slice(-2)}`;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('title'),
      headerRight: () => (
        <View
          style={{
            marginRight: 12,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: colors.primaryLight,
            maxWidth: 160,
          }}
        >
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }} numberOfLines={1}>
            {t('seasonLabel', { season: seasonLabel })}
          </Text>
        </View>
      ),
    });
  }, [navigation, t, seasonLabel, colors.primary, colors.primaryLight]);

  const packLabels = useMemo(
    () => ({
      tin: (count: number, size: number) => t('tin', { count, size }),
      bulk: (amount: number) => t('bulk', { amount: formatOilNumber(amount, i18n.language) }),
      litres: (amount: number) => t('litres', { amount: formatOilNumber(amount, i18n.language) }),
    }),
    [t, i18n.language]
  );

  const reload = useCallback(async () => {
    if (!user?.id) return;
    setError(false);
    try {
      await migrateLocalOilPackingOnce(user.id);
      const [next, moves, fields, allCommitments, shareRequests, pending] = await Promise.all([
        oilStockService.getSummary(),
        oilStockService.listMovements(80),
        getFieldService().getFields(user.id, user.role || 'FieldOwner').catch(() => []),
        oilStockService.listCommitments(false).catch(() => [] as OilCommitment[]),
        oilStockService.listShareRequests(true).catch(() => [] as OilShareRequest[]),
        oilStockService.listPendingPressings().catch(() => [] as OilPressing[]),
      ]);
      setSummary(next);
      setMovements(moves);
      setFieldNames(fieldLabelMap(fields));
      setClosedCommitments(allCommitments.filter((c) => holdState(c) !== 'active'));
      setShareInbox(shareRequests.filter((r) => r.isIncoming && r.status === 'pending'));
      setPendingPressings(pending);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(CAPTURE_SAVED_EVENT, () => {
      void reload();
    });
    return () => sub.remove();
  }, [reload]);

  const formatDate = useCallback(
    (iso: string) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' });
    },
    [i18n.language]
  );

  /** Every mutation follows the same shape: lock the screen, call, reload. */
  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setBusy(true);
      try {
        await action();
        await reload();
      } finally {
        setBusy(false);
      }
    },
    [reload]
  );

  const fieldPools = useMemo(
    () => groupLotsByField(summary?.lots || []).filter(poolHasOil),
    [summary]
  );

  const groveGroups = useMemo(() => {
    const all = groupLotsByGrove(summary?.lots || []);
    if (!focusFieldId) return all;
    const filtered = all.filter(
      (g) => g.primaryFieldId === focusFieldId || g.fieldIds.includes(focusFieldId)
    );
    return filtered.length > 0 ? filtered : all;
  }, [summary?.lots, focusFieldId]);

  const openGive = useCallback(
    (intent: GiveOilIntent, who: 'someone' | 'home' | 'unnamed' = 'someone') => {
      setGiveIntent(intent);
      setGiveWho(who);
      setShowGive(true);
    },
    []
  );

  useEffect(() => {
    if (loading) return;
    const action = route.params?.do;
    if (!action) return;
    if (action === 'fill') {
      setFillPoolKey(null);
      setShowFill(true);
    } else if (action === 'count') {
      setShowCount(true);
    } else {
      openGive(action);
    }
    navigation.setParams({ do: undefined });
  }, [loading, navigation, openGive, route.params?.do]);

  const saveGive = async (input: GiveOilSaveInput) => {
    const pool = fieldPools.find((item) => item.key === input.poolKey);
    const lots = pool?.lots || summary?.lots || [];
    if (!drainCovers(lots, input.requested)) return;
    await run(async () => {
      if (input.forHome && input.alreadyDelivered) {
        for (const slice of planFieldDrain(lots, input.requested)) {
          await oilStockService.adjust({
            oilLotId: slice.oilLotId,
            kind: 'home_use',
            pack: slice.pack,
          });
        }
      } else {
        await oilStockService.createCommitment({
          counterpartyName: input.counterpartyName,
          requested: input.requested,
          isSale: input.isSale,
          amount: input.isSale && input.alreadyPaid ? input.amount : undefined,
          alreadyDelivered: input.alreadyDelivered,
          allocations: planFieldDrain(lots, input.requested).map((slice) => ({
            oilLotId: slice.oilLotId,
            pack: slice.pack,
          })),
        });
      }
      setShowGive(false);
    });
  };

  const deliverFully = (c: OilCommitment) => run(() => oilStockService.deliver(c.id));

  const onDeliverTap = (c: OilCommitment) => {
    const rem = c.remaining;
    const multi =
      (rem.tin16 > 0 ? 1 : 0) + (rem.tin17 > 0 ? 1 : 0) + (rem.bulkLitres > 0.05 ? 1 : 0) > 1 ||
      rem.tin16 + rem.tin17 > 1;
    if (multi) {
      setPartialPack({
        tin16: rem.tin16,
        tin17: rem.tin17,
        bulkLitres: rem.bulkLitres,
      });
      setPartialFor(c);
      return;
    }
    void deliverFully(c);
  };

  /** A count becomes at most two corrections: one for oil found, one for oil missing. */
  const saveCount = (actual: PackDelta, reason: string) =>
    run(async () => {
      const lots = summary?.lots || [];
      const { add, remove } = stockCountDeltas(summary!.onHand, actual);
      const notes = reason || t('count.defaultReason');

      for (const slice of planLotDrain(lots, remove)) {
        await oilStockService.adjust({
          oilLotId: slice.oilLotId,
          kind: 'correction',
          remove: true,
          pack: slice.pack,
          notes,
        });
      }

      const target = newestLotId(lots);
      if (!isEmptyDelta(add) && target) {
        await oilStockService.adjust({ oilLotId: target, kind: 'correction', pack: add, notes });
      }

      setShowCount(false);
    });

  const waitingAll = summary?.openCommitments || [];
  const needsNow = needsNowCommitments(waitingAll);

  const hasStock =
    !!summary &&
    (summary.onHand.litres > 0.05 ||
      summary.lots.length > 0 ||
      summary.delivered.litres > 0.05 ||
      waitingAll.length > 0);

  return (
    <View style={{ flex: 1 }}>
      <ScreenLayout scroll tabBarInset padded>
        <OilStockTabs
          active={tab}
          onChange={setTab}
          counts={{
            holds: waitingAll.length + shareInbox.length + pendingPressings.length,
          }}
        />

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>{t('error')}</Text>
            <Pressable
              onPress={() => {
                setLoading(true);
                void reload();
              }}
              style={[styles.btnSecondary, { marginTop: 12, alignSelf: 'flex-start' }]}
            >
              <Text style={styles.btnSecondaryText}>
                {t('common:retry', { defaultValue: 'Retry' })}
              </Text>
            </Pressable>
          </View>
        ) : !hasStock && shareInbox.length === 0 && pendingPressings.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>{t('empty')}</Text>
            <Text style={styles.emptyBody}>{t('emptyHint')}</Text>
            <Pressable
              onPress={() => openHarvestCampaign(navigation)}
              style={[styles.btnPrimary, { marginTop: 16, alignSelf: 'stretch' }]}
            >
              <Text style={styles.btnPrimaryText}>{t('emptyCta')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {tab === 'stock' ? (
              <>
                {shareInbox.length + pendingPressings.length > 0 ? (
                  <Pressable onPress={() => setTab('holds')} style={styles.nudge}>
                    <Ionicons name="alert-circle-outline" size={18} color={colors.accentGold} />
                    <Text style={styles.nudgeText}>
                      {t('attention.doorDetail', {
                        count: shareInbox.length + pendingPressings.length,
                      })}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </Pressable>
                ) : null}
                {hasStock ? (
                  <OilStockHero
                    summary={summary!}
                    history={[...waitingAll, ...closedCommitments]}
                    busy={busy}
                    onGive={() => openGive('give')}
                    onSell={() => openGive('sell')}
                    onHold={() => openGive('hold')}
                    onFill={() => {
                      setFillPoolKey(null);
                      setShowFill(true);
                    }}
                  />
                ) : null}
                <OilShelfPreview
                  groups={groveGroups}
                  fieldNames={fieldNames}
                  packLabels={packLabels}
                  onOpen={() => setShowShelves(true)}
                  onOpenShelf={() => setShowShelves(true)}
                />
              </>
            ) : null}

            {tab === 'holds' ? (
              <View style={{ gap: 12 }}>
                <OilShareRequestsSection
                  requests={shareInbox}
                  busy={busy}
                  packLabels={packLabels}
                  onAccept={(r) => void run(() => oilStockService.acceptShareRequest(r.id))}
                  onReject={(r) => void run(() => oilStockService.rejectShareRequest(r.id))}
                />
                <OilPendingPressings
                  pressings={pendingPressings}
                  fieldNames={fieldNames}
                  busy={busy}
                  onAllocate={(pressing, allocations) =>
                    void run(() => oilStockService.allocatePressing(pressing.id, allocations))
                  }
                />
                <CommitmentsTab
                  open={waitingAll}
                  closed={closedCommitments}
                  lots={summary?.lots || []}
                  fieldNames={fieldNames}
                  busy={busy}
                  packLabels={packLabels}
                  formatDate={formatDate}
                  urgentIds={needsNow.map((c) => c.id)}
                  onDeliver={onDeliverTap}
                  onCancel={(c) => void run(() => oilStockService.cancelCommitment(c.id))}
                  onGive={() => openGive('hold')}
                />
              </View>
            ) : null}

            {tab === 'movements' ? (
              <MovementsTab
                movements={movements}
                lots={summary?.lots || []}
                commitments={[...waitingAll, ...closedCommitments]}
                fieldNames={fieldNames}
                packLabels={packLabels}
                busy={busy}
                onReverse={(m) => void run(() => oilStockService.reverseMovement(m.id))}
              />
            ) : null}
          </View>
        )}
      </ScreenLayout>

      <OilShelvesSheet
        open={showShelves || Boolean(focusFieldId)}
        groups={groveGroups}
        fieldNames={fieldNames}
        focusFieldId={focusFieldId}
        onClose={() => {
          setShowShelves(false);
          if (focusFieldId) navigation.setParams({ field: undefined });
        }}
        onFill={() => {
          setFillPoolKey(null);
          setShowFill(true);
          setShowShelves(false);
        }}
        onFillGrove={(group) => {
          const pool = fieldPools.find(
            (p) =>
              p.fieldIds.join('|') === group.fieldIds.join('|') ||
              (group.primaryFieldId && p.fieldIds.includes(group.primaryFieldId))
          );
          if (pool) {
            setFillPoolKey(pool.key);
            setShowFill(true);
            setShowShelves(false);
          }
        }}
      />

      <GiveOilSheet
        open={showGive}
        available={summary?.available}
        pools={fieldPools}
        fieldNames={fieldNames}
        busy={busy}
        initialWho={giveWho}
        initialIntent={giveIntent}
        onClose={() => setShowGive(false)}
        onSave={saveGive}
      />

      <FillTinsSheet
        open={showFill}
        pools={fieldPools}
        fieldNames={fieldNames}
        preferredKey={fillPoolKey}
        busy={busy}
        onClose={() => {
          setShowFill(false);
          setFillPoolKey(null);
        }}
        onSave={async (pool, add16, add17) => {
          const plan = planFieldFill(pool.lots, add16, add17);
          await run(async () => {
            for (const move of plan.moves) {
              await oilStockService.patchPacking(move.oilLotId, move.packing);
            }
            for (const slice of plan.repacks) {
              await oilStockService.repack(slice.oilLotId, slice.addTin16, slice.addTin17);
            }
            setShowFill(false);
            setFillPoolKey(null);
          });
        }}
      />

      {summary ? (
        <StockCountSheet
          open={showCount}
          expected={summary.onHand}
          busy={busy}
          onClose={() => setShowCount(false)}
          onSave={saveCount}
        />
      ) : null}

      <DeliverPartialSheet
        open={!!partialFor}
        commitment={partialFor}
        pack={partialPack}
        setPack={setPartialPack}
        packLabels={packLabels}
        busy={busy}
        onClose={() => setPartialFor(null)}
        onDeliverAll={() => {
          const c = partialFor;
          setPartialFor(null);
          if (c) void deliverFully(c);
        }}
        onDeliverPartial={() => {
          const c = partialFor;
          setPartialFor(null);
          if (!c) return;
          void run(() => oilStockService.deliver(c.id, partialPack));
        }}
      />

      <AdjustSheet
        open={adjustOpen}
        pools={adjustLock ? fieldPools.filter((pool) => pool.key === adjustLock) : fieldPools}
        fieldNames={fieldNames}
        lockedKey={adjustLock}
        kind={adjustKind}
        busy={busy}
        onClose={() => setAdjustOpen(false)}
        onSave={async (kind, pack, pool) => {
          const additive = kind === 'correction' || kind === 'returned';
          if (!additive && !drainCovers(pool.lots, pack)) return;
          const slices = additive ? planFieldAdd(pool.lots, pack) : planFieldDrain(pool.lots, pack);
          await run(async () => {
            for (const slice of slices) {
              await oilStockService.adjust({
                oilLotId: slice.oilLotId,
                kind,
                pack: slice.pack,
              });
            }
            setAdjustOpen(false);
          });
        }}
      />
    </View>
  );
};

export default MyOilScreen;
