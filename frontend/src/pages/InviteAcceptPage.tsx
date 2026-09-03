import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fieldPeopleService, FieldInvite } from '../services/fieldPeopleService';
import { useAuth } from '../context/AuthContext';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';

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
      navigate(invite ? `/fields/${invite.fieldId}` : '/fields');
    } catch (e: any) {
      setError(e?.response?.data?.message || t('fields:people.inviteAcceptFailed'));
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <PageContainer>
      <Card>
        <h1>{t('fields:people.inviteAcceptTitle')}</h1>
        {error ? <p>{error}</p> : null}
        {invite ? (
          <>
            <p>
              {t('fields:people.inviteAcceptBody', {
                field: invite.fieldName,
                capacities: invite.capacities.join(', '),
              })}
            </p>
            <Button onClick={accept} loading={accepting} variant="primary">
              {t('fields:people.acceptInvite')}
            </Button>
          </>
        ) : (
          <Link to="/login">{t('auth:login.title')}</Link>
        )}
      </Card>
    </PageContainer>
  );
};

export default InviteAcceptPage;
