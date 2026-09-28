import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../components/Common/PageContainer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import EmptyState from '../components/Common/EmptyState';
import { useAuth } from '../context/AuthContext';
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
import { formatOilPack } from '../myOil/formatOilPack';
import { clampPackInput, emptyOilPackInput, packLitresOf, type OilPackInput } from '../myOil/packInput';
import { fieldLabelMap } from '../utils/fieldLabels';
import SaleBuyerPicker from '../components/money/SaleBuyerPicker';
import './MyOilPage.css';

const MyOilPage: React.FC = () => {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const { user } = useAuth();
  const pageGuard = useModulePageGuard({ module: 'money' });
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
    if (!user?.userId) return;
    setError(false);
    try {
      await migrateLocalOilPackingOnce(user.userId);
      const [next, moves, fields] = await Promise.all([
        oilStockService.getSummary(),
        oilStockService.listMovements(40),
        getFieldService().getFields().catch(() => []),
      ]);
      setSummary(next);
      setMovements(moves);
      setFieldNames(fieldLabelMap(fields));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (pageGuard.loading) {
    return (
      <PageContainer maxWidth="full" padding="none">
        <div className="my-oil-page">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }
  if (!pageGuard.allowed) {
    return <Navigate to="/access-denied?module=money" replace />;
  }

  const formatWhen = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const onDeliver = async (commitment: OilCommitment, partial?: OilPackInput) => {
    setBusy(true);
    try {
      await oilStockService.deliver(commitment.id, partial);
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
    <PageContainer maxWidth="full" padding="none">
      <div className="my-oil-page">
        <Breadcrumbs />
        <h1 className="my-oil-title">{t('title')}</h1>
        <div className="my-oil">
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
              <header className="my-oil-hero">
                <p className="my-oil-hero__label">{t('available')}</p>
                <p className="my-oil-hero__litres">
                  {t('litresAvailable', {
                    amount: Math.round((summary!.available.litres || 0) * 10) / 10,
                  })}
                </p>
                <p className="my-oil-hero__pack">{formatOilPack(summary!.available, packLabels)}</p>
              </header>

              <div className="my-oil-strip" aria-label={t('inCellar')}>
                <div className="my-oil-strip__row">
                  <span>{t('inCellar')}</span>
                  <strong>{formatOilPack(summary!.physical, packLabels)}</strong>
                </div>
                <div className="my-oil-strip__row">
                  <span>{t('reserved')}</span>
                  <strong>{formatOilPack(summary!.reserved, packLabels)}</strong>
                </div>
                <div className="my-oil-strip__row">
                  <span>{t('pendingDelivery')}</span>
                  <strong>{formatOilPack(summary!.pendingDelivery, packLabels)}</strong>
                </div>
                <div className="my-oil-strip__row">
                  <span>{t('delivered')}</span>
                  <strong>{formatOilPack(summary!.delivered, packLabels)}</strong>
                </div>
              </div>

              <div className="my-oil-actions">
                <Button variant="primary" onClick={() => setShowGive(true)} disabled={busy}>
                  {t('giveSell')}
                </Button>
                <Button variant="secondary" onClick={() => setShowHistory((v) => !v)}>
                  {t('whyBalance')}
                </Button>
              </div>

              {waiting.length > 0 ? (
                <section className="my-oil-section">
                  <h2>{t('mustGive')}</h2>
                  <p className="my-oil-hero__pack">{t('personWaiting', { count: waiting.length })}</p>
                  <ul className="my-oil-waiting">
                    {waiting.map((c) => (
                      <li key={c.id} className="my-oil-waiting__item">
                        <div className="my-oil-waiting__top">
                          <span className="my-oil-waiting__name">{c.counterpartyName}</span>
                          <span className="my-oil-waiting__status">
                            {t(`status.${c.derivedStatus}`, { defaultValue: c.derivedStatus })}
                          </span>
                        </div>
                        <div>{formatOilPack(c.remaining, packLabels)}</div>
                        {c.isSale && c.amount != null ? <div>€{c.amount}</div> : null}
                        <div className="my-oil-lot__actions">
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={busy}
                            onClick={() => void onDeliver(c)}
                          >
                            {t('markDelivered')}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="my-oil-section">
                <h2>{t('lots')}</h2>
                <ul className="my-oil-lots">
                  {summary!.lots.map((lot) => {
                    const where = lot.fieldIds
                      .map((id) => fieldNames[id])
                      .filter(Boolean)
                      .join(' · ');
                    return (
                      <li key={lot.id} className="my-oil-lot">
                        <div className="my-oil-lot__when">
                          <span>{formatWhen(lot.pressedOn)}</span>
                          {where ? <span className="my-oil-lot__where">{where}</span> : null}
                        </div>
                        <div className="my-oil-lot__pack">{formatOilPack(lot.packing, packLabels)}</div>
                        <div className="my-oil-lot__actions">
                          <Button variant="ghost" size="sm" onClick={() => setRepackLot(lot)}>
                            {t('repack')}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setAdjustLot(lot)}>
                            {t('adjust')}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {showHistory ? (
                <section className="my-oil-section">
                  <h2>{t('history')}</h2>
                  <ul className="my-oil-history">
                    {movements.map((m) => (
                      <li key={m.id}>
                        <span>
                          {t(`movement.${m.kind}`, { defaultValue: m.kind })}
                          {m.notes ? ` — ${m.notes}` : ''}
                        </span>
                        <span className="my-oil-history__delta">
                          {m.litresDelta > 0 ? '+' : ''}
                          {Math.round(m.litresDelta * 10) / 10} L
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>

      {showGive ? (
        <GiveOilSheet
          available={summary?.available}
          busy={busy}
          onClose={() => setShowGive(false)}
          onSave={async (input) => {
            setBusy(true);
            try {
              await oilStockService.createCommitment(input);
              setShowGive(false);
              await reload();
            } catch (err) {
              throw err;
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}

      {repackLot ? (
        <RepackSheet
          lot={repackLot}
          busy={busy}
          onClose={() => setRepackLot(null)}
          onSave={async (add16, add17) => {
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
      ) : null}

      {adjustLot ? (
        <AdjustSheet
          lot={adjustLot}
          busy={busy}
          onClose={() => setAdjustLot(null)}
          onSave={async (kind, pack) => {
            setBusy(true);
            try {
              await oilStockService.adjust({
                oilLotId: adjustLot.id,
                kind,
                pack,
              });
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

type GiveProps = {
  available?: OilStockSummary['available'];
  busy: boolean;
  onClose: () => void;
  onSave: (input: {
    counterpartyName: string;
    requested: OilPackInput;
    isSale: boolean;
    amount?: number;
    alreadyDelivered: boolean;
  }) => Promise<void>;
};

const GiveOilSheet: React.FC<GiveProps> = ({ available, busy, onClose, onSave }) => {
  const { t } = useTranslation('myOil');
  const [name, setName] = useState('');
  const [pack, setPack] = useState<OilPackInput>(emptyOilPackInput());
  const [isSale, setIsSale] = useState(true);
  const [amount, setAmount] = useState('');
  const [already, setAlready] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canSave =
    name.trim().length > 0 && packLitresOf(pack) > 0.05 && (!isSale || Number(amount) > 0);

  return (
    <div className="my-oil-sheet" role="dialog" aria-modal="true">
      <div className="my-oil-sheet__panel">
        <h2>{t('sheet.title')}</h2>
        <div className="my-oil-field">
          <span>{t('sheet.who')}</span>
          <SaleBuyerPicker value={name} onChange={setName} />
        </div>
        <p>{t('sheet.what')}</p>
        <div className="my-oil-field">
          <label htmlFor="my-oil-t16">{t('sheet.tin16')}</label>
          <input
            id="my-oil-t16"
            type="number"
            min={0}
            value={pack.tin16 || ''}
            onChange={(e) =>
              setPack(
                clampPackInput(
                  { ...pack, tin16: Number(e.target.value) || 0 },
                  available
                )
              )
            }
          />
        </div>
        <div className="my-oil-field">
          <label htmlFor="my-oil-t17">{t('sheet.tin17')}</label>
          <input
            id="my-oil-t17"
            type="number"
            min={0}
            value={pack.tin17 || ''}
            onChange={(e) =>
              setPack(
                clampPackInput(
                  { ...pack, tin17: Number(e.target.value) || 0 },
                  available
                )
              )
            }
          />
        </div>
        <div className="my-oil-field">
          <label htmlFor="my-oil-bulk">{t('sheet.bulk')}</label>
          <input
            id="my-oil-bulk"
            type="number"
            min={0}
            step="0.1"
            value={pack.bulkLitres || ''}
            onChange={(e) =>
              setPack(
                clampPackInput(
                  { ...pack, bulkLitres: Number(e.target.value) || 0 },
                  available
                )
              )
            }
          />
        </div>
        <div className="my-oil-field">
          <span>{t('sheet.isSale')}</span>
          <div className="my-oil-toggle">
            <button type="button" className={isSale ? 'is-on' : ''} onClick={() => setIsSale(true)}>
              {t('sheet.yes')}
            </button>
            <button type="button" className={!isSale ? 'is-on' : ''} onClick={() => setIsSale(false)}>
              {t('sheet.no')}
            </button>
          </div>
        </div>
        {isSale ? (
          <div className="my-oil-field">
            <label htmlFor="my-oil-eur">{t('sheet.amount')}</label>
            <input
              id="my-oil-eur"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        ) : null}
        <div className="my-oil-field">
          <span>{t('sheet.alreadyTaken')}</span>
          <div className="my-oil-toggle">
            <button type="button" className={already ? 'is-on' : ''} onClick={() => setAlready(true)}>
              {t('sheet.yes')}
            </button>
            <button type="button" className={!already ? 'is-on' : ''} onClick={() => setAlready(false)}>
              {t('sheet.no')}
            </button>
          </div>
        </div>
        {saveError ? <p className="my-oil-sheet__error">{saveError}</p> : null}
        <div className="my-oil-sheet__actions">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('sheet.cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={!canSave || busy}
            onClick={() => {
              setSaveError(null);
              void onSave({
                counterpartyName: name.trim(),
                requested: pack,
                isSale,
                amount: isSale ? Number(amount) : undefined,
                alreadyDelivered: already,
              }).catch(() => setSaveError(t('error')));
            }}
          >
            {busy ? t('sheet.saving') : t('sheet.save')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const RepackSheet: React.FC<{
  lot: OilLot;
  busy: boolean;
  onClose: () => void;
  onSave: (add16: number, add17: number) => Promise<void>;
}> = ({ lot, busy, onClose, onSave }) => {
  const { t } = useTranslation('myOil');
  const [add16, setAdd16] = useState(0);
  const [add17, setAdd17] = useState(0);
  const need = add16 * 16 + add17 * 17;
  const left = Math.round((lot.packing.bulkLitres - need) * 10) / 10;

  return (
    <div className="my-oil-sheet" role="dialog" aria-modal="true">
      <div className="my-oil-sheet__panel">
        <h2>{t('repackSheet.title')}</h2>
        <p>{t('repackHint')}</p>
        <div className="my-oil-field">
          <label>{t('repackSheet.add16')}</label>
          <input
            type="number"
            min={0}
            value={add16 || ''}
            onChange={(e) => setAdd16(Math.max(0, Math.round(Number(e.target.value) || 0)))}
          />
        </div>
        <div className="my-oil-field">
          <label>{t('repackSheet.add17')}</label>
          <input
            type="number"
            min={0}
            value={add17 || ''}
            onChange={(e) => setAdd17(Math.max(0, Math.round(Number(e.target.value) || 0)))}
          />
        </div>
        <p>{t('repackSheet.bulkLeft', { amount: left })}</p>
        <div className="my-oil-sheet__actions">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('sheet.cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={busy || need <= 0 || left < -0.05}
            onClick={() => void onSave(add16, add17)}
          >
            {t('repackSheet.save')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const AdjustSheet: React.FC<{
  lot: OilLot;
  busy: boolean;
  onClose: () => void;
  onSave: (kind: string, pack: OilPackInput) => Promise<void>;
}> = ({ lot, busy, onClose, onSave }) => {
  const { t } = useTranslation('myOil');
  const [kind, setKind] = useState('gifted');
  const [pack, setPack] = useState<OilPackInput>(emptyOilPackInput());
  const additive = kind === 'correction' || kind === 'returned';

  return (
    <div className="my-oil-sheet" role="dialog" aria-modal="true">
      <div className="my-oil-sheet__panel">
        <h2>{t('adjustSheet.title')}</h2>
        <div className="my-oil-field">
          <label>{t('adjustSheet.kind')}</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="gifted">{t('adjustSheet.gifted')}</option>
            <option value="home_use">{t('adjustSheet.home_use')}</option>
            <option value="consumed">{t('adjustSheet.consumed')}</option>
            <option value="correction">{t('adjustSheet.correction')}</option>
            <option value="returned">{t('adjustSheet.returned')}</option>
          </select>
        </div>
        <div className="my-oil-field">
          <label>{t('sheet.tin16')}</label>
          <input
            type="number"
            min={0}
            value={pack.tin16 || ''}
            onChange={(e) =>
              setPack(
                clampPackInput(
                  { ...pack, tin16: Number(e.target.value) || 0 },
                  additive ? undefined : lot.packing
                )
              )
            }
          />
        </div>
        <div className="my-oil-field">
          <label>{t('sheet.tin17')}</label>
          <input
            type="number"
            min={0}
            value={pack.tin17 || ''}
            onChange={(e) =>
              setPack(
                clampPackInput(
                  { ...pack, tin17: Number(e.target.value) || 0 },
                  additive ? undefined : lot.packing
                )
              )
            }
          />
        </div>
        <div className="my-oil-field">
          <label>{t('sheet.bulk')}</label>
          <input
            type="number"
            min={0}
            step="0.1"
            value={pack.bulkLitres || ''}
            onChange={(e) =>
              setPack(
                clampPackInput(
                  { ...pack, bulkLitres: Number(e.target.value) || 0 },
                  additive ? undefined : lot.packing
                )
              )
            }
          />
        </div>
        <div className="my-oil-sheet__actions">
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
        </div>
      </div>
    </div>
  );
};

export default MyOilPage;
