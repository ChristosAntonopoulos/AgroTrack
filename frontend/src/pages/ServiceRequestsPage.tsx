import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageContainer from '../components/Common/PageContainer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import Badge from '../components/Common/Badge';
import EmptyState from '../components/Common/EmptyState';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import SegmentedControl from '../components/Common/SegmentedControl';
import { getPartnerService } from '../services/serviceFactory';
import { ServiceContactRequest, categoryName } from '../services/partnerService';
import { getApiErrorMessage } from '../utils/translateApiError';
import './PartnersPage.css';

const ServiceRequestsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['partners', 'common']);
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [rows, setRows] = useState<ServiceContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (direction: 'incoming' | 'outgoing') => {
    setLoading(true);
    try {
      setRows(await getPartnerService().getRequests(direction));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(tab);
  }, [tab]);

  const update = async (id: string, status: string, linkTask = false) => {
    await getPartnerService().updateRequest(id, status, linkTask);
    await load(tab);
  };

  return (
    <PageContainer>
      <div className="partners-page">
        <Breadcrumbs />
        <h1>{t('partners:requests')}</h1>
        <SegmentedControl
          className="partners-tabs"
          ariaLabel={t('partners:requests')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'incoming', label: t('partners:inbox') },
            { value: 'outgoing', label: t('partners:sent') },
          ]}
        />
        {loading && <LoadingSpinner className="page-inline-loading" />}
        {error && <div className="error-message">{error}</div>}
        {!loading && rows.length === 0 && <EmptyState title={t('partners:noRequests')} />}
        <div className="partners-results">
          {rows.map((row) => (
            <Card key={row.id} className="partner-request">
              <div className="partner-meta">
                <strong>{tab === 'incoming' ? row.requesterName : row.providerName}</strong>
                <Badge>{t(`partners:status.${row.status}`)}</Badge>
                {row.category && <span>{categoryName(row.category, i18n.language)}</span>}
              </div>
              <p>{row.message}</p>
              <div className="partner-meta">
                {row.approximateArea && <span>{row.approximateArea}</span>}
                {row.areaHectares != null && (
                  <span>{t('partners:areaSize', { ha: row.areaHectares })}</span>
                )}
              </div>
              {tab === 'incoming' && (row.status === 'New' || row.status === 'Viewed') && (
                <div className="partner-actions">
                  {row.status === 'New' && (
                    <Button variant="outline" onClick={() => update(row.id, 'Viewed')}>
                      {t('partners:markViewed')}
                    </Button>
                  )}
                  <Button onClick={() => update(row.id, 'Accepted', Boolean(row.taskId))}>
                    {t('partners:accept')}
                  </Button>
                  <Button variant="outline" onClick={() => update(row.id, 'Declined')}>
                    {t('partners:decline')}
                  </Button>
                </div>
              )}
              {(row.status === 'Accepted' || row.status === 'Declined') && (
                <Button variant="ghost" onClick={() => update(row.id, 'Closed')}>
                  {t('partners:close')}
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
};

export default ServiceRequestsPage;
