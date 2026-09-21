import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fieldPeopleService, FieldInvite, FieldModule } from '../services/fieldPeopleService';
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

  const expired = useMemo(() => {
    if (!invite?.expiresAt) return false;
    return Date.parse(invite.expiresAt) < Date.now();
  }, [invite]);

  const accept = async () => {
    if (!token) return;
    if (!isAuthenticated) {
      navigate(`/register?redirect=${encodeURIComponent(`/invite/${token}`)}&code=${encodeURIComponent(invite?.code || '')}`);
      return;
    }
    setAccepting(true);
    try {
      await fieldPeopleService.acceptInvite(token);
      invalidateAccessContext();
      navigate(invite ? `/chronologio?fieldId=${invite.fieldId}` : '/chronologio');
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

  const moduleLabels = (invite?.modules || [])
    .filter((module: FieldModule) => module !== 'documents')
    .map((module: FieldModule) =>
      t(`partners:family.modules.${module}`, { defaultValue: module })
    );

  return (
    <InviteAcceptShell
      title={t('fields:people.inviteAcceptTitle')}
      loading={loading}
      error={error}
      loginFallbackLabel={t('auth:login.title')}
    >
      {invite ? (
        <>
          <dl className="invite-preview">
            <div>
              <dt>{t('fields:people.inviteFrom')}</dt>
              <dd>{invite.invitedByName || invite.invitedBy}</dd>
            </div>
            <div>
              <dt>{t('fields:people.inviteField')}</dt>
              <dd>{invite.fieldName}</dd>
            </div>
            <div>
              <dt>{t('fields:people.inviteRole')}</dt>
              <dd>{roleLabel}</dd>
            </div>
            <div>
              <dt>{t('partners:family.partsTitle')}</dt>
              <dd>{moduleLabels.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>{t('partners:family.levelTitle')}</dt>
              <dd>
                {t(`partners:family.levels.${invite.accessLevel}`)} — {t(`partners:family.calculated.${invite.accessLevel}`)}
              </dd>
            </div>
            <div>
              <dt>{t('fields:people.inviteExpires')}</dt>
              <dd>
                {new Date(invite.expiresAt).toLocaleString()}
                {expired ? ` (${t('fields:people.inviteExpired')})` : ''}
              </dd>
            </div>
          </dl>
          <div className="invite-preview-actions">
            <Button
              onClick={accept}
              loading={accepting}
              variant="primary"
              className="btn-full-width"
              disabled={expired}
            >
              {isAuthenticated ? t('fields:people.acceptInvite') : t('fields:people.inviteCreateAccount')}
            </Button>
            {isAuthenticated ? (
              <Button variant="ghost" className="btn-full-width" onClick={() => navigate('/')}>
                {t('fields:people.declineInvite')}
              </Button>
            ) : (
              <p>
                {t('auth:register.hasAccount')}{' '}
                <Link to={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`}>
                  {t('auth:register.loginLink')}
                </Link>
              </p>
            )}
          </div>
        </>
      ) : undefined}
    </InviteAcceptShell>
  );
};

export default InviteAcceptPage;
