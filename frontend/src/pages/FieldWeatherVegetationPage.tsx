import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import FieldWeatherVegetationCharts from '../components/fields/FieldWeatherVegetationCharts';
import { getFieldService } from '../services/serviceFactory';
import BackLink from '../components/Common/BackLink';

const FieldWeatherVegetationPage: React.FC = () => {
  const { t } = useTranslation(['chronologio', 'fields']);
  const { id } = useParams<{ id: string }>();
  const [name, setName] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [missing, setMissing] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getFieldService()
      .getField(id)
      .then((field) => {
        if (!cancelled) setName(field.name);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <PageContainer>
        <LoadingSpinner className="page-inline-loading" />
      </PageContainer>
    );
  }

  if (!id || missing) {
    return (
      <PageContainer>
        <p>{t('fields:controlRoom.failedLoad')}</p>
        <BackLink to="/fields">{t('fields:controlRoom.backToFields')}</BackLink>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Breadcrumbs />
      <BackLink to={`/fields/${id}`}>{name || t('chronologio:backToField')}</BackLink>
      <FieldWeatherVegetationCharts fieldId={id} fieldName={name} />
    </PageContainer>
  );
};

export default FieldWeatherVegetationPage;
