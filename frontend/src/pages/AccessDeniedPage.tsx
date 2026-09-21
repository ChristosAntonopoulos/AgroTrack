import React from 'react';
import { ShieldX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import Button from '../components/Common/Button';
import PageContainer from '../components/Common/PageContainer';

const AccessDeniedPage: React.FC = () => {
  const { i18n } = useTranslation();
  const [params] = useSearchParams();
  const moduleName = params.get('module');
  const greek = i18n.language?.startsWith('el');

  return (
    <PageContainer maxWidth="sm">
      <div className="error-container" role="alert">
        <ShieldX size={44} aria-hidden />
        <h1>{greek ? 'Δεν έχεις πρόσβαση' : 'Access denied'}</h1>
        <p>
          {greek
            ? `Δεν έχεις δικαίωμα να ανοίξεις ${moduleName ? `την ενότητα «${moduleName}»` : 'αυτή την ενότητα'} για το επιλεγμένο χωράφι.`
            : `You do not have permission to open ${moduleName ? `the “${moduleName}” module` : 'this section'} for the selected field.`}
        </p>
        <Button to="/fields" variant="primary">
          {greek ? 'Επιστροφή στα χωράφια' : 'Back to fields'}
        </Button>
      </div>
    </PageContainer>
  );
};

export default AccessDeniedPage;
