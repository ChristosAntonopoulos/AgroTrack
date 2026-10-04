import React from 'react';
import { useTranslation } from 'react-i18next';
import { HandHelping } from 'lucide-react';
import Button from '../Common/Button';
import { OilSectionHeader } from './OilStockChrome';
import { formatOilPack } from '../../myOil/formatOilPack';
import type { OilShareRequest } from '../../services/oilStockService';

type PackLabels = {
  tin: (count: number, size: number) => string;
  bulk: (amount: number) => string;
  litres: (amount: number) => string;
};

type Props = {
  requests: OilShareRequest[];
  busy: boolean;
  packLabels: PackLabels;
  onAccept: (r: OilShareRequest) => void;
  onReject: (r: OilShareRequest) => void;
};

export function OilShareRequestsSection({
  requests,
  busy,
  packLabels,
  onAccept,
  onReject,
}: Props) {
  const { t } = useTranslation('myOil');
  if (requests.length === 0) return null;

  return (
    <section className="my-oil-panel my-oil-panel--action" aria-label={t('shareInbox.title')}>
      <OilSectionHeader titleKey="shareInbox.title" introKey="shareInbox.hint" icon={HandHelping} />
      <ul className="my-oil-waiting">
        {requests.map((r) => (
          <li key={r.id} className="my-oil-hold">
            <div className="my-oil-hold__top">
              <div className="my-oil-hold__who">
                <strong>{r.toDisplayName || t('shareInbox.someone')}</strong>
                <span>{t('shareInbox.asking')}</span>
              </div>
              <em>{formatOilPack(r.requested, packLabels)}</em>
            </div>
            <div className="my-oil-waiting__actions">
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => onReject(r)}>
                {t('shareInbox.reject')}
              </Button>
              <Button variant="primary" size="sm" disabled={busy} onClick={() => onAccept(r)}>
                {t('shareInbox.accept')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
