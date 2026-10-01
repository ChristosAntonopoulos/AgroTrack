import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import Button from '../Common/Button';
import { formatOilPack } from '../../myOil/formatOilPack';
import { commitmentStoryKey } from '../../myOil/commitmentCopy';
import { OilSectionHeader } from './OilStockChrome';
import type { OilCommitment } from '../../services/oilStockService';

type PackLabels = {
  tin: (count: number, size: number) => string;
  bulk: (amount: number) => string;
  litres: (amount: number) => string;
};

type PendingProps = {
  waiting: OilCommitment[];
  busy: boolean;
  packLabels: PackLabels;
  onDeliver: (c: OilCommitment) => void;
  onDetails: (c: OilCommitment) => void;
  formatDate: (iso: string) => string;
};

export function OilPendingSection({
  waiting,
  busy,
  packLabels,
  onDeliver,
  onDetails,
  formatDate,
}: PendingProps) {
  const { t } = useTranslation('myOil');

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

  return (
    <section className={`my-oil-panel ${waiting.length ? 'my-oil-panel--action' : 'my-oil-panel--calm'}`}>
      <OilSectionHeader titleKey="needsNow.title" />
      {waiting.length === 0 ? (
        <div className="my-oil-empty my-oil-empty--visual">
          <CheckCircle2 size={28} strokeWidth={1.5} className="my-oil-empty__icon" aria-hidden />
          <p className="my-oil-empty__title">{t('needsNow.emptyTitle')}</p>
        </div>
      ) : (
        <ul className="my-oil-waiting">
          {waiting.slice(0, 3).map((c) => (
            <li key={c.id} className="my-oil-waiting__item">
              <div className="my-oil-waiting__name">{c.counterpartyName}</div>
              <div className="my-oil-waiting__pack">{formatOilPack(c.remaining, packLabels)}</div>
              <p className="my-oil-waiting__story">{storyFor(c)}</p>
              {c.promisedFor ? (
                <p className="my-oil-waiting__story">
                  {t('needsNow.deliverBy', { date: formatDate(c.promisedFor) })}
                </p>
              ) : null}
              <div className="my-oil-waiting__actions">
                <Button variant="primary" size="sm" disabled={busy} onClick={() => onDeliver(c)}>
                  {t('actions.delivered')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDetails(c)}>
                  {t('needsNow.details')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
