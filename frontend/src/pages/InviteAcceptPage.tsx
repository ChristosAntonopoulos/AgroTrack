import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fieldPeopleService, FieldInvite, FieldModule } from '../services/fieldPeopleService';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/translateApiError';
import Button from '../components/Common/Button';
import InviteAcceptShell from '../components/Auth/InviteAcceptShell';
import { invalidateAccessContext } from '../hooks/useAccessContext';
import { PICKABLE_MODULES } from '../components/Partners/accessPreview';
import { presetLabelKey } from '../people/aggregatePeople';
import { authPathWithIntent, clearInviteIntent, rememberInviteIntent } from '../utils/inviteIntent';
import { mapInviteLifecycle } from '../components/Partners/inviteLifecycle';

const emailsMatch = (left?: string | null, right?: string | null) => {
  if (!left || !right) return true;
  return left.trim().toLowerCase() === right.trim().toLowerCase();
};

const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation(['fields', 'partners', 'common', 'auth', 'errors']);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<FieldInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [alreadyHasAccess, setAlreadyHasAccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const next = await fieldPeopleService.getInvite(token);
        setInvite(next);
        rememberInviteIntent({
          token: next.token || token,
          code: next.code,
          email: next.email,
          name: next.displayName,
          redirect: `/invite/${next.token || token}`,
        });
      } catch {
        setError(t('fields:people.inviteMissing'));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, t]);

  useEffect(() => {
    if (!isAuthenticated || !invite?.fieldId) return;
    let cancelled = false;
    void (async () => {
      try {
        const access = await fieldPeopleService.getAccessContext();
        if (cancelled) return;
        const seat = access.fields.find((field) => field.fieldId === invite.fieldId);
        if (seat) {
          setAlreadyHasAccess(true);
          if (mapInviteLifecycle(invite.status) === 'accepted') setAccepted(true);
        }
      } catch {
        /* keep the invitation card */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, invite?.fieldId, invite?.status]);

  const expired = useMemo(() => {
    if (!invite) return false;
    if (mapInviteLifecycle(invite.status) === 'expired') return true;
    if (!invite.expiresAt) return false;
    return Date.parse(invite.expiresAt) < Date.now();
  }, [invite]);

  const lifecycle = mapInviteLifecycle(invite?.status);
  const revoked = lifecycle === 'revoked';
  const usedBySomeoneElse =
    lifecycle === 'accepted' &&
    isAuthenticated &&
    !alreadyHasAccess &&
    !accepted &&
    Boolean(invite?.acceptedBy) &&
    invite?.acceptedBy !== user?.userId;
  const acceptedByThisUser =
    accepted ||
    alreadyHasAccess ||
    (lifecycle === 'accepted' && isAuthenticated && (!invite?.acceptedBy || invite.acceptedBy === user?.userId));
  const wrongAccount =
    isAuthenticated &&
    Boolean(invite?.email) &&
    !emailsMatch(invite?.email, user?.email) &&
    !acceptedByThisUser;

  const relationshipKey =
    invite?.role === 'Partner' ? 'Collaborator' : invite?.role === 'Family' ? 'Family' : '';
  const roleLabel = relationshipKey
    ? t(`partners:peoplePage.relationship.${relationshipKey}`)
    : invite?.role || '';

  const moduleLabels = (invite?.modules || [])
    .filter((module: FieldModule) => PICKABLE_MODULES.includes(module))
    .map((module: FieldModule) =>
      t(`partners:peoplePage.modules.${module}`, {
        defaultValue: t(`partners:family.modules.${module}`, { defaultValue: module }),
      })
    );

  const actionSummary = invite
    ? invite.accessLevel === 'work'
      ? t('fields:people.inviteActionWork')
      : invite.accessLevel === 'help'
        ? t('fields:people.inviteActionHelp')
        : t('fields:people.inviteActionView')
    : '';

  const inviter = invite?.invitedByName || invite?.invitedBy;
  const fieldName = invite?.fieldName || '';
  const intent = invite
    ? {
        token: invite.token || token,
        code: invite.code,
        email: invite.email,
        name: invite.displayName,
        redirect: `/invite/${invite.token || token}`,
      }
    : { token, redirect: token ? `/invite/${token}` : undefined };

  const accessLabel = invite
    ? t(`partners:peoplePage.preset.${presetLabelKey(invite.accessLevel, invite.modules)}`)
    : '';

  const openField = () => {
    clearInviteIntent();
    navigate(invite ? `/chronologio?fieldId=${encodeURIComponent(invite.fieldId)}` : '/chronologio');
  };

  const accept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      await fieldPeopleService.acceptInvite(token);
      invalidateAccessContext();
      setAccepted(true);
      setAlreadyHasAccess(true);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, t) || t('fields:people.inviteAcceptFailed'));
    } finally {
      setAccepting(false);
    }
  };

  const switchAccount = () => {
    rememberInviteIntent(intent);
    logout();
  };

  const success = acceptedByThisUser;

  return (
    <InviteAcceptShell
      loading={loading}
      error={error}
      loginFallbackLabel={t('auth:login.button')}
    >
      {invite ? (
        <>
          <h1 className="invite-accept-title">
            {success
              ? t('fields:people.inviteAcceptedTitle', { field: fieldName })
              : inviter
                ? t('fields:people.inviteHeadline', { name: inviter, field: fieldName })
                : t('fields:people.inviteHeadlineFallback', { field: fieldName })}
          </h1>
          {!success ? (
            <p className="invite-accept-lead">
              {t('fields:people.inviteAccessIntro', {
                modules: moduleLabels.join(', ') || roleLabel,
                action: actionSummary,
              })}
            </p>
          ) : (
            <p className="invite-accept-lead">{t('fields:people.inviteAcceptedBody', { field: fieldName })}</p>
          )}

          <dl className="invite-preview">
            <div>
              <dt>{t('fields:people.inviteFrom')}</dt>
              <dd>{inviter || '—'}</dd>
            </div>
            <div>
              <dt>{t('fields:people.inviteField')}</dt>
              <dd>{fieldName}</dd>
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
                {accessLabel} — {actionSummary}
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
            {success ? (
              <Button onClick={openField} variant="primary" className="btn-full-width">
                {t('fields:people.openField')}
              </Button>
            ) : revoked ? (
              <p className="invite-accept-note">{t('fields:people.inviteRevoked')}</p>
            ) : expired ? (
              <p className="invite-accept-note">{t('fields:people.inviteExpiredExplain')}</p>
            ) : usedBySomeoneElse ? (
              <p className="invite-accept-note">{t('fields:people.inviteUsed')}</p>
            ) : wrongAccount ? (
              <>
                <p className="invite-accept-note">
                  {t('fields:people.wrongAccount', {
                    email: user?.email || '',
                    inviteEmail: invite.email || '',
                  })}
                </p>
                <Button variant="primary" className="btn-full-width" onClick={switchAccount}>
                  {t('fields:people.switchAccount')}
                </Button>
              </>
            ) : isAuthenticated ? (
              <>
                <Button
                  onClick={() => void accept()}
                  loading={accepting}
                  variant="primary"
                  className="btn-full-width"
                >
                  {t('fields:people.acceptInvite')}
                </Button>
                <Button variant="ghost" className="btn-full-width" onClick={() => navigate('/')}>
                  {t('fields:people.declineInvite')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  as={Link}
                  to={authPathWithIntent('/login', intent)}
                  variant="primary"
                  className="btn-full-width"
                >
                  {t('fields:people.inviteSignIn')}
                </Button>
                <Button
                  as={Link}
                  to={authPathWithIntent('/register', intent)}
                  variant="outline"
                  className="btn-full-width"
                >
                  {t('fields:people.inviteCreateAccount')}
                </Button>
              </>
            )}
          </div>
        </>
      ) : undefined}
    </InviteAcceptShell>
  );
};

export default InviteAcceptPage;
