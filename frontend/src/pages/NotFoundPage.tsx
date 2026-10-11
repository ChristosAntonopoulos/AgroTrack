import React from 'react';
import { MapPinOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../components/Common/Button';
import PageContainer from '../components/Common/PageContainer';
import { CHRONOLOGIO_HOME } from '../navigation/homePath';

/** QA-002: branded 404 for any unknown URL. */
const NotFoundPage: React.FC = () => {
  const { t } = useTranslation('errors');

  return (
    <PageContainer maxWidth="sm">
      <div className="error-container" role="alert">
        <MapPinOff size={44} aria-hidden />
        <h1>{t('pageNotFoundTitle')}</h1>
        <p>{t('pageNotFoundBody')}</p>
        <Button to={CHRONOLOGIO_HOME} variant="primary">
          {t('pageNotFoundHome')}
        </Button>
      </div>
    </PageContainer>
  );
};

export default NotFoundPage;
