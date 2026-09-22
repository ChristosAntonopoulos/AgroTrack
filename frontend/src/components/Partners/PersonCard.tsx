import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Card from '../Common/Card';
import Button from '../Common/Button';
import { GrovePerson, linkedFieldIds } from './grovePeople';
import PhoneActions from './PhoneActions';
import FieldLinkPills from './FieldLinkPills';
import { fieldPeopleService } from '../../services/fieldPeopleService';
import type { Field } from '../../services/fieldService';
import '../../pages/PartnersPage.css';

type Props = {
  person: GrovePerson;
  fieldId?: string;
  fields?: Field[];
  canManage?: boolean;
  onEditContact?: (person: GrovePerson) => void;
  onInviteContact?: (person: GrovePerson) => void;
  onRemoved?: () => void;
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const PersonCard: React.FC<Props> = ({
  person,
  fieldId,
  fields = [],
  canManage,
  onEditContact,
  onInviteContact,
  onRemoved,
}) => {
  const { t } = useTranslation(['partners', 'common']);
  const connectedIds = linkedFieldIds(person);
  const linkFieldId = fieldId || connectedIds[0] || '';
  const fieldName =
    fields.find((f) => f.id === fieldId)?.name ||
    fields.find((f) => f.id === linkFieldId)?.name ||
    fields.find((f) => connectedIds.includes(f.id))?.name;
  const profileTo = person.listed && person.userId
    ? `/partners/${person.userId}${linkFieldId ? `?${new URLSearchParams({ fieldId: linkFieldId }).toString()}` : ''}`
    : '';
  const assignParams = new URLSearchParams();
  if (linkFieldId) assignParams.set('fieldId', linkFieldId);
  if (person.userId) assignParams.set('assignee', `user:${person.userId}`);
  else if (person.savedContact?.id) assignParams.set('assignee', `contact:${person.savedContact.id}`);
  const assignTo = `/tasks/new?${assignParams.toString()}`;

  return (
    <Card className="partner-person-card">
      <div className="partner-person-main">
        <div className="partner-person-identity">
          <span className="partner-avatar" aria-hidden>
            {initials(person.displayName)}
          </span>
          <div className="partner-person-text">
            <h3>{person.displayName}</h3>
            {person.phone ? <p className="partner-person-phone">{person.phone}</p> : null}
            {person.email ? <p className="partner-person-phone">{person.email}</p> : null}
            <FieldLinkPills fieldIds={connectedIds} fields={fields} />
          </div>
        </div>
        {person.serviceLabels.length > 0 ? (
          <div className="partner-chips" aria-label={t('partners:whatTheyDo')}>
            {person.serviceLabels.map((label) => (
              <span key={label} className="partner-chip partner-chip-job">
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="partner-actions-stack">
        <PhoneActions phone={person.phone} email={person.email} />
        <div className="partner-actions">
          {person.userId || person.savedContact ? (
            <Button as={Link} to={assignTo} size="sm">
              {t('partners:assignTask')}
            </Button>
          ) : null}
          {person.savedContact && onInviteContact && !person.userId ? (
            <Button variant="outline" size="sm" onClick={() => onInviteContact(person)}>
              {t('partners:inviteToOleachron')}
            </Button>
          ) : null}
        </div>
        {person.userId || person.savedContact ? (
          <p className="partner-assign-hint">
            {person.userId ? t('partners:assignOutcomeCollaborator') : t('partners:assignOutcomeContact')}
          </p>
        ) : null}
        {(profileTo || (person.savedContact && onEditContact) || (canManage && person.membership && !person.connections.includes('owner') && person.userId)) ? (
        <details className="partner-more">
          <summary>{t('partners:moreActions')}</summary>
          <div className="partner-actions">
            {profileTo ? (
              <Button as={Link} to={profileTo} variant="ghost" size="sm">
                {t('partners:contact')}
              </Button>
            ) : null}
            {person.savedContact && onEditContact ? (
              <Button variant="ghost" size="sm" onClick={() => onEditContact(person)}>
                {t('partners:editContact')}
              </Button>
            ) : null}
            {canManage && person.membership && !person.connections.includes('owner') && person.userId && fieldId ? (
              <Button
                variant="ghost"
                size="sm"
                className="partner-remove-action"
                onClick={async () => {
                  const confirmMsg = fieldName
                    ? t('partners:revokeAccessConfirm', { name: person.displayName, field: fieldName })
                    : t('partners:revokeAccess');
                  if (!window.confirm(confirmMsg)) return;
                  await fieldPeopleService.removeMembership(fieldId, person.userId!);
                  onRemoved?.();
                }}
              >
                {t('partners:revokeAccess')}
              </Button>
            ) : null}
          </div>
        </details>
        ) : null}
      </div>
    </Card>
  );
};

export default PersonCard;
