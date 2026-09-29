import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark } from 'lucide-react';
import Button from '../Common/Button';
import RightDrawer from '../Common/RightDrawer';
import { formatOilPack } from '../../myOil/formatOilPack';
import {
  commitmentStoryKey,
  deliverButtonKey,
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
    if (filter === 'all') return open;
    if (filter === 'held') return open.filter((c) => c.derivedStatus === 'reserved');
    if (filter === 'pending') return open.filter((c) => c.derivedStatus === 'pending_delivery');
    return delivered;
  }, [filter, open, delivered]);

  const storyFor = (c: OilCommitment) => {
    const key = commitmentStoryKey(c);
    if (key === 'heldForDate' && c.promisedFor) {
      return t('story.heldForDate', { date: formatDate(c.promisedFor) });
    }
    if (key === 'heldForSomeone') {
      return t('story.heldForSomeone', { name: c.counterpartyName });
    }
    return t(`story.${key}`);
  };

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
            <li key={c.id} className="my-oil-waiting__item">
              <div className="my-oil-waiting__name">{c.counterpartyName}</div>
              <div className="my-oil-waiting__pack">
                {formatOilPack(
                  c.derivedStatus === 'delivered' ? c.requested : c.remaining,
                  packLabels
                )}
              </div>
              {c.isSale && c.amount != null ? (
                <p className="my-oil-waiting__story">
                  {t('commitments.paidAmount', { amount: c.amount })}
                </p>
              ) : null}
              <p className="my-oil-waiting__story">{storyFor(c)}</p>
              {c.promisedFor || c.createdAt ? (
                <p className="my-oil-waiting__story">
                  {formatDate(c.promisedFor || c.createdAt)}
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
          subtitle={formatOilPack(
            active.derivedStatus === 'delivered' ? active.requested : active.remaining,
            packLabels
          )}
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
            <p className="my-oil-waiting__story">{storyFor(active)}</p>
            {active.isSale && active.amount != null ? (
              <p className="my-oil-waiting__story">
                {t('commitments.paidOn', { date: formatDate(active.createdAt) })}
              </p>
            ) : null}
            {active.derivedStatus !== 'delivered' ? (
              <p className="my-oil-waiting__story">{t('commitments.notDeliveredYet')}</p>
            ) : (
              <p className="my-oil-waiting__story">{t('commitments.delivered')}</p>
            )}
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
