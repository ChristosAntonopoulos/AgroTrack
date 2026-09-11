import React from 'react';
import { useTranslation } from 'react-i18next';
import { Handshake, Plus } from 'lucide-react';
import Button from '../Common/Button';
import PartnerLinkCard from './PartnerLinkCard';
import { OwnerPartnerSeat } from '../../services/ownerPartnerService';

type Props = {
  seat: OwnerPartnerSeat | null;
  loading?: boolean;
  canManage?: boolean;
  onAdd: () => void;
  onChanged: () => void;
};

const PartnerSeatSection: React.FC<Props> = ({ seat, loading, canManage, onAdd, onChanged }) => {
  const { t } = useTranslation(['partners']);
  const seatsUsed = seat?.seatsUsed ?? 0;
  const seatsMax = seat?.seatsMax ?? 1;
  const partner = seat?.partner ?? null;
  const canAdd = Boolean(canManage && seatsUsed < seatsMax && !partner);

  return (
    <section className="partners-section family-section" aria-labelledby="partner-seat-title">
      <div className="partners-section-head">
        <div>
          <h2 id="partner-seat-title">
            <Handshake size={20} aria-hidden />
            {t('partners:ownerPartner.title')}
            {!loading && partner ? <span className="partners-count">1</span> : null}
          </h2>
          <p className="partners-lead">
            {t('partners:ownerPartner.lead', { used: seatsUsed, max: seatsMax })}
          </p>
        </div>
        {canAdd ? (
          <Button onClick={onAdd} icon={<Plus size={18} aria-hidden />}>
            {t('partners:ownerPartner.addPartner')}
          </Button>
        ) : null}
      </div>

      {!loading && !partner ? (
        <div className="family-empty">
          <p className="partners-inline-hint">{t('partners:ownerPartner.empty')}</p>
          {canManage && canAdd ? (
            <Button onClick={onAdd} icon={<Plus size={18} aria-hidden />}>
              {t('partners:ownerPartner.addPartner')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {partner ? (
        <div className="partners-people-list">
          <PartnerLinkCard link={partner} canManage={canManage} onChanged={onChanged} />
        </div>
      ) : null}
    </section>
  );
};

export default PartnerSeatSection;
