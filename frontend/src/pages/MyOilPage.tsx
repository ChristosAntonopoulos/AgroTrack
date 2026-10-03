import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../components/Common/PageContainer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Button from '../components/Common/Button';
import RightDrawer from '../components/Common/RightDrawer';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import EmptyState from '../components/Common/EmptyState';
import { OilStockTabs } from '../components/myOil/OilStockTabs';
import { OilStockHero } from '../components/myOil/OilStockHero';
import { OilStockPageHeader } from '../components/myOil/OilStockChrome';
import { OilPendingSection } from '../components/myOil/OilOverviewSections';
import { OilPendingPressings } from '../components/myOil/OilPendingPressings';
import { OilByGroveSection } from '../components/myOil/OilByGroveSection';
import { OilShareRequestsSection } from '../components/myOil/OilShareRequestsSection';
import { OilAttentionBlock } from '../components/myOil/OilAttentionBlock';
import { CommitmentsTab } from '../components/myOil/CommitmentsTab';
import { MovementsTab } from '../components/myOil/MovementsTab';
import { StockCountSheet } from '../components/myOil/StockCountSheet';
import {
  GiveOilSheet,
  type GiveOilIntent,
  type GiveOilSaveInput,
} from '../components/myOil/GiveOilSheet';
import { FillTinsDrawer } from '../components/myOil/FillTinsDrawer';
import { useAuth } from '../context/AuthContext';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { useModulePageGuard } from '../hooks/useModulePageGuard';
import { getFieldService } from '../services/serviceFactory';
import {
  oilStockService,
  type OilCellarCandidate,
  type OilCommitment,
  type OilLot,
  type OilPressing,
  type OilShareRequest,
  type OilStockSummary,
  type StockMovement,
} from '../services/oilStockService';
import { migrateLocalOilPackingOnce } from '../myOil/syncOilLots';
import { formatOilNumber, formatOilPack } from '../myOil/formatOilPack';
import {
  holdState,
  needsNowCommitments,
  tinCount,
  type OilStockTab,
} from '../myOil/commitmentCopy';
import {
  isEmptyDelta,
  newestLotId,
  planLotDrain,
  stockCountDeltas,
  type PackDelta,
} from '../myOil/stockCount';
import { groupLotsByGrove } from '../myOil/groupLotsByGrove';
import { agriculturalYearFor } from '../chronologio/agriculturalYear';
import { clampPackInput, emptyOilPackInput, packLitresOf, type OilPackInput } from '../myOil/packInput';
import { fieldLabelMap } from '../utils/fieldLabels';
import { useDrawerPresence } from '../hooks/useDrawerPresence';
import { harvestPath, moneyPath } from '../navigation/intents';
import { isWarehouseAction } from '../capture/menu';
import { useRegisterCapturePage } from '../context/CapturePageContext';
import './MyOilPage.css';

