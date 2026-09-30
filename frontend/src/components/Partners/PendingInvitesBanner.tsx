import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fieldPeopleService, FieldInvite } from '../../services/fieldPeopleService';
import { useAuth } from '../../context/AuthContext';
import './PendingInvitesBanner.css';

/** Surfaces pending field invites for the signed-in user (inbox alternative on home). */
const PendingInvitesBanner: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation(['fields', 'common']);
  const [invites, setInvites] = useState<FieldInvite[]>([]);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setInvites([]);
      return;
    }
    try {
      const next = await fieldPeopleService.getPendingInvites();
      setInvites(next);
    } catch {
      setInvites([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isAuthenticated || invites.length === 0) {
    return null;
  }

  return (
    <aside className="pending-invites-banner" role="status">
      <div className="pending-invites-banner__copy">
        <p className="pending-invites-banner__title">
          {t('fields:people.pendingInvitesTitle', {
            count: invites.length,
            defaultValue:
              invites.length === 1
                ? 'You have an invitation waiting'
                : 'You have {{count}} invitations waiting',
          })}
        </p>
        <ul className="pending-invites-banner__list">
          {invites.slice(0, 3).map((invite) => (
            <li key={invite.id}>
              <Link to={`/invite/${invite.token}`}>
                {invite.invitedByName
                  ? t('fields:people.pendingInviteLine', {
                      name: invite.invitedByName,
                      field: invite.fieldName,
                      defaultValue: '{{name}} · {{field}}',
                    })
                  : invite.fieldName}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default PendingInvitesBanner;
