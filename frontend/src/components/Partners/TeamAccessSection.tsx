import React, { useEffect, useMemo, useState } from 'react';
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
  fieldPeopleService,
} from '../../services/fieldPeopleService';
import { mapInviteLifecycle } from './inviteLifecycle';
import { friendlyFieldLabel } from '../../utils/fieldLabels';

type Props = {
  fieldId: string;
  fieldName?: string;
  fieldColor?: string;
  showFieldHeading?: boolean;
  people: FieldMembership[];
  loading?: boolean;
  canManage?: boolean;
  pendingInvitesById?: Record<string, FieldInvite>;
  onAddFamily: () => void;
  onAddPartner: () => void;
  onChanged: () => void;
};

const TeamAccessSection: React.FC<Props> = ({
  fieldId,
  fieldName,
  fieldColor,
  showFieldHeading,
  people,
  loading,
  canManage,
  pendingInvitesById = {},
  onAddFamily,
  onAddPartner,
  onChanged,
}) => {
  const { t } = useTranslation(['partners']);
  const [listedInvites, setListedInvites] = useState<FieldInvite[]>([]);
  const familyUsed = countSeats(people, 'Family');
  const partnerUsed = countSeats(people, 'Partner');
  const familyMax = MAX_FAMILY_SEATS;
  const partnerMax = MAX_PARTNER_SEATS;
  const activePeople = people.filter(
    (p) =>
      p.role !== 'Admin' &&
      !/^revoked$/i.test(p.status) &&
      !/^removed$/i.test(p.status) &&
      !/^pending$/i.test(p.status) &&
      !/^expired$/i.test(p.status)
  );
  const pendingPeople = people.filter(
    (p) =>
      p.role !== 'Admin' &&
      (/^pending$/i.test(p.status) || /^expired$/i.test(p.status) || /^invited$/i.test(p.status))
  );
  const familyMembers = activePeople.filter((p) => p.role === 'Family');
  const partners = activePeople.filter((p) => p.role === 'Partner');
  const canAddFamily = Boolean(canManage && familyUsed < familyMax);
  const canAddPartner = Boolean(canManage && partnerUsed < partnerMax);

  useEffect(() => {
    if (!fieldId || !canManage) {
      setListedInvites([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fieldPeopleService.listInvites(fieldId);
        if (!cancelled) setListedInvites(rows);
      } catch {
        if (!cancelled) setListedInvites([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fieldId, canManage, people]);

  const invitesById = useMemo(() => {
    const next: Record<string, FieldInvite> = { ...pendingInvitesById };
    listedInvites.forEach((invite) => {
      next[invite.id] = invite;
    });
    return next;
  }, [listedInvites, pendingInvitesById]);

  const pendingInvites = useMemo(
    () =>
      listedInvites.filter((invite) => {
        const life = mapInviteLifecycle(invite.status);
        return life === 'pending' || life === 'expired';
      }),
    [listedInvites]
  );

  const membershipFromInvite = (invite: FieldInvite): FieldMembership => ({
    userId: '',
    displayName: invite.displayName,
    email: invite.email,
    phone: invite.phone,
    role: invite.role,
    modules: invite.modules,
    accessLevel: invite.accessLevel,
    status: invite.status,
    inviteId: invite.id,
    invitedBy: invite.invitedBy,
    createdAt: invite.createdAt || invite.expiresAt,
  });

  const unmatchedPendingInvites = pendingInvites.filter((invite) => {
    const alreadyShown = pendingPeople.some(
      (person) =>
        person.inviteId === invite.id ||
        (person.email && invite.email && person.email.toLowerCase() === invite.email.toLowerCase())
    );
    return !alreadyShown;
  });
  const hasAnyone =
    familyMembers.length > 0 ||
    partners.length > 0 ||
    pendingPeople.length > 0 ||
    unmatchedPendingInvites.length > 0;

  const inviteForPerson = (person: FieldMembership) =>
    (person.inviteId ? invitesById[person.inviteId] : null) ||
    pendingInvites.find(
      (invite) =>
        (person.email && invite.email && person.email.toLowerCase() === invite.email.toLowerCase()) ||
        (person.displayName && invite.displayName && person.displayName === invite.displayName)
    ) ||
    null;

  const titleId = `team-access-title-${fieldId}`;
  const groveLabel = friendlyFieldLabel(fieldName);

  return (
    <section
      className={`partners-section team-access-section${loading ? ' is-updating' : ''}${
        showFieldHeading ? ' has-field-heading' : ''
      }`}
      style={fieldColor ? ({ '--field-accent': fieldColor } as React.CSSProperties) : undefined}
      aria-labelledby={titleId}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <div className="team-access-updating" role="status">
          {t('partners:team.updating')}
        </div>
      ) : null}
      <div className="partners-section-head">
        <div>
          {showFieldHeading ? (
            <>
              <p className="partners-field-kicker">{t('partners:team.title')}</p>
              <h2 id={titleId} className="team-access-field-title">
                <span
                  className="partners-field-swatch"
                  style={{ '--field-accent': fieldColor || '#8a9188' } as React.CSSProperties}
                  aria-hidden
                />
                {groveLabel || t('partners:team.title')}
              </h2>
              <p className="partners-lead">{t('partners:teamFieldLead')}</p>
              {!canManage ? (
                <p className="partners-inline-hint">{t('partners:team.viewOnly')}</p>
              ) : null}
            </>
          ) : (
            <>
              <h2 id={titleId}>{t('partners:team.title')}</h2>
              <p className="partners-lead">{t('partners:team.lead')}</p>
              <p className="partners-inline-hint">{t('partners:contactsVsUsers')}</p>
              {!canManage ? (
                <p className="partners-inline-hint">{t('partners:team.viewOnly')}</p>
              ) : null}
            </>
          )}
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
              {t('partners:seatsOccupied', { used: familyUsed, max: familyMax })}
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
        <p className="partners-inline-hint">{t('partners:seatsExplainFamily', { max: familyMax })}</p>
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
              {t('partners:seatsOccupied', { used: partnerUsed, max: partnerMax })}
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
        <p className="partners-inline-hint">{t('partners:seatsExplainPartner')}</p>
        {!canAddPartner && canManage ? (
          <p className="partners-inline-hint">
            {t('partners:invitePartnerSeatFull', { used: partnerUsed, max: partnerMax })}
          </p>
        ) : null}
      </div>

      {!loading && !hasAnyone ? (
        <p className="team-access-empty">{t('partners:team.empty')}</p>
      ) : null}

      {familyMembers.length + partners.length > 0 && !loading ? (
        <>
          <h3 className="partners-members-title">{t('partners:membersWithAccess')}</h3>
          <div className="partners-people-list team-access-people">
            {familyMembers.map((member) => (
              <FieldSeatCard
                key={`${member.userId || member.inviteId || member.email}-family`}
                fieldId={fieldId}
                fieldName={fieldName}
                fieldColor={fieldColor}
                person={member}
                canManage={canManage}
                pendingInvite={inviteForPerson(member)}
                onChanged={onChanged}
              />
            ))}
            {partners.map((partner) => (
              <FieldSeatCard
                key={`${partner.userId || partner.inviteId || partner.email}-partner`}
                fieldId={fieldId}
                fieldName={fieldName}
                fieldColor={fieldColor}
                person={partner}
                canManage={canManage}
                pendingInvite={inviteForPerson(partner)}
                onChanged={onChanged}
              />
            ))}
          </div>
        </>
      ) : null}

      {(pendingPeople.length > 0 || unmatchedPendingInvites.length > 0) && !loading ? (
        <>
          <h3 className="partners-pending-title">{t('partners:pendingInvites')}</h3>
          <div className="partners-people-list team-access-people">
            {pendingPeople.map((member) => (
              <FieldSeatCard
                key={`${member.userId || member.inviteId || member.email}-pending`}
                fieldId={fieldId}
                fieldName={fieldName}
                fieldColor={fieldColor}
                person={member}
                canManage={canManage}
                pendingInvite={inviteForPerson(member)}
                onChanged={onChanged}
              />
            ))}
            {unmatchedPendingInvites.map((invite) => (
              <FieldSeatCard
                key={`${invite.id}-invite-pending`}
                fieldId={fieldId}
                fieldName={fieldName}
                fieldColor={fieldColor}
                person={membershipFromInvite(invite)}
                canManage={canManage}
                pendingInvite={invite}
                onChanged={onChanged}
              />
            ))}
          </div>
        </>
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
