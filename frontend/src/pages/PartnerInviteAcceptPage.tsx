import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OwnerPartnerInviteShare, ownerPartnerService } from '../services/ownerPartnerService';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/translateApiError';
import PageContainer from '../components/Common/PageContainer';
import PageHeader from '../components/Common/PageHeader';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import './InviteAcceptPage.css';

const PartnerInviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation(['partners', 'common', 'auth', 'errors']);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<OwnerPartnerInviteShare | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const next = await ownerPartnerService.getInvite(token);
        setInvite(next);
        if (next.status && next.status.toLowerCase() !== 'pending') {
          setError(t('errors:inviteNoLongerValid'));
        }
      } catch {
        setError(t('partners:ownerPartner.inviteMissing'));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, t]);

  const accept = async () => {
    if (!token) return;
    if (!isAuthenticated) {
      navigate(`/login?redirect=/partner-invite/${token}`);
      return;
    }
    setAccepting(true);
    setError(null);
    try {
      await ownerPartnerService.acceptInvite(token);
      navigate('/partners');
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, t) || t('partners:ownerPartner.acceptFailed'));
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const moduleLabels =
    invite?.modules?.map((m) => t(`partners:family.modules.${m}`)).join(', ') || '';
  const canAccept = invite?.status?.toLowerCase() === 'pending';

  return (
    <PageContainer maxWidth="sm" className="invite-accept-page">
      <Card>
        <PageHeader title={t('partners:ownerPartner.acceptTitle')} />
        {error ? <p className="invite-accept-error">{error}</p> : null}
        {invite ? (
          <div className="invite-accept-body">
            <p>
              {invite.ownerDisplayName
                ? t('partners:ownerPartner.acceptBody', {
                    owner: invite.ownerDisplayName,
                    modules: moduleLabels,
                  })
                : t('partners:ownerPartner.acceptBodyFallback')}
            </p>
            {isAuthenticated ? (
              canAccept ? (
                <Button onClick={accept} loading={accepting} variant="primary" className="btn-full-width">
                  {t('partners:ownerPartner.accept')}
                </Button>
              ) : (
                <Button onClick={() => navigate('/partners')} variant="primary" className="btn-full-width">
                  {t('partners:openInPartners')}
                </Button>
              )
            ) : (
              <div className="invite-accept-auth">
                <Link
                  className="btn btn-primary btn-md btn-full-width"
                  to={`/register?code=${encodeURIComponent(invite.code || token || '')}`}
                >
                  {t('auth:register.button')}
                </Link>
                <Link
                  className="btn btn-outline btn-md btn-full-width"
                  to={`/login?redirect=/partner-invite/${token}`}
                >
                  {t('auth:login.title')}
                </Link>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login">{t('auth:login.title')}</Link>
        )}
      </Card>
    </PageContainer>
  );
};

export default PartnerInviteAcceptPage;
