import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark } from 'lucide-react';
import Button from '../Common/Button';
import RightDrawer from '../Common/RightDrawer';
import { formatOilPack } from '../../myOil/formatOilPack';
import {
  deliverButtonKey,
  isHouseholdCommitment,
  type CommitmentFilter,
} from '../../myOil/commitmentCopy';
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
  onGive,
}: Props) {
  const { t } = useTranslation(['myOil', 'common']);
  const [filter, setFilter] = useState<CommitmentFilter>('all');
  const [detail, setDetail] = useState<OilCommitment | null>(null);
  const detailDrawer = useDrawerPresence(detail);

  const delivered = useMemo(
    () =>
      closed.length
        ? closed
        : [...open, ...closed].filter((c) => c.derivedStatus === 'delivered' || c.cancelled),
    [open, closed]
  );

  const filtered = useMemo(() => {
    if (filter === 'all') {
      const openIds = new Set(open.map((c) => c.id));
      const takenHome = delivered.filter(
        (c) => isHouseholdCommitment(c) && !c.cancelled && c.derivedStatus === 'delivered' && !openIds.has(c.id)
      );
      return [...open, ...takenHome];
    }
    if (filter === 'held') return open.filter((c) => c.derivedStatus === 'reserved');
    if (filter === 'pending') return open.filter((c) => c.derivedStatus === 'pending_delivery');
    return delivered;
  }, [filter, open, delivered]);

  const statusFor = (c: OilCommitment) => {
    if (c.cancelled) return t('commitments.cancelled');
    if (isHouseholdCommitment(c) && c.derivedStatus === 'delivered') return t('story.atHome');
    if (c.derivedStatus === 'delivered') return t('commitments.delivered');
    if (c.derivedStatus === 'pending_delivery') {
      return c.isSale ? t('commitments.statusPaid') : t('commitments.statusWaiting');
    }
    if (c.isSale && (c.amount == null || c.amount <= 0) && !c.financialTransactionId) {
      return t('commitments.statusUnpaid');
    }
    if (c.promisedFor) return t('commitments.statusForDate', { date: formatDate(c.promisedFor) });
    return t('commitments.statusHeld');
  };

  const packOf = (c: OilCommitment) =>
    c.derivedStatus === 'delivered' || c.cancelled ? c.requested : c.remaining;

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
        {(['all', 'held', 'pending', 'delivered'] as CommitmentFilter[]).map((f) => (
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
              {filter === 'delivered'
                ? t('commitments.emptyDeliveredTitle')
                : t('commitments.emptyTitle')}
            </p>
            {filter !== 'delivered' ? (
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
                {c.derivedStatus !== 'delivered' && !c.cancelled ? (
                  <Button variant="primary" size="sm" disabled={busy} onClick={() => onDeliver(c)}>
                    {t(deliverButtonKey(c))}
                  </Button>
                ) : null}
                <Button variant="secondary" size="sm" onClick={() => setDetail(c)}>
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
          closeLabel={t('common:close', { defaultValue: 'Κλείσιμο' })}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDetail(null)}>
                {t('cancel')}
              </Button>
              {active.derivedStatus !== 'delivered' && !active.cancelled ? (
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() => {
                    setDetail(null);
                    onDeliver(active);
                  }}
                >
                  {t(deliverButtonKey(active))}
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
                  <dd>{t('commitments.paidAmount', { amount: active.amount })}</dd>
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
            {active.derivedStatus === 'reserved' && !active.cancelled ? (
              <button
                type="button"
                className="my-oil-linkish"
                onClick={() => {
                  setDetail(null);
                  onCancel(active);
                }}
              >
                {t('commitments.cancelHold')}
              </button>
            ) : null}
          </div>
        </RightDrawer>
      ) : null}
    </div>
  );
}