const MyOilPage: React.FC = () => {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const { user } = useAuth();
  const pageGuard = useModulePageGuard({ module: 'money' });
  const [searchParams, setSearchParams] = useSearchParams();
  const focusFieldId = (searchParams.get('field') || searchParams.get('fieldId') || '').trim() || null;

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
  const [platformPeople, setPlatformPeople] = useState<OilCellarCandidate[]>([]);
  const [showFill, setShowFill] = useState(false);
  const [fillLot, setFillLot] = useState<OilLot | null>(null);
  const [showCount, setShowCount] = useState(false);
  const [partialFor, setPartialFor] = useState<OilCommitment | null>(null);
  const [partialPack, setPartialPack] = useState<OilPackInput>(emptyOilPackInput());
  const [busy, setBusy] = useState(false);
  const giveDrawer = useDrawerPresence(showGive || null);
  const fillDrawer = useDrawerPresence(showFill || null);
  const countDrawer = useDrawerPresence(showCount || null);
  const partialDrawer = useDrawerPresence(partialFor);

  const seasonStart = agriculturalYearFor(new Date());
  const seasonLabel = `${seasonStart}/${String(seasonStart + 1).slice(-2)}`;

  const packLabels = useMemo(
    () => ({
      tin: (count: number, size: number) => t('tin', { count, size }),
      bulk: (amount: number) =>
        t('bulk', { amount: formatOilNumber(amount, i18n.language) }),
      litres: (amount: number) =>
        t('litres', { amount: formatOilNumber(amount, i18n.language) }),
    }),
    [t, i18n.language]
  );

  const reload = useCallback(async () => {
    if (!user?.userId) return;
    setError(false);
    try {
      await migrateLocalOilPackingOnce(user.userId);
      const [next, moves, fields, allCommitments, shareRequests, pending] = await Promise.all([
        oilStockService.getSummary(),
        oilStockService.listMovements(80),
        getFieldService().getFields().catch(() => []),
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
  }, [user?.userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (loading) return;
    const action = searchParams.get('do');
    if (!isWarehouseAction(action)) return;
    if (action === 'fill') {
      setFillLot(null);
      setShowFill(true);
    } else if (action === 'count') {
      setShowCount(true);
    } else {
      setGiveIntent(action);
      setGiveWho('someone');
      setShowGive(true);
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('do');
        return next;
      },
      { replace: true }
    );
  }, [loading, searchParams, setSearchParams]);

  useEffect(() => {
    const onSaved = () => void reload();
    window.addEventListener(CAPTURE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(CAPTURE_SAVED_EVENT, onSaved);
  }, [reload]);

  useEffect(() => {
    if (!focusFieldId) return;
    const el = document.querySelector('.my-oil-grove-card.is-focus');
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focusFieldId, summary, loading]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  /** Every mutation follows the same shape: lock the page, call, reload. */
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

  const deliverFully = (commitment: OilCommitment) =>
    run(() => oilStockService.deliver(commitment.id));

  const onDeliverTap = (commitment: OilCommitment) => {
    const rem = commitment.remaining;
    if (rem.tin16 + rem.tin17 > 1 || rem.bulkLitres > 0.05) {
      setPartialFor(commitment);
      setPartialPack(emptyOilPackInput());
      return;
    }
    void deliverFully(commitment);
  };

  const saveGive = (input: GiveOilSaveInput) =>
    run(async () => {
      if (input.toUserId) {
        const fieldIds = Array.from(
          new Set((summary?.lots || []).flatMap((l) => l.fieldIds || []).filter(Boolean))
        );
        await oilStockService.transferToUser({
          toUserId: input.toUserId,
          requested: input.requested,
          fieldIds: fieldIds.length ? fieldIds : undefined,
        });
      } else if (input.forHome && input.alreadyDelivered && summary?.lots.length) {
        const lot =
          summary.lots.find((l) => l.available.litres > 0.05) || summary.lots[0];
        await oilStockService.adjust({
          oilLotId: lot.id,
          kind: 'home_use',
          pack: input.requested,
        });
      } else {
        await oilStockService.createCommitment({
          contactId: input.contactId,
          counterpartyName: input.counterpartyName,
          requested: input.requested,
          isSale: input.isSale,
          amount: input.isSale && input.alreadyPaid ? input.amount : undefined,
          alreadyDelivered: input.alreadyDelivered,
        });
      }
      setShowGive(false);
    });

  const openGive = (intent: GiveOilIntent, who: 'someone' | 'home' | 'unnamed' = 'someone') => {
    setGiveIntent(intent);
    setGiveWho(who);
    setShowGive(true);
  };

  useEffect(() => {
    if (!showGive) return;
    const fieldIds = Array.from(
      new Set((summary?.lots || []).flatMap((l) => l.fieldIds || []).filter(Boolean))
    );
    if (fieldIds.length === 0) {
      setPlatformPeople([]);
      return;
    }
    let cancelled = false;
    void oilStockService
      .listCellarCandidates(fieldIds)
      .then((rows) => {
        if (!cancelled) setPlatformPeople((rows || []).filter((r) => !r.isYou));
      })
      .catch(() => {
        if (!cancelled) setPlatformPeople([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showGive, summary?.lots]);

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

  const clearFieldFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('field');
    next.delete('fieldId');
    setSearchParams(next, { replace: true });
  };

  const waitingAll = summary?.openCommitments || [];
  const needsNow = needsNowCommitments(waitingAll);
  const hasStock =
    !!summary &&
    (summary.onHand.litres > 0.05 ||
      summary.lots.length > 0 ||
      summary.delivered.litres > 0.05 ||
      waitingAll.length > 0);

  const groveGroups = useMemo(() => {
    const all = groupLotsByGrove(summary?.lots || []);
    if (!focusFieldId) return all;
    const filtered = all.filter(
      (g) => g.primaryFieldId === focusFieldId || g.fieldIds.includes(focusFieldId)
    );
    return filtered.length > 0 ? filtered : all;
  }, [summary?.lots, focusFieldId]);

  const focusFieldName = focusFieldId
    ? fieldNames[focusFieldId] || focusFieldId
    : null;

  if (pageGuard.loading) {
    return (
      <PageContainer maxWidth="full" padding="none">
        <div className="my-oil-page">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="full" padding="none">
      <div className="my-oil-page">
        <Breadcrumbs />
        <OilStockPageHeader season={seasonLabel} />

        <div className="my-oil-tabbar">
          <OilStockTabs
            active={tab}
            onChange={setTab}
            counts={{ holds: waitingAll.length }}
          />
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <EmptyState
            title={t('error')}
            action={
              <Button variant="secondary" onClick={() => void reload()}>
                {t('common:retry', { defaultValue: 'Retry' })}
              </Button>
            }
          />
        ) : !hasStock && shareInbox.length === 0 && pendingPressings.length === 0 ? (
          <EmptyState
            title={t('empty')}
            description={t('emptyHint')}
            action={
              <Button variant="primary" as={Link} to={harvestPath()}>
                {t('emptyCta')}
              </Button>
            }
          />
        ) : (
          <>
            {tab === 'stock' ? (
              <>
                {hasStock ? (
                  <OilStockHero
                    summary={summary!}
                    busy={busy}
                    onGive={() => openGive('give')}
                    onSell={() => openGive('sell')}
                    onHold={() => openGive('hold')}
                    onFill={() => {
                      setFillLot(null);
                      setShowFill(true);
                    }}
                    onCount={() => setShowCount(true)}
                  />
                ) : null}

                <OilAttentionBlock
                  show={
                    shareInbox.length > 0 ||
                    pendingPressings.length > 0 ||
                    (hasStock && needsNow.length > 0)
                  }
                >
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
                      busy={busy}
                      packLabels={packLabels}
                      onDeliver={onDeliverTap}
                      onDetails={() => setTab('holds')}
                      formatDate={formatDate}
                    />
                  ) : null}
                </OilAttentionBlock>

                {focusFieldName ? (
                  <div className="my-oil-field-filter">
                    <span>{t('byGrove.filtered', { name: focusFieldName })}</span>
                    <button type="button" className="my-oil-linkish" onClick={clearFieldFilter}>
                      {t('byGrove.clearFilter')}
                    </button>
                  </div>
                ) : null}

                <OilByGroveSection
                  groups={groveGroups}
                  fieldNames={fieldNames}
                  packLabels={packLabels}
                  focusFieldId={focusFieldId}
                  onSelectGrove={(group) => {
                    if (group.primaryFieldId) {
                      setSearchParams({ field: group.primaryFieldId }, { replace: true });
                    }
                  }}
                  onFillLot={(lot) => {
                    setFillLot(lot);
                    setShowFill(true);
                  }}
                />

                <nav className="my-oil-quick-links" aria-label={t('quickLinks.aria')}>
                  <Link to={harvestPath()}>{t('quickLinks.harvest')}</Link>
                  <Link to={moneyPath()}>{t('quickLinks.money')}</Link>
                </nav>
              </>
            ) : null}

            {tab === 'holds' ? (
              <CommitmentsTab
                open={waitingAll}
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
          </>
        )}
      </div>

      {giveDrawer.mounted ? (
        <GiveOilSheet
          open={giveDrawer.open}
          available={summary?.available}
          busy={busy}
          initialWho={giveWho}
          initialIntent={giveIntent}
          platformPeople={platformPeople}
          onClose={() => setShowGive(false)}
          onSave={saveGive}
        />
      ) : null}

      {fillDrawer.mounted ? (
        <FillTinsDrawer
          open={fillDrawer.open}
          lots={summary?.lots || []}
          preferredLot={fillLot}
          fieldNames={fieldNames}
          busy={busy}
          onClose={() => {
            setShowFill(false);
            setFillLot(null);
          }}
          onSave={async (lotId, add16, add17) => {
            await run(async () => {
              await oilStockService.repack(lotId, add16, add17);
              setShowFill(false);
              setFillLot(null);
            });
          }}
        />
      ) : null}

      {countDrawer.mounted && summary ? (
        <StockCountSheet
          open={countDrawer.open}
          expected={summary.onHand}
          busy={busy}
          onClose={() => setShowCount(false)}
          onSave={saveCount}
        />
      ) : null}

      {partialDrawer.mounted && partialDrawer.value ? (
        <DeliverSheet
          open={partialDrawer.open}
          commitment={partialDrawer.value}
          pack={partialPack}
          setPack={setPartialPack}
          packLabels={packLabels}
          busy={busy}
          onClose={() => setPartialFor(null)}
          onDeliverAll={() => {
            const c = partialDrawer.value!;
            setPartialFor(null);
            void deliverFully(c);
          }}
          onDeliverPartial={() => {
            const c = partialDrawer.value!;
            setPartialFor(null);
            void run(() => oilStockService.deliver(c.id, partialPack));
          }}
        />
      ) : null}
    </PageContainer>
  );
};

const DeliverSheet: React.FC<{
  open: boolean;
  commitment: OilCommitment;
  pack: OilPackInput;
  setPack: (p: OilPackInput) => void;
  packLabels: {
    tin: (count: number, size: number) => string;
    bulk: (amount: number) => string;
    litres: (amount: number) => string;
  };
  busy: boolean;
  onClose: () => void;
  onDeliverAll: () => void;
  onDeliverPartial: () => void;
}> = ({ open, commitment, pack, setPack, packLabels, busy, onClose, onDeliverAll, onDeliverPartial }) => {
  const { t } = useTranslation(['myOil', 'common']);
  return (
    <RightDrawer
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      size="md"
      title={t('deliverAllPrompt')}
      subtitle={formatOilPack(commitment.remaining, packLabels)}
      closeDisabled={busy}
      closeLabel={t('common:close', { defaultValue: 'Κλείσιμο' })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={busy || packLitresOf(pack) <= 0.05}
            onClick={onDeliverPartial}
          >
            {t('deliverPartialSave')}
          </Button>
        </>
      }
    >
      <div className="my-oil-flow">
        <Button variant="primary" disabled={busy} onClick={onDeliverAll}>
          {t('deliverAll', {
            count: tinCount(commitment.remaining) || Math.round(commitment.remaining.bulkLitres),
          })}
        </Button>
        <p className="my-oil-flow__step">{t('deliverPartial')}</p>
        <div className="my-oil-field">
          <label htmlFor="deliver-tin16">{t('sheet.tin16')}</label>
          <input
            id="deliver-tin16"
            type="number"
            min={0}
            max={commitment.remaining.tin16}
            value={pack.tin16 || ''}
            onChange={(e) =>
              setPack(
                clampPackInput(
                  { ...pack, tin16: Number(e.target.value) || 0 },
                  commitment.remaining
                )
              )
            }
          />
        </div>
        <div className="my-oil-field">
          <label htmlFor="deliver-tin17">{t('sheet.tin17')}</label>
          <input
            id="deliver-tin17"
            type="number"
            min={0}
            max={commitment.remaining.tin17}
            value={pack.tin17 || ''}
            onChange={(e) =>
              setPack(
                clampPackInput(
                  { ...pack, tin17: Number(e.target.value) || 0 },
                  commitment.remaining
                )
              )
            }
          />
        </div>
        {commitment.remaining.bulkLitres > 0.05 ? (
          <div className="my-oil-field">
            <label htmlFor="deliver-bulk">{t('sheet.bulk')}</label>
            <input
              id="deliver-bulk"
              type="number"
              min={0}
              step="0.1"
              max={commitment.remaining.bulkLitres}
              value={pack.bulkLitres || ''}
              onChange={(e) =>
                setPack(
                  clampPackInput(
                    { ...pack, bulkLitres: Number(e.target.value) || 0 },
                    commitment.remaining
                  )
                )
              }
            />
          </div>
        ) : null}
      </div>
    </RightDrawer>
  );
};

export default MyOilPage;
