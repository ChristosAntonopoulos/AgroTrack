import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../components/Common/PageContainer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import EmptyState from '../components/Common/EmptyState';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { getPartnerService } from '../services/serviceFactory';
import {
  PartnerSearchResponse,
  ServiceCategory,
  categoryName,
  rememberPartnerFieldId,
} from '../services/partnerService';
import { getApiErrorMessage } from '../utils/translateApiError';
import './PartnersPage.css';

const PartnerSearchPage: React.FC = () => {
  const { t, i18n } = useTranslation(['partners', 'common']);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<PartnerSearchResponse | null>(null);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fieldId = params.get('fieldId') || '';
  const categoryId = params.get('categoryId') || '';
  const category = params.get('category') || '';
  const radiusKm = Number(params.get('radiusKm') || 50);
  const taskId = params.get('taskId') || '';

  useEffect(() => {
    getPartnerService().getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (fieldId) rememberPartnerFieldId(fieldId);
  }, [fieldId]);

  useEffect(() => {
    if (!fieldId) {
      navigate('/partners');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getPartnerService().search({
          fieldId,
          categoryId: categoryId || undefined,
          category: category || undefined,
          radiusKm,
        });
        if (!cancelled) setData(result);
      } catch (err: unknown) {
        if (!cancelled) setError(getApiErrorMessage(err, t) || t('partners:needField'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fieldId, categoryId, category, radiusKm, navigate, t]);

  const patch = (next: Record<string, string>) => {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => {
      if (value) merged.set(key, value);
      else merged.delete(key);
    });
    setParams(merged);
  };

  const contactPath = (userId: string) => {
    const q = new URLSearchParams({ fieldId, categoryId, category });
    if (taskId) q.set('taskId', taskId);
    const start = params.get('start');
    const end = params.get('end');
    if (start) q.set('start', start);
    if (end) q.set('end', end);
    return `/partners/${userId}?${q.toString()}`;
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <PageContainer>
      <div className="partners-page">
        <Breadcrumbs />
        <h1>{t('partners:resultsTitle')}</h1>
        {data?.fieldApproximateArea && (
          <p className="partners-lead">{data.fieldApproximateArea}</p>
        )}
        {selectedCategory && (
          <div className="partner-chips">
            <span className="partner-chip partner-chip-job">
              {categoryName(selectedCategory, i18n.language)}
            </span>
          </div>
        )}

        <div className="partners-toolbar">
          <label>
            {t('partners:filters.distance')}
            <select value={String(radiusKm)} onChange={(e) => patch({ radiusKm: e.target.value })}>
              <option value="25">25 km</option>
              <option value="50">50 km</option>
              <option value="60">60 km</option>
              <option value="100">100 km</option>
            </select>
          </label>
        </div>

        {loading && <LoadingSpinner className="page-inline-loading" />}
        {error && <div className="error-message">{error}</div>}

        {!loading && data && data.results.length === 0 && (
          <div className="partners-empty">
            <EmptyState
              title={t('partners:empty.title')}
              description={
                data.canExpandRadius
                  ? t('partners:empty.hint', { km: data.nextRadiusKm })
                  : t('partners:empty.max')
              }
              action={
                data.canExpandRadius ? (
                  <Button onClick={() => patch({ radiusKm: String(data.nextRadiusKm) })}>
                    {t('partners:empty.expand', { km: data.nextRadiusKm })}
                  </Button>
                ) : (
                  <Button to="/partners" variant="outline">
                    {t('partners:title')}
                  </Button>
                )
              }
            />
          </div>
        )}

        <div className="partners-results">
          {data?.results.map((row) => (
            <Card key={row.userId} className="partner-result">
              <div>
                <h3>{row.displayName}</h3>
                <div className="partner-chips">
                  {row.categories.map((c) => (
                    <span key={c.id} className="partner-chip partner-chip-job">
                      {categoryName(c, i18n.language)}
                    </span>
                  ))}
                </div>
                <div className="partner-meta">
                  <span>{t('partners:aboutKm', { km: row.distanceKm })}</span>
                </div>
              </div>
              <div className="partner-actions">
                <Button as={Link} to={contactPath(row.userId)}>
                  {t('partners:contact')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
};

export default PartnerSearchPage;
