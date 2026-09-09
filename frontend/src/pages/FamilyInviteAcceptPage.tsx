import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FamilyInviteShare, familyService } from '../services/familyService';
import { useAuth } from '../context/AuthContext';
import PageContainer from '../components/Common/PageContainer';
import PageHeader from '../components/Common/PageHeader';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import './InviteAcceptPage.css';

const FamilyInviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation(['partners', 'common', 'auth']);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<FamilyInviteShare | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        setInvite(await familyService.getInvite(token));
      } catch {
        setError(t('partners:family.inviteMissing'));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, t]);

  const accept = async () => {
    if (!token) return;
    if (!isAuthenticated) {
      navigate(`/login?redirect=/family-invite/${token}`);
      return;
    }
    setAccepting(true);
    try {
      await familyService.acceptInvite(token);
      navigate('/partners');
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('partners:family.acceptFailed');
      setError(message);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const moduleLabels =
    invite?.modules?.map((m) => t(`partners:family.modules.${m}`)).join(', ') || '';

  return (
    <PageContainer maxWidth="sm" className="invite-accept-page">
      <Card>
        <PageHeader title={t('partners:family.acceptTitle')} />
        {error ? <p className="invite-accept-error">{error}</p> : null}
        {invite ? (
          <div className="invite-accept-body">
            <p>
              {invite.ownerDisplayName
                ? t('partners:family.acceptBody', {
                    owner: invite.ownerDisplayName,
                    modules: moduleLabels,
                  })
                : t('partners:family.acceptBodyFallback')}
            </p>
            {isAuthenticated ? (
              <Button onClick={accept} loading={accepting} variant="primary" className="btn-full-width">
                {t('partners:family.accept')}
              </Button>
            ) : (
              <div className="invite-accept-auth">
                <Link
                  className="btn btn-primary btn-md btn-full-width"
                  to={`/register?code=${encodeURIComponent(invite.code || token || '')}`}
                >
                  {t('auth:register.button')}
                </Link>
                <Link className="btn btn-outline btn-md btn-full-width" to={`/login?redirect=/family-invite/${token}`}>
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

export default FamilyInviteAcceptPage;
