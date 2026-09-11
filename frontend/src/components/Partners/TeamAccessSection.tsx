import React from 'react';
import { useTranslation } from 'react-i18next';
import { Handshake, Plus, Users } from 'lucide-react';
import Button from '../Common/Button';
import FamilyMemberCard from './FamilyMemberCard';
import PartnerLinkCard from './PartnerLinkCard';
import { FamilyCircle } from '../../services/familyService';
import { OwnerPartnerSeat } from '../../services/ownerPartnerService';

type Props = {
  family: FamilyCircle | null;
  partnerSeat: OwnerPartnerSeat | null;
  loading?: boolean;
  canManage?: boolean;
  onAddFamily: () => void;
  onAddPartner: () => void;
  onFamilyChanged: () => void;
  onPartnerChanged: () => void;
};

const TeamAccessSection: React.FC<Props> = ({
  family,
  partnerSeat,
  loading,
  canManage,
  onAddFamily,
  onAddPartner,
  onFamilyChanged,
  onPartnerChanged,
}) => {
  const { t } = useTranslation(['partners']);
  const familyUsed = family?.seatsUsed ?? 0;
  const familyMax = family?.seatsMax ?? 2;
  const members = family?.members ?? [];
  const partner = partnerSeat?.partner ?? null;
  const partnerUsed = partnerSeat?.seatsUsed ?? (partner ? 1 : 0);
  const partnerMax = partnerSeat?.seatsMax ?? 1;
  const canAddFamily = Boolean(canManage && familyUsed < familyMax);
  const canAddPartner = Boolean(canManage && partnerUsed < partnerMax && !partner);
  const hasAnyone = members.length > 0 || Boolean(partner);

  return (
    <section className="partners-section team-access-section" aria-labelledby="team-access-title">
      <div className="partners-section-head">
        <div>
          <h2 id="team-access-title">{t('partners:team.title')}</h2>
          <p className="partners-lead">{t('partners:team.lead')}</p>
        </div>
      </div>

      <div className="team-seat-rows" role="list">
        <div className="team-seat-row" role="listitem">
          <span className="team-seat-icon" aria-hidden>
            <Users size={18} />
          </span>
          <div className="team-seat-copy">
            <strong>{t('partners:family.title')}</strong>
            <span className="team-seat-count">
              {loading ? '…' : t('partners:team.seats', { used: familyUsed, max: familyMax })}
            </span>
          </div>
          {canAddFamily ? (
            <Button variant="outline" size="sm" onClick={onAddFamily} icon={<Plus size={16} aria-hidden />}>
              {t('partners:team.add')}
            </Button>
          ) : null}
        </div>

        <div className="team-seat-row" role="listitem">
          <span className="team-seat-icon" aria-hidden>
            <Handshake size={18} />
          </span>
          <div className="team-seat-copy">
            <strong>{t('partners:ownerPartner.title')}</strong>
            <span className="team-seat-count">
              {loading ? '…' : t('partners:team.seats', { used: partnerUsed, max: partnerMax })}
            </span>
          </div>
          {canAddPartner ? (
            <Button variant="outline" size="sm" onClick={onAddPartner} icon={<Plus size={16} aria-hidden />}>
              {t('partners:team.add')}
            </Button>
          ) : null}
        </div>
      </div>

      {!loading && !hasAnyone && !canAddFamily && !canAddPartner ? (
        <p className="team-access-empty">{t('partners:team.empty')}</p>
      ) : null}

      {hasAnyone ? (
        <div className="partners-people-list team-access-people">
          {members.map((member) => (
            <FamilyMemberCard
              key={member.id}
              member={member}
              canManage={canManage}
              onChanged={onFamilyChanged}
            />
          ))}
          {partner ? (
            <PartnerLinkCard link={partner} canManage={canManage} onChanged={onPartnerChanged} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default TeamAccessSection;
