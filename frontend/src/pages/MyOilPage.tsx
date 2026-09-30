import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageContainer from '../components/Common/PageContainer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Button from '../components/Common/Button';
import RightDrawer from '../components/Common/RightDrawer';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import EmptyState from '../components/Common/EmptyState';
import { OilStockTabs } from '../components/myOil/OilStockTabs';
import { OilStockHero } from '../components/myOil/OilStockHero';
import { OilStockActivityBar, OilStockPageHeader } from '../components/myOil/OilStockChrome';
import {
  OilForOthersSummary,
  OilHouseholdAside,
  OilInventorySummary,
  OilPendingSection,
} from '../components/myOil/OilOverviewSections';
import { CommitmentsTab } from '../components/myOil/CommitmentsTab';
import { LotsTab } from '../components/myOil/LotsTab';
import { MovementsTab } from '../components/myOil/MovementsTab';
import { GiveOilSheet, type GiveOilSaveInput } from '../components/myOil/GiveOilSheet';
import { FillTinsDrawer } from '../components/myOil/FillTinsDrawer';
import { useAuth } from '../context/AuthContext';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { useModulePageGuard } from '../hooks/useModulePageGuard';
import { getFieldService } from '../services/serviceFactory';
import {
  oilStockService,
  type OilCommitment,
  type OilLot,
  type OilStockSummary,
  type StockMovement,
} from '../services/oilStockService';
import { migrateLocalOilPackingOnce } from '../myOil/syncOilLots';
import { formatOilNumber, formatOilPack } from '../myOil/formatOilPack';
import { tinCount, type OilStockTab, type PackFilter, isHouseholdCommitment } from '../myOil/commitmentCopy';
import { agriculturalYearFor } from '../chronologio/agriculturalYear';
import { clampPackInput, emptyOilPackInput, packLitresOf, type OilPackInput } from '../myOil/packInput';
import { fieldLabelMap } from '../utils/fieldLabels';
import { useDrawerPresence } from '../hooks/useDrawerPresence';
import './MyOilPage.css';

