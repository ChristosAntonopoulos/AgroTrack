import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import PageContainer from '../components/Common/PageContainer';
import ChronologioLiving from '../components/Chronologio/ChronologioLiving';
import { useModulePageGuard } from '../hooks/useModulePageGuard';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import Breadcrumbs from '../components/Layout/Breadcrumbs';

const ChronologioPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const pageGuard = useModulePageGuard({ module: 'chronologio' });

  if (pageGuard.loading) {
    return (
      <PageContainer>
        <Breadcrumbs />
        <LoadingSpinner />
      </PageContainer>
    );
  }

  if (!pageGuard.allowed) {
    return <Navigate to="/access-denied?module=chronologio" replace />;
  }

  return (
    <PageContainer>
      <ChronologioLiving fieldId={id} />
    </PageContainer>
  );
};

export default ChronologioPage;
