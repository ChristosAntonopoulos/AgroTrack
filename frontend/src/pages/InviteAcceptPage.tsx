import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fieldPeopleService, FieldInvite } from '../services/fieldPeopleService';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/translateApiError';
import Button from '../components/Common/Button';
import InviteAcceptShell from '../components/Auth/InviteAcceptShell';
import { invalidateAccessContext } from '../hooks/useAccessContext';

const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation(['fields', 'partners', 'common', 'auth', 'errors']);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<FieldInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        setInvite(await fieldPeopleService.getInvite(token));
      } catch {
        setError(t('fields:people.inviteMissing'));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, t]);

  const accept = async () => {
    if (!token) return;
    if (!isAuthenticated) {
      navigate(`/login?redirect=/invite/${token}`);
      return;
    }
    setAccepting(true);
    try {
      await fieldPeopleService.acceptInvite(token);
      invalidateAccessContext();
      navigate(invite ? `/partners?fieldId=${invite.fieldId}` : '/partners');
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, t) || t('fields:people.inviteAcceptFailed'));
    } finally {
      setAccepting(false);
    }
  };

  const roleLabel = invite
    ? invite.role === 'Partner'
      ? t('partners:connection.partnerSeat')
      : invite.role === 'Family'
        ? t('partners:connection.family')
        : invite.role
    : '';

  return (
    <InviteAcceptShell
      title={t('fields:people.inviteAcceptTitle')}
      loading={loading}
      error={error}
      loginFallbackLabel={t('auth:login.title')}
    >
      {invite ? (
        <>
          <p>
            {t('fields:people.inviteAcceptBody', {
              field: invite.fieldName,
              role: roleLabel,
            })}
          </p>
          <Button onClick={accept} loading={accepting} variant="primary" className="btn-full-width">
            {t('fields:people.acceptInvite')}
          </Button>
        </>
      ) : undefined}
    </InviteAcceptShell>
  );
};

export default InviteAcceptPage;
