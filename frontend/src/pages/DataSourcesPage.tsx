import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocaleFormatters } from '../hooks/useLocaleFormatters';
import {
  DataSourceHealth,
  GeospatialJobStatus,
  geospatialService,
} from '../services/geospatialService';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import PageHeader from '../components/Common/PageHeader';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import './DataSourcesPage.css';

/** Anything older than this without a successful refresh is called out as stale. */
const STALE_AFTER_HOURS = 24;

const statusClass = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === 'healthy') return 'ok';
  if (normalized === 'degraded') return 'warn';
  return 'fail';
};

/**
 * Operational view of the external geospatial providers: whether each one is
 * answering, when it last succeeded, and what the background queues are doing.
 */
const DataSourcesPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const { user } = useAuth();
  const { formatDateTime } = useLocaleFormatters();

  const [sources, setSources] = useState<DataSourceHealth[]>([]);
  const [jobs, setJobs] = useState<GeospatialJobStatus>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [health, jobStatus] = await Promise.all([
        geospatialService.getDataSourceHealth(),
        geospatialService.getGeospatialJobStatus(),
      ]);
      setSources(health);
      setJobs(jobStatus);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (user?.role !== 'Administrator') {
    return (
      <PageContainer>
        <div className="data-sources-page">
          <Breadcrumbs />
          <div className="error-message">{t('admin:dataSources.forbidden')}</div>
        </div>
      </PageContainer>
    );
  }

  const isStale = (lastSuccess?: string) =>
    !lastSuccess || Date.now() - new Date(lastSuccess).getTime() > STALE_AFTER_HOURS * 3600 * 1000;

  const counters: Array<{ key: keyof GeospatialJobStatus; tone: string }> = [
    { key: 'pending', tone: 'neutral' },
    { key: 'processing', tone: 'neutral' },
    { key: 'completed', tone: 'ok' },
    { key: 'partial', tone: 'warn' },
    { key: 'failed', tone: 'fail' },
  ];

  return (
    <PageContainer>
      <div className="data-sources-page">
        <Breadcrumbs />

        <PageHeader
          title={t('admin:dataSources.title')}
          subtitle={t('admin:dataSources.subtitle')}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
              icon={<RefreshCw size={14} aria-hidden />}
            >
              {t('common:refresh')}
            </Button>
          }
        />

        {loading ? <LoadingSpinner size="sm" /> : null}
        {failed ? <div className="error-message">{t('admin:dataSources.loadFailed')}</div> : null}

        {!loading && !failed ? (
          <>
            <section className="data-sources-section">
              <h2>{t('admin:dataSources.providers')}</h2>
              {sources.length === 0 ? (
                <p className="data-sources-empty">{t('admin:dataSources.noProviders')}</p>
              ) : (
                <div className="data-sources-grid">
                  {sources.map((source) => (
                    <article className={`data-source data-source--${statusClass(source.status)}`} key={source.sourceId}>
                      <header>
                        <h3>{source.displayName || source.sourceId}</h3>
                        <span className="data-source-status">{source.status}</span>
                      </header>
                      <dl>
                        <div>
                          <dt>{t('admin:dataSources.lastSuccess')}</dt>
                          <dd>
                            {source.lastSuccessfulUpdate
                              ? formatDateTime(source.lastSuccessfulUpdate)
                              : t('admin:dataSources.never')}
                            {isStale(source.lastSuccessfulUpdate) ? (
                              <em className="data-source-stale">
                                {t('admin:dataSources.stale', { hours: STALE_AFTER_HOURS })}
                              </em>
                            ) : null}
                          </dd>
                        </div>
                        {source.details ? (
                          <div>
                            <dt>{t('admin:dataSources.details')}</dt>
                            <dd>{source.details}</dd>
                          </div>
                        ) : null}
                        {source.lastError ? (
                          <div>
                            <dt>{t('admin:dataSources.lastError')}</dt>
                            <dd className="data-source-error">{source.lastError}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="data-sources-section">
              <h2>{t('admin:dataSources.jobs')}</h2>
              <div className="data-sources-counters">
                {counters.map(({ key, tone }) => (
                  <div className={`data-source-counter data-source-counter--${tone}`} key={key}>
                    <span className="data-source-counter-value">{(jobs?.[key] as number) ?? 0}</span>
                    <span className="data-source-counter-label">{t(`admin:dataSources.jobStatus.${key}`)}</span>
                  </div>
                ))}
              </div>

              {jobs && jobs.recentFailures.length > 0 ? (
                <div className="u-scroll-x">
                  <table className="data-sources-failures">
                    <thead>
                      <tr>
                        <th>{t('admin:dataSources.jobType')}</th>
                        <th>{t('admin:dataSources.field')}</th>
                        <th>{t('admin:dataSources.attempts')}</th>
                        <th>{t('admin:dataSources.failedAt')}</th>
                        <th>{t('admin:dataSources.lastError')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.recentFailures.map((failure, index) => (
                        <tr key={`${failure.jobType}-${failure.fieldId ?? index}-${failure.failedAt}`}>
                          <td>{failure.jobType}</td>
                          <td>{failure.fieldId ?? '—'}</td>
                          <td>{failure.attempts}</td>
                          <td>{formatDateTime(failure.failedAt)}</td>
                          <td className="data-source-error">{failure.lastError ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="data-sources-empty">{t('admin:dataSources.noFailures')}</p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </PageContainer>
  );
};

export default DataSourcesPage;