const MyOilPage: React.FC = () => {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const { user } = useAuth();
  const pageGuard = useModulePageGuard({ module: 'money' });
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
  const [fillLot, setFillLot] = useState<OilLot | null>(null);
  const [adjustLot, setAdjustLot] = useState<OilLot | null>(null);
  const [adjustKind, setAdjustKind] = useState('home_use');
  const [partialFor, setPartialFor] = useState<OilCommitment | null>(null);
  const [partialPack, setPartialPack] = useState<OilPackInput>(emptyOilPackInput());
  const [busy, setBusy] = useState(false);
  const giveDrawer = useDrawerPresence(showGive || null);
  const fillDrawer = useDrawerPresence(showFill || null);
  const partialDrawer = useDrawerPresence(partialFor);
  const adjustDrawer = useDrawerPresence(adjustLot);

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
      const [next, moves, fields, allCommitments] = await Promise.all([
        oilStockService.getSummary(),
        oilStockService.listMovements(80),
        getFieldService().getFields().catch(() => []),
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
  }, [user?.userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onSaved = () => void reload();
    window.addEventListener(CAPTURE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(CAPTURE_SAVED_EVENT, onSaved);
  }, [reload]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const deliverFully = async (commitment: OilCommitment) => {
    setBusy(true);
    try {
      await oilStockService.deliver(commitment.id);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const onDeliverTap = (commitment: OilCommitment) => {
    const rem = commitment.remaining;
    if (rem.tin16 + rem.tin17 > 1 || rem.bulkLitres > 0.05) {
      setPartialFor(commitment);
      setPartialPack(emptyOilPackInput());
      return;
    }
    void deliverFully(commitment);
  };

  const saveGive = async (input: GiveOilSaveInput) => {
    setBusy(true);
    try {
      if (input.forHome && input.alreadyDelivered && summary?.lots.length) {
        const lot =
          summary.lots.find((l) => l.available.tin16 + l.available.tin17 + l.available.bulkLitres > 0.05) ||
          summary.lots[0];
        await oilStockService.adjust({
          oilLotId: lot.id,
          kind: 'home_use',
          pack: input.requested,
        });
      } else {
        await oilStockService.createCommitment({
          counterpartyName: input.counterpartyName,
          requested: input.requested,
          isSale: input.isSale,
          amount: input.isSale && input.alreadyPaid ? input.amount : input.amount,
          alreadyDelivered: input.alreadyDelivered,
        });
      }
      setShowGive(false);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const openGive = (who: 'someone' | 'home' | 'unnamed' = 'someone') => {
    setGiveWho(who);
    setShowGive(true);
  };

  const openAdjust = (kind: string) => {
    const lot = summary?.lots.find((l) => l.available.litres > 0.05) || summary?.lots[0] || null;
    if (!lot) return;
    setAdjustKind(kind);
    setAdjustLot(lot);
  };

  if (pageGuard.loading) {
    return (
      <PageContainer maxWidth="full" padding="none">
        <div className="my-oil-page">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  const waitingAll = summary?.openCommitments || [];
  const waiting = waitingAll.filter((c) => !isHouseholdCommitment(c));
  const hasStock =
    !!summary &&
    (summary.physical.litres > 0.05 ||
      summary.lots.length > 0 ||
      summary.delivered.litres > 0.05 ||
      waitingAll.length > 0);

  const goLotsFiltered = (kind: 'tin16' | 'tin17' | 'bulk') => {
    setPackFilter(kind);
    setTab('lots');
  };

  return (
    <PageContainer maxWidth="full" padding="none">
      <div className="my-oil-page">
        <Breadcrumbs />
        <OilStockPageHeader season={seasonLabel} />

        <div className="my-oil-tabbar">
          <OilStockTabs
            active={tab}
            onChange={(next) => {
              setTab(next);
              if (next !== 'lots') setPackFilter('all');
            }}
          />
          {!loading && hasStock ? (
            <Button
              variant="primary"
              size="sm"
              className="my-oil-hold-cta"
              disabled={busy}
              onClick={() => openGive('someone')}
            >
              {t('actions.hold')}
            </Button>
          ) : null}
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
        ) : !hasStock ? (
          <EmptyState title={t('empty')} description={t('emptyHint')} />
        ) : (
          <>
            {tab === 'overview' ? (
              <>
                <OilStockActivityBar
                  summary={summary!}
                  closed={closedCommitments}
                  waiting={waiting}
                  latestMove={movements[0] || null}
                  packLabels={packLabels}
                  formatDate={formatDate}
                />
                <OilStockHero
                  summary={summary!}
                  closed={closedCommitments}
                  busy={busy}
                  onGive={() => openGive('someone')}
                  onFill={() => {
                    setFillLot(null);
                    setShowFill(true);
                  }}
                  onCorrect={() => openAdjust('correction')}
                  onHomeUse={() => openGive('home')}
                  onLoss={() => openAdjust('consumed')}
                />

                <div className="my-oil-overview-grid">
                  <OilInventorySummary summary={summary!} onSelectPack={goLotsFiltered} />
                  <OilHouseholdAside
                    summary={summary!}
                    closed={closedCommitments}
                    packLabels={packLabels}
                    onSetAside={() => openGive('home')}
                    onOpenHolds={() => setTab('others')}
                  />
                </div>

                {waiting.length > 0 ? (
                  <OilPendingSection
                    waiting={waiting}
                    busy={busy}
                    packLabels={packLabels}
                    onDeliver={onDeliverTap}
                    onDetails={() => setTab('others')}
                    formatDate={formatDate}
                  />
                ) : null}

                <OilForOthersSummary
                  summary={summary!}
                  packLabels={packLabels}
                  onSeeAll={() => setTab('others')}
                  onOpen={() => setTab('others')}
                  formatDate={formatDate}
                />

                <div className="my-oil-overview-grid my-oil-overview-grid--lower">
                  <section className="my-oil-panel">
                    <MovementsTab
                      movements={movements}
                      lots={summary!.lots}
                      fieldNames={fieldNames}
                      packLabels={packLabels}
                      preview
                      onSeeAll={() => setTab('movements')}
                    />
                  </section>
                  <section className="my-oil-panel">
                    <LotsTab
                      lots={summary!.lots}
                      fieldNames={fieldNames}
                      packLabels={packLabels}
                      busy={busy}
                      formatDate={formatDate}
                      preview
                      onSeeAll={() => setTab('lots')}
                      onFill={(lot) => {
                        setFillLot(lot);
                        setShowFill(true);
                      }}
                      onAdjust={(lot, kind) => {
                        setAdjustKind(kind);
                        setAdjustLot(lot);
                      }}
                    />
                  </section>
                </div>
              </>
            ) : null}

            {tab === 'others' ? (
              <CommitmentsTab
                open={waitingAll}
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
                formatDate={formatDate}
                onFill={(lot) => {
                  setFillLot(lot);
                  setShowFill(true);
                }}
                onAdjust={(lot, kind) => {
                  setAdjustKind(kind);
                  setAdjustLot(lot);
                }}
              />
            ) : null}

            {tab === 'movements' ? (
              <MovementsTab
                movements={movements}
                lots={summary!.lots}
                fieldNames={fieldNames}
                packLabels={packLabels}
              />
            ) : null}
          </>
        )}

        <div className="my-oil-sticky-cta">
          <Button variant="primary" onClick={() => openGive('someone')} disabled={busy || !hasStock}>
            {t('actions.give')}
          </Button>
        </div>
      </div>

      {giveDrawer.mounted ? (
        <GiveOilSheet
          open={giveDrawer.open}
          available={summary?.available}
          busy={busy}
          initialWho={giveWho}
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
            setBusy(true);
            try {
              await oilStockService.repack(lotId, add16, add17);
              setShowFill(false);
              setFillLot(null);
              await reload();
            } finally {
              setBusy(false);
            }
          }}
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
            setBusy(true);
            void oilStockService
              .deliver(c.id, partialPack)
              .then(() => reload())
              .finally(() => setBusy(false));
          }}
        />
      ) : null}

      {adjustDrawer.mounted && adjustDrawer.value ? (
        <AdjustSheet
          open={adjustDrawer.open}
          lot={adjustDrawer.value}
          kind={adjustKind}
          busy={busy}
          onClose={() => setAdjustLot(null)}
          onSave={async (kind, pack) => {
            setBusy(true);
            try {
              await oilStockService.adjust({ oilLotId: adjustDrawer.value!.id, kind, pack });
              setAdjustLot(null);
              await reload();
            } finally {
              setBusy(false);
            }
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

const AdjustSheet: React.FC<{
  open: boolean;
  lot: OilLot;
  kind: string;
  busy: boolean;
  onClose: () => void;
  onSave: (kind: string, pack: OilPackInput) => Promise<void>;
}> = ({ open, lot, kind: initialKind, busy, onClose, onSave }) => {
  const { t } = useTranslation(['myOil', 'common']);
  const [kind, setKind] = useState(initialKind);
  const [pack, setPack] = useState<OilPackInput>(emptyOilPackInput());
  const additive = kind === 'correction' || kind === 'returned';

  return (
    <RightDrawer
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      size="md"
      title={t('adjustSheet.title')}
      closeDisabled={busy}
      closeLabel={t('common:close', { defaultValue: 'Κλείσιμο' })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('sheet.cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={busy || packLitresOf(pack) <= 0.05}
            onClick={() => void onSave(kind, pack)}
          >
            {t('adjustSheet.save')}
          </Button>
        </>
      }
    >
      <div className="my-oil-flow">
        <div className="my-oil-field">
          <label htmlFor="adjust-kind">{t('adjustSheet.kind')}</label>
          <select id="adjust-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="gifted">{t('adjustSheet.gifted')}</option>
            <option value="home_use">{t('adjustSheet.home_use')}</option>
            <option value="consumed">{t('adjustSheet.consumed')}</option>
            <option value="correction">{t('adjustSheet.correction')}</option>
            <option value="returned">{t('adjustSheet.returned')}</option>
          </select>
        </div>
        <div className="my-oil-field">
          <label htmlFor="adjust-tin16">{t('sheet.tin16')}</label>
          <input
            id="adjust-tin16"
            type="number"
            min={0}
            value={pack.tin16 || ''}
            onChange={(e) =>
              setPack(
                clampPackInput(
                  { ...pack, tin16: Number(e.target.value) || 0 },
                  additive ? undefined : lot.available
                )
              )
            }
          />
        </div>
        <div className="my-oil-field">
          <label htmlFor="adjust-tin17">{t('sheet.tin17')}</label>
          <input
            id="adjust-tin17"
            type="number"
            min={0}
            value={pack.tin17 || ''}
            onChange={(e) =>
              setPack(
                clampPackInput(
                  { ...pack, tin17: Number(e.target.value) || 0 },
                  additive ? undefined : lot.available
                )
              )
            }
          />
        </div>
        <div className="my-oil-field">
          <label htmlFor="adjust-bulk">{t('sheet.bulk')}</label>
          <input
            id="adjust-bulk"
            type="number"
            min={0}
            step="0.1"
            value={pack.bulkLitres || ''}
            onChange={(e) =>
              setPack(
                clampPackInput(
                  { ...pack, bulkLitres: Number(e.target.value) || 0 },
                  additive ? undefined : lot.available
                )
              )
            }
          />
        </div>
      </div>
    </RightDrawer>
  );
};

export default MyOilPage;
