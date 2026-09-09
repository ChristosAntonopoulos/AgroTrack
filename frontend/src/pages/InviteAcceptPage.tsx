import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fieldPeopleService, FieldInvite } from '../services/fieldPeopleService';
import { useAuth } from '../context/AuthContext';
import PageContainer from '../components/Common/PageContainer';
import PageHeader from '../components/Common/PageHeader';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import './InviteAcceptPage.css';

const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation(['fields', 'common', 'auth']);
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
      navigate(invite ? `/partners?fieldId=${invite.fieldId}` : '/partners');
    } catch (e: any) {
      setError(e?.response?.data?.message || t('fields:people.inviteAcceptFailed'));
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <PageContainer maxWidth="sm" className="invite-accept-page">
      <Card>
        <PageHeader title={t('fields:people.inviteAcceptTitle')} />
        {error ? <p className="invite-accept-error">{error}</p> : null}
        {invite ? (
          <div className="invite-accept-body">
            <p>
              {t('fields:people.inviteAcceptBody', {
                field: invite.fieldName,
                capacities: invite.capacities.join(', '),
              })}
            </p>
            <Button onClick={accept} loading={accepting} variant="primary" className="btn-full-width">
              {t('fields:people.acceptInvite')}
            </Button>
          </div>
        ) : (
          <Link to="/login">{t('auth:login.title')}</Link>
        )}
      </Card>
    </PageContainer>
  );
};

export default InviteAcceptPage;
