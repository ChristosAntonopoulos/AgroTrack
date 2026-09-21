import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Card from '../Common/Card';
import Button from '../Common/Button';
import { GrovePerson } from './grovePeople';
import PhoneActions from './PhoneActions';
import { fieldPeopleService } from '../../services/fieldPeopleService';
import type { Field } from '../../services/fieldService';
import '../../pages/PartnersPage.css';

type Props = {
  person: GrovePerson;
  fieldId: string;
  fields?: Field[];
  canManage?: boolean;
  onEditContact?: (person: GrovePerson) => void;
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
  onRemoved,
}) => {
  const { t } = useTranslation(['partners', 'common']);
  const linkFieldId = person.fieldIds?.[0] || fieldId;
  const fieldName =
    fields.find((f) => f.id === linkFieldId)?.name ||
    fields.find((f) => person.fieldIds?.includes(f.id))?.name;
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
          {person.savedContact && onEditContact ? (
            <Button variant="outline" size="sm" onClick={() => onEditContact(person)}>
              {t('partners:editContact')}
            </Button>
          ) : null}
          {person.userId || person.savedContact ? (
            <Button as={Link} to={assignTo} variant="outline" size="sm">
              {t('partners:assignTask')}
            </Button>
          ) : null}
          {profileTo ? (
            <Button as={Link} to={profileTo} size="sm">
              {t('partners:contact')}
            </Button>
          ) : null}
          {canManage && person.membership && !person.connections.includes('owner') && person.userId ? (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const confirmMsg = fieldName
                  ? t('partners:removeMemberConfirm', { name: person.displayName, field: fieldName })
                  : t('partners:removeMember');
                if (!window.confirm(confirmMsg)) return;
                const ids = person.fieldIds?.length ? person.fieldIds : fieldId ? [fieldId] : [];
                await Promise.all(ids.map((id) => fieldPeopleService.removeMembership(id, person.userId!)));
                onRemoved?.();
              }}
            >
              {fieldName
                ? t('partners:removeMemberFromField', { field: fieldName })
                : t('partners:removeMember')}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
};

export default PersonCard;
