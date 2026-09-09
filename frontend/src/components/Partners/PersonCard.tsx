import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Card from '../Common/Card';
import Button from '../Common/Button';
import { GrovePerson } from './grovePeople';
import PhoneActions from './PhoneActions';
import { fieldPeopleService } from '../../services/fieldPeopleService';
import '../../pages/PartnersPage.css';

type Props = {
  person: GrovePerson;
  fieldId: string;
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

const PersonCard: React.FC<Props> = ({ person, fieldId, canManage, onEditContact, onRemoved }) => {
  const { t } = useTranslation(['partners', 'common']);
  const profileTo = person.listed && person.userId
    ? `/partners/${person.userId}?${new URLSearchParams({ fieldId }).toString()}`
    : '';

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
          </div>
        </div>
        {(person.serviceLabels.length > 0 || person.connections.length > 0) && (
          <div className="partner-chips">
            {person.serviceLabels.map((label) => (
              <span key={label} className="partner-chip partner-chip-job">
                {label}
              </span>
            ))}
            {person.connections.map((connection) => (
              <span key={connection} className="partner-chip">
                {t(`partners:connection.${connection}`)}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="partner-actions-stack">
        <PhoneActions phone={person.phone} />
        <div className="partner-actions">
          {person.savedContact && onEditContact ? (
            <Button variant="outline" size="sm" onClick={() => onEditContact(person)}>
              {t('partners:editContact')}
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
                if (!window.confirm(t('partners:removeMember'))) return;
                await fieldPeopleService.removeMembership(fieldId, person.userId!);
                onRemoved?.();
              }}
            >
              {t('partners:removeMember')}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
};

export default PersonCard;
