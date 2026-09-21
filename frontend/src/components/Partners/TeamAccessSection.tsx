import React from 'react';
import { useTranslation } from 'react-i18next';
import { Handshake, Plus, Users } from 'lucide-react';
import Button from '../Common/Button';
import FieldSeatCard from './FieldSeatCard';
import {
  FieldMembership,
  MAX_FAMILY_SEATS,
  MAX_PARTNER_SEATS,
  countSeats,
} from '../../services/fieldPeopleService';

type Props = {
  fieldId: string;
  people: FieldMembership[];
  loading?: boolean;
  canManage?: boolean;
  onAddFamily: () => void;
  onAddPartner: () => void;
  onChanged: () => void;
};

const TeamAccessSection: React.FC<Props> = ({
  fieldId,
  people,
  loading,
  canManage,
  onAddFamily,
  onAddPartner,
  onChanged,
}) => {
  const { t } = useTranslation(['partners']);
  const familyUsed = countSeats(people, 'Family');
  const partnerUsed = countSeats(people, 'Partner');
  const familyMax = MAX_FAMILY_SEATS;
  const partnerMax = MAX_PARTNER_SEATS;
  const familyMembers = people.filter(
    (p) => p.role === 'Family' && !/^revoked$/i.test(p.status) && !/^removed$/i.test(p.status)
  );
  const partners = people.filter(
    (p) => p.role === 'Partner' && !/^revoked$/i.test(p.status) && !/^removed$/i.test(p.status)
  );
  const canAddFamily = Boolean(canManage && familyUsed < familyMax);
  const canAddPartner = Boolean(canManage && partnerUsed < partnerMax);
  const hasAnyone = familyMembers.length > 0 || partners.length > 0;

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
          {familyMembers.map((member) => (
            <FieldSeatCard
              key={`${member.userId}-family`}
              fieldId={fieldId}
              person={member}
              canManage={canManage}
              onChanged={onChanged}
            />
          ))}
          {partners.map((partner) => (
            <FieldSeatCard
              key={`${partner.userId}-partner`}
              fieldId={fieldId}
              person={partner}
              canManage={canManage}
              onChanged={onChanged}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default TeamAccessSection;
