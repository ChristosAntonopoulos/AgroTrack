import React from 'react';
import { useTranslation } from 'react-i18next';
import { Handshake, Plus, Users } from 'lucide-react';
import Button from '../Common/Button';
import FieldSeatCard from './FieldSeatCard';
import {
  FieldInvite,
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
  /** Session invites keyed by invite id — enables share-again with QR. */
  pendingInvitesById?: Record<string, FieldInvite>;
  onAddFamily: () => void;
  onAddPartner: () => void;
  onChanged: () => void;
};

const TeamAccessSection: React.FC<Props> = ({
  fieldId,
  people,
  loading,
  canManage,
  pendingInvitesById = {},
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
    <section
      className={`partners-section team-access-section${loading ? ' is-updating' : ''}`}
      aria-labelledby="team-access-title"
      aria-busy={loading || undefined}
    >
      {loading ? (
        <div className="team-access-updating" role="status">
          {t('partners:team.updating')}
        </div>
      ) : null}
      <div className="partners-section-head">
        <div>
          <h2 id="team-access-title">{t('partners:team.title')}</h2>
          <p className="partners-lead">{t('partners:team.lead')}</p>
          <p className="partners-inline-hint">{t('partners:contactsVsUsers')}</p>
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
              {t('partners:team.seats', { used: familyUsed, max: familyMax })}
            </span>
          </div>
          {canManage ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddFamily}
              disabled={!canAddFamily || loading}
              icon={<Plus size={16} aria-hidden />}
            >
              {t('partners:team.addFamily')}
            </Button>
          ) : null}
        </div>
        {!canAddFamily && canManage ? (
          <p className="partners-inline-hint">
            {t('partners:inviteFamilySeatFull', { used: familyUsed, max: familyMax })}
          </p>
        ) : null}

        <div className="team-seat-row" role="listitem">
          <span className="team-seat-icon" aria-hidden>
            <Handshake size={18} />
          </span>
          <div className="team-seat-copy">
            <strong>{t('partners:ownerPartner.title')}</strong>
            <span className="team-seat-count">
              {t('partners:team.seats', { used: partnerUsed, max: partnerMax })}
            </span>
          </div>
          {canManage ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddPartner}
              disabled={!canAddPartner || loading}
              icon={<Plus size={16} aria-hidden />}
            >
              {t('partners:team.addPartner')}
            </Button>
          ) : null}
        </div>
        {!canAddPartner && canManage ? (
          <p className="partners-inline-hint">
            {t('partners:invitePartnerSeatFull', { used: partnerUsed, max: partnerMax })}
          </p>
        ) : null}
      </div>

      {!loading && !hasAnyone ? (
        <p className="team-access-empty">{t('partners:team.empty')}</p>
      ) : null}

      {hasAnyone && !loading ? (
        <div className="partners-people-list team-access-people">
          {familyMembers.map((member) => (
            <FieldSeatCard
              key={`${member.userId || member.inviteId || member.email}-family`}
              fieldId={fieldId}
              person={member}
              canManage={canManage}
              pendingInvite={member.inviteId ? pendingInvitesById[member.inviteId] : null}
              onChanged={onChanged}
            />
          ))}
          {partners.map((partner) => (
            <FieldSeatCard
              key={`${partner.userId || partner.inviteId || partner.email}-partner`}
              fieldId={fieldId}
              person={partner}
              canManage={canManage}
              pendingInvite={partner.inviteId ? pendingInvitesById[partner.inviteId] : null}
              onChanged={onChanged}
            />
          ))}
        </div>
      ) : loading ? (
        <div className="team-access-skeletons" aria-hidden>
          <div className="team-access-skeleton" />
          <div className="team-access-skeleton" />
        </div>
      ) : null}
    </section>
  );
};

export default TeamAccessSection;
