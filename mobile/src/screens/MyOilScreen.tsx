/**
 * Mobile My Oil — personal cellar, split into stock / holds / movements like the web page.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import ScreenLayout from '../components/layout/ScreenLayout';
import {
  OilStockTabs,
  OilStockPageHeader,
  OilStockHero,
  OilPendingSection,
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
import { OilByGroveSection } from '../components/myOil/OilByGroveSection';
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
  isHouseholdCommitment,
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
import { useDock } from '../navigation/DockContext';
import type { RootStackParamList } from '../navigation/types';

const MyOilScreen = () => {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const { user } = useAuth();
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const { setAdd } = useDock();
  const route = useRoute<RouteProp<RootStackParamList, 'MyOil'>>();
  const focusFieldId = (route.params?.field || '').trim() || null;

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
  const [adjustLock, setAdjustLock] = useState<string | null>(null);
  const [adjustKind, setAdjustKind] = useState('home_use');
  const [showCount, setShowCount] = useState(false);
  const [partialFor, setPartialFor] = useState<OilCommitment | null>(null);
  const [partialPack, setPartialPack] = useState<OilPackInput>(emptyOilPackInput());
  const [busy, setBusy] = useState(false);

  const seasonStart = agriculturalYearFor(new Date());
  const seasonLabel = `${seasonStart}/${String(seasonStart + 1).slice(-2)}`;

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

  const openAdjust = useCallback((kind: string, poolKey?: string) => {
    if (!summary?.lots.length) return;
    setAdjustKind(kind);
    setAdjustLock(poolKey ?? null);
    setAdjustOpen(true);
  }, [summary?.lots.length]);

  const openOilMenu = useCallback(() => {
    Alert.alert(t('actions.menuTitle', { defaultValue: t('actions.more') }), undefined, [
      { text: t('actions.give'), onPress: () => openGive('give') },
      { text: t('actions.homeUse'), onPress: () => openGive('hold', 'home') },
      {
        text: t('actions.fillTins'),
        onPress: () => {
          setFillPoolKey(null);
          setShowFill(true);
        },
      },
      { text: t('actions.count'), onPress: () => setShowCount(true) },
      { text: t('actions.correct'), onPress: () => openAdjust('correction') },
      { text: t('actions.loss'), onPress: () => openAdjust('consumed') },
      { text: t('common:cancel'), style: 'cancel' },
    ]);
  }, [t, openGive, openAdjust]);

  useEffect(() => {
    setAdd({ hideHome: false, onAdd: openOilMenu });
    return () => setAdd(null);
  }, [openOilMenu, setAdd]);

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
  const thirdPartyOpen = waitingAll.filter((c) => !isHouseholdCommitment(c));

  const hasStock =
    !!summary &&
    (summary.onHand.litres > 0.05 ||
      summary.lots.length > 0 ||
      summary.delivered.litres > 0.05 ||
      waitingAll.length > 0);

  const openHolds = () => setTab('holds');

  return (
    <View style={{ flex: 1 }}>
      <ScreenLayout scroll tabBarInset padded>
        <OilStockPageHeader season={seasonLabel} />

        <OilStockTabs active={tab} onChange={setTab} counts={{ holds: waitingAll.length }} />

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
            <Text style={[styles.emptyBody, { marginTop: 8 }]}>{t('emptyCta')}</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {tab === 'stock' ? (
              <>
                {hasStock ? (
                  <OilStockHero
                    summary={summary!}
                    closed={closedCommitments}
                    onOpenHome={openHolds}
                    onOpenHolds={openHolds}
                  />
                ) : null}

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

                {hasStock && needsNow.length > 0 ? (
                  <OilPendingSection
                    waiting={needsNow}
                    lots={summary!.lots}
                    fieldNames={fieldNames}
                    packLabels={packLabels}
                    onOpen={openHolds}
                    formatDate={formatDate}
                  />
                ) : null}

                {hasStock ? (
                  <OilByGroveSection
                    groups={groveGroups}
                    fieldNames={fieldNames}
                    packLabels={packLabels}
                    focusFieldId={focusFieldId}
                    onSelectGrove={(group) => {
                      const pool = fieldPools.find(
                        (p) =>
                          p.fieldIds.join('|') === group.fieldIds.join('|') ||
                          (group.primaryFieldId && p.fieldIds.includes(group.primaryFieldId))
                      );
                      if (pool) {
                        setFillPoolKey(pool.key);
                        setShowFill(true);
                      }
                    }}
                  />
                ) : null}

                {movements.length > 0 ? (
                  <MovementsTab
                    movements={movements}
                    lots={summary!.lots}
                    fieldNames={fieldNames}
                    packLabels={packLabels}
                    preview
                    onSeeAll={() => setTab('movements')}
                  />
                ) : null}
              </>
            ) : null}

            {tab === 'holds' ? (
              <CommitmentsTab
                open={thirdPartyOpen}
                closed={closedCommitments}
                lots={summary!.lots}
                fieldNames={fieldNames}
                busy={busy}
                packLabels={packLabels}
                formatDate={formatDate}
                onDeliver={onDeliverTap}
                onCancel={(c) => void run(() => oilStockService.cancelCommitment(c.id))}
                onGive={() => openGive('hold')}
              />
            ) : null}

            {tab === 'movements' ? (
              <MovementsTab
                movements={movements}
                lots={summary!.lots}
                fieldNames={fieldNames}
                packLabels={packLabels}
                busy={busy}
                onReverse={(m) => void run(() => oilStockService.reverseMovement(m.id))}
              />
            ) : null}
          </View>
        )}
      </ScreenLayout>

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
