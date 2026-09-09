import React from 'react';
import { useParams } from 'react-router-dom';
import PageContainer from '../components/Common/PageContainer';
import ChronologioLiving from '../components/Chronologio/ChronologioLiving';

const ChronologioPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  return (
    <PageContainer>
      <ChronologioLiving fieldId={id} />
    </PageContainer>
  );
};

export default ChronologioPage;
