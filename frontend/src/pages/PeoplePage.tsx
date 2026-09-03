import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import PageContainer from '../components/Common/PageContainer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Card from '../components/Common/Card';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import EmptyState from '../components/Common/EmptyState';
import { getFieldService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { fieldPeopleService, FieldMembership } from '../services/fieldPeopleService';
import { useExperienceMode } from '../context/ExperienceModeContext';

const PeoplePage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common']);
  const { isEveryday } = useExperienceMode();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Array<{ field: Field; people: FieldMembership[] }>>([]);

  useEffect(() => {
    void (async () => {
      try {
        const fields = await getFieldService().getFields();
        const withPeople = await Promise.all(
          fields.map(async (field) => ({
            field,
            people: await fieldPeopleService.getPeople(field.id).catch(() => field.memberships || []),
          }))
        );
        setRows(withPeople.filter((r) => r.people.length > 0));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <PageContainer>
      <Breadcrumbs />
      <h1>{t('fields:people.pageTitle')}</h1>
      <p>{isEveryday ? t('fields:people.pageEverydayHint') : t('fields:people.pageFullHint')}</p>
      {rows.length === 0 ? (
        <EmptyState title={t('fields:people.emptyTitle')} description={t('fields:people.emptyDesc')} />
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {rows.map(({ field, people }) => (
            <Card key={field.id}>
              <h2>
                <Link to={`/fields/${field.id}`}>{field.name}</Link>
              </h2>
              <ul>
                {people.map((p) => (
                  <li key={p.userId}>
                    {p.displayName || p.email || p.userId} —{' '}
                    {p.capacities.map((c) => t(`fields:people.capacities.${c}`)).join(', ')}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
};

export default PeoplePage;
