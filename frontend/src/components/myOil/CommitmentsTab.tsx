import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark } from 'lucide-react';
import Button from '../Common/Button';
import RightDrawer from '../Common/RightDrawer';
import { formatOilPack } from '../../myOil/formatOilPack';
import {
  holdState,
  isHouseholdCommitment,
  type CommitmentFilter} from '../../myOil/commitmentCopy';
import { useDrawerPresence } from '../../hooks/useDrawerPresence';
import type { OilCommitment, OilLot } from '../../services/oilStockService';

type PackLabels = {
  tin: (count: number, size: number) => string;
  bulk: (amount: number) => string;
  litres: (amount: number) => string;
};

type Props = {
  open: OilCommitment[];
  closed?: OilCommitment[];
  lots: OilLot[];
  fieldNames: Record<string, string>;
  busy: boolean;
  packLabels: PackLabels;
  formatDate: (iso: string) => string;
  onDeliver: (c: OilCommitment) => void;
  onCancel: (c: OilCommitment) => void;
  onGive: () => void;
};

export function CommitmentsTab({
  open,
  closed = [],
  lots,
  fieldNames,
  busy,
  packLabels,
  formatDate,
  onDeliver,
  onCancel,
  onGive}: Props) {
  const { t } = useTranslation(['myOil', 'common']);
  const [filter, setFilter] = useState<CommitmentFilter>('all');
  const [detail, setDetail] = useState<OilCommitment | null>(null);
  const detailDrawer = useDrawerPresence(detail);

  // One list, deduped: the summary carries the live ones, the closed set the rest.
  const all = useMemo(() => {
    const seen = new Set<string>();
    return [...open, ...closed].filter((c) => (seen.has(c.id) ? false : seen.add(c.id)));
  }, [open, closed]);

  const filtered = useMemo(
    () => (filter === 'all' ? all : all.filter((c) => holdState(c) === filter)),
    [filter, all]
  );

  const statusFor = (c: OilCommitment) => {
    const state = holdState(c);
    if (state === 'completed' && isHouseholdCommitment(c)) return t('story.atHome');
    return t(`holds.state.${state}`);
  };

  const packOf = (c: OilCommitment) =>
    holdState(c) === 'active' ? c.remaining : c.requested;

  const lotLines = (c: OilCommitment) =>
    c.allocations
      .map((a) => {
        const lot = lots.find((l) => l.id === a.oilLotId);
        if (!lot) return null;
        const where = lot.fieldIds.map((id) => fieldNames[id]).filter(Boolean).join(' · ');
        return `${formatDate(lot.pressedOn)}${where ? ` · ${where}` : ''}`;
      })
      .filter(Boolean) as string[];

  const active = detailDrawer.value;

  return (
    <div>
      <div className="my-oil-chips" role="tablist">
        {(['all', 'active', 'completed', 'cancelled'] as CommitmentFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? 'is-on' : ''}
            onClick={() => setFilter(f)}
          >
            {t(`commitments.filters.${f}`)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <section className="my-oil-panel">
          <div className="my-oil-empty">
            <p className="my-oil-empty__title">
              {filter === 'completed'
                ? t('commitments.emptyDeliveredTitle')
                : t('commitments.emptyTitle')}
            </p>
            {filter === 'all' || filter === 'active' ? (
              <>
                <p className="my-oil-empty__body">{t('commitments.emptyBody')}</p>
                <div style={{ marginTop: '0.75rem' }}>
                  <Button variant="primary" onClick={onGive}>
                    {t('commitments.emptyCta')}
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </section>
      ) : (
        <ul className="my-oil-waiting">
          {filtered.map((c) => (
            <li key={c.id} className="my-oil-hold">
              <div className="my-oil-hold__top">
                <div className="my-oil-hold__who">
                  <strong>{c.counterpartyName}</strong>
                  <span>{statusFor(c)}</span>
                </div>
                <em>{formatOilPack(packOf(c), packLabels)}</em>
              </div>
              {c.isSale && c.amount != null ? (
                <p className="my-oil-hold__meta">
                  {t('commitments.paidAmount', { amount: c.amount })}
                </p>
              ) : c.createdAt && !c.promisedFor ? (
                <p className="my-oil-hold__meta">
                  {t('commitments.since')} {formatDate(c.createdAt)}
                </p>
              ) : null}
              <div className="my-oil-waiting__actions">
                {holdState(c) === 'active' ? (
                  <>
                    <Button variant="primary" size="sm" disabled={busy} onClick={() => onDeliver(c)}>
                      {t('actions.delivered')}
                    </Button>
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => onCancel(c)}>
                      {t('actions.cancelHold')}
                    </Button>
                  </>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => setDetail(c)}>
                  {t('commitments.details')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {detailDrawer.mounted && active ? (
        <RightDrawer
          open={detailDrawer.open}
          onClose={() => setDetail(null)}
          size="md"
          title={active.counterpartyName}
          subtitle={statusFor(active)}
          icon={<Bookmark size={18} strokeWidth={1.75} aria-hidden />}
          closeLabel={t('common:close')}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDetail(null)}>
                {t('cancel')}
              </Button>
              {holdState(active) === 'active' ? (
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() => {
                    setDetail(null);
                    onDeliver(active);
                  }}
                >
                  {t('actions.delivered')}
                </Button>
              ) : null}
            </>
          }
        >
          <div className="my-oil-flow">
            <dl className="my-oil-hold-facts">
              <div>
                <dt>{t('commitments.who')}</dt>
                <dd>{active.counterpartyName}</dd>
              </div>
              <div>
                <dt>{t('commitments.howMuch')}</dt>
                <dd>{formatOilPack(packOf(active), packLabels)}</dd>
              </div>
              <div>
                <dt>{t('commitments.status')}</dt>
                <dd>{statusFor(active)}</dd>
              </div>
              {active.promisedFor ? (
                <div>
                  <dt>{t('commitments.when')}</dt>
                  <dd>{formatDate(active.promisedFor)}</dd>
                </div>
              ) : active.createdAt ? (
                <div>
                  <dt>{t('commitments.since')}</dt>
                  <dd>{formatDate(active.createdAt)}</dd>
                </div>
              ) : null}
              {active.isSale && active.amount != null ? (
                <div>
                  <dt>{t('commitments.payment')}</dt>
                  <dd>
                    {t('commitments.paidAmount', { amount: active.amount })}
                    {active.financialTransactionId ? (
                      <>
                        {' · '}
                        <a href={`/money?tx=${encodeURIComponent(active.financialTransactionId)}`}>
                          {t('seeIncome')}
                        </a>
                      </>
                    ) : null}
                  </dd>
                </div>
              ) : active.financialTransactionId ? (
                <div>
                  <dt>{t('commitments.payment')}</dt>
                  <dd>
                    <a href={`/money?tx=${encodeURIComponent(active.financialTransactionId)}`}>
                      {t('seeIncome')}
                    </a>
                  </dd>
                </div>
              ) : null}
              {active.notes?.trim() ? (
                <div>
                  <dt>{t('commitments.note')}</dt>
                  <dd>{active.notes}</dd>
                </div>
              ) : null}
            </dl>
            {lotLines(active).length > 0 ? (
              <>
                <p className="my-oil-flow__step">{t('commitments.fromLots')}</p>
                <ul className="my-oil-flow__list">
                  {lotLines(active).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {holdState(active) === 'active' ? (
              <button
                type="button"
                className="my-oil-linkish"
                onClick={() => {
                  setDetail(null);
                  onCancel(active);
                }}
              >
                {t('actions.cancelHold')}
              </button>
            ) : null}
          </div>
        </RightDrawer>
      ) : null}
    </div>
  );
}
