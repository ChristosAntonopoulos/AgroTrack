/**
 * Mobile My Oil — calm cellar inventory.
 * Overview answers “how much / where / what’s reserved” in one glance.
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
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import ScreenLayout from '../components/layout/ScreenLayout';
import Sheet from '../components/ui/Sheet';
import {
  OilStockTabs,
  OilStockPageHeader,
  OilStockHero,
  OilPendingSection,
  CommitmentsTab,
  LotsTab,
  MovementsTab,
  StockTab,
  GiveOilSheet,
  FillTinsSheet,
  AdjustSheet,
  DeliverPartialSheet,
  createMyOilStyles,
  type GiveOilSaveInput,
} from '../components/myOil';
import {
  oilStockService,
  type OilCommitment,
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
import {
  isHouseholdCommitment,
  type OilStockTab,
  type PackFilter,
} from '../myOil/commitmentCopy';
import { emptyOilPackInput, type OilPackInput } from '../myOil/packInput';
import { agriculturalYearFor } from '../chronologio/agriculturalYear';
import { getFieldService } from '../services/serviceFactory';
import { fieldLabelMap } from '../utils/fieldLabels';
import { useDock } from '../navigation/DockContext';

const MyOilScreen = () => {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const { user } = useAuth();
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const { setAdd } = useDock();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [summary, setSummary] = useState<OilStockSummary | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [closedCommitments, setClosedCommitments] = useState<OilCommitment[]>([]);
  const [fieldNames, setFieldNames] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<OilStockTab>('overview');
  const [packFilter, setPackFilter] = useState<PackFilter>('all');
  const [showGive, setShowGive] = useState(false);
  const [giveWho, setGiveWho] = useState<'someone' | 'home' | 'unnamed'>('someone');
  const [showFill, setShowFill] = useState(false);
  const [fillPoolKey, setFillPoolKey] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustLock, setAdjustLock] = useState<string | null>(null);
  const [adjustKind, setAdjustKind] = useState('home_use');
  const [partialFor, setPartialFor] = useState<OilCommitment | null>(null);
  const [partialPack, setPartialPack] = useState<OilPackInput>(emptyOilPackInput());
  const [busy, setBusy] = useState(false);
  const [movementsOpen, setMovementsOpen] = useState(false);

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
      const [next, moves, fields, allCommitments] = await Promise.all([
        oilStockService.getSummary(),
        oilStockService.listMovements(80),
        getFieldService().getFields(user.id, user.role || 'FieldOwner').catch(() => []),
        oilStockService.listCommitments(false).catch(() => [] as OilCommitment[]),
      ]);
      setSummary(next);
      setMovements(moves);
      setFieldNames(fieldLabelMap(fields));
      setClosedCommitments(
        allCommitments.filter((c) => c.derivedStatus === 'delivered' || c.cancelled)
      );
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

  const fieldPools = useMemo(
    () => groupLotsByField(summary?.lots || []).filter(poolHasOil),
    [summary]
  );

  const openGive = useCallback((who: 'someone' | 'home' | 'unnamed') => {
    setGiveWho(who);
    setShowGive(true);
  }, []);

  const openAdjust = useCallback((kind: string, poolKey?: string) => {
    if (!summary?.lots.length) return;
    setAdjustKind(kind);
    setAdjustLock(poolKey ?? null);
    setAdjustOpen(true);
  }, [summary?.lots.length]);

  const openOilMenu = useCallback(() => {
    Alert.alert(t('actions.menuTitle', { defaultValue: t('actions.more') }), undefined, [
      { text: t('actions.give'), onPress: () => openGive('someone') },
      { text: t('actions.homeUse'), onPress: () => openGive('home') },
      {
        text: t('actions.fillTins'),
        onPress: () => {
          setFillPoolKey(null);
          setShowFill(true);
        },
      },
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
    setBusy(true);
    try {
      const pool = fieldPools.find((item) => item.key === input.poolKey);
      const lots = pool?.lots || summary?.lots || [];
      if (!drainCovers(lots, input.requested)) return;
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
          amount: input.amount,
          alreadyDelivered: input.alreadyDelivered,
          allocations: planFieldDrain(lots, input.requested).map((slice) => ({
            oilLotId: slice.oilLotId,
            pack: slice.pack,
          })),
        });
      }
      setShowGive(false);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const deliverFully = async (c: OilCommitment) => {
    setBusy(true);
    try {
      await oilStockService.deliver(c.id);
      await reload();
    } finally {
      setBusy(false);
    }
  };

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

  const waitingAll = summary?.openCommitments || [];
  const waiting = waitingAll.filter((c) => !isHouseholdCommitment(c));
  const needsAttention = waiting.filter((c) => c.derivedStatus === 'pending_delivery');

  const hasStock =
    !!summary &&
    (summary.physical.litres > 0.05 ||
      summary.lots.length > 0 ||
      summary.delivered.litres > 0.05 ||
      waitingAll.length > 0);

  return (
    <View style={{ flex: 1 }}>
      <ScreenLayout scroll tabBarInset padded>
        <OilStockPageHeader season={seasonLabel} />

        <OilStockTabs
          active={tab}
          onChange={(next) => {
            setTab(next);
            if (next !== 'lots') setPackFilter('all');
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
        ) : !hasStock ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>{t('empty')}</Text>
            <Text style={styles.emptyBody}>{t('emptyHint')}</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {tab === 'overview' ? (
              <>
                <OilStockHero
                  summary={summary!}
                  closed={closedCommitments}
                  onOpenHome={() => setTab('stock')}
                  onOpenHolds={() => setTab('others')}
                />

                <OilPendingSection
                  waiting={needsAttention}
                  lots={summary!.lots}
                  fieldNames={fieldNames}
                  packLabels={packLabels}
                  onOpen={() => setTab('others')}
                  formatDate={formatDate}
                />

                <View style={styles.panel}>
                  <MovementsTab
                    movements={movements}
                    lots={summary!.lots}
                    fieldNames={fieldNames}
                    packLabels={packLabels}
                    preview
                    onSeeAll={() => setMovementsOpen(true)}
                  />
                </View>
              </>
            ) : null}

            {tab === 'stock' ? (
              <StockTab
                summary={summary!}
                closed={closedCommitments}
                packLabels={packLabels}
                onSetAside={() => openGive('home')}
                onManageHome={() => setTab('others')}
              />
            ) : null}

            {tab === 'others' ? (
              <CommitmentsTab
                open={waiting}
                closed={closedCommitments}
                lots={summary!.lots}
                fieldNames={fieldNames}
                busy={busy}
                packLabels={packLabels}
                formatDate={formatDate}
                onDeliver={onDeliverTap}
                onCancel={(c) => {
                  setBusy(true);
                  void oilStockService
                    .cancelCommitment(c.id)
                    .then(() => reload())
                    .finally(() => setBusy(false));
                }}
                onGive={() => openGive('someone')}
              />
            ) : null}

            {tab === 'lots' ? (
              <LotsTab
                lots={summary!.lots}
                fieldNames={fieldNames}
                packLabels={packLabels}
                packFilter={packFilter}
                busy={busy}
                onFill={(pool) => {
                  setFillPoolKey(pool.key);
                  setShowFill(true);
                }}
                onAdjust={(pool, kind) => openAdjust(kind, pool.key)}
              />
            ) : null}
          </View>
        )}
      </ScreenLayout>

      <Sheet
        open={movementsOpen}
        onClose={() => setMovementsOpen(false)}
        title={t('recent.title')}
        edge="bottom"
        size="lg"
      >
        <MovementsTab
          movements={movements}
          lots={summary?.lots || []}
          fieldNames={fieldNames}
          packLabels={packLabels}
        />
      </Sheet>

      <GiveOilSheet
        open={showGive}
        available={summary?.available}
        pools={fieldPools}
        fieldNames={fieldNames}
        busy={busy}
        initialWho={giveWho}
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
          setBusy(true);
          try {
            const plan = planFieldFill(pool.lots, add16, add17);
            for (const move of plan.moves) {
              await oilStockService.patchPacking(move.oilLotId, move.packing);
            }
            for (const slice of plan.repacks) {
              await oilStockService.repack(slice.oilLotId, slice.addTin16, slice.addTin17);
            }
            setShowFill(false);
            setFillPoolKey(null);
            await reload();
          } finally {
            setBusy(false);
          }
        }}
      />

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
          setBusy(true);
          void oilStockService
            .deliver(c.id, partialPack)
            .then(() => reload())
            .finally(() => setBusy(false));
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
          const slices = additive ? planFieldAdd(pool.lots, pack) : planFieldDrain(pool.lots, pack);
          if (!additive && !drainCovers(pool.lots, pack)) return;
          setBusy(true);
          try {
            for (const slice of slices) {
              await oilStockService.adjust({
                oilLotId: slice.oilLotId,
                kind,
                pack: slice.pack,
              });
            }
            setAdjustOpen(false);
            await reload();
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
};

export default MyOilScreen;
