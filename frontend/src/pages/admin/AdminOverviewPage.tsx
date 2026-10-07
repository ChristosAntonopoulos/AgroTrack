import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { adminOpsService, AdminOverview } from '../../services/adminOpsService';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import Breadcrumbs from '../../components/Layout/Breadcrumbs';
import PageContainer from '../../components/Common/PageContainer';
import PageHeader from '../../components/Common/PageHeader';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import AdminTabs from './AdminTabs';
import './AdminPages.css';

const AdminOverviewPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const { user } = useAuth();
  const { formatDateTime } = useLocaleFormatters();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFailed(false);
      try {
        const overview = await adminOpsService.overview();
        if (!cancelled) setData(overview);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (user?.role !== 'Administrator') {
    return (
      <PageContainer>
        <div className="error-message">{t('admin:overview.forbidden')}</div>
      </PageContainer>
    );
  }

  const kpis = data?.kpis;

  return (
    <PageContainer>
      <div className="admin-page">
        <Breadcrumbs />
        <PageHeader title={t('admin:overview.title')} subtitle={t('admin:overview.subtitle')} />
        <AdminTabs />

        {loading ? (
          <LoadingSpinner />
        ) : failed || !data || !kpis ? (
          <div className="error-message">{t('admin:overview.loadFailed')}</div>
        ) : (
          <>
            <div className="admin-kpi-grid">
              <div className="admin-kpi">
                <span className="admin-kpi-label">{t('admin:overview.kpis.totalUsers')}</span>
                <strong className="admin-kpi-value">{kpis.totalUsers}</strong>
              </div>
              <div className="admin-kpi">
                <span className="admin-kpi-label">{t('admin:overview.kpis.active24h')}</span>
                <strong className="admin-kpi-value">{kpis.activeUsers24h}</strong>
                <span className="admin-kpi-meta">
                  {t('admin:overview.kpis.active7d')}: {kpis.activeUsers7d} ·{' '}
                  {t('admin:overview.kpis.active30d')}: {kpis.activeUsers30d}
                </span>
              </div>
              <div className="admin-kpi">
                <span className="admin-kpi-label">{t('admin:overview.kpis.newUsers')}</span>
                <strong className="admin-kpi-value">{kpis.newUsers24h}</strong>
                <span className="admin-kpi-meta">
                  {t('admin:overview.kpis.newUsers7d')}: {kpis.newUsers7d}
                </span>
              </div>
              <div className="admin-kpi">
                <span className="admin-kpi-label">{t('admin:overview.kpis.unseenFeedback')}</span>
                <strong className="admin-kpi-value">{kpis.unseenFeedback}</strong>
              </div>
              <div className="admin-kpi">
                <span className="admin-kpi-label">{t('admin:overview.kpis.errors24h')}</span>
                <strong className="admin-kpi-value">{kpis.errors24h}</strong>
                <span className="admin-kpi-meta">
                  {t('admin:overview.kpis.unackedErrors')}: {kpis.unacknowledgedErrors}
                </span>
              </div>
              <div className="admin-kpi">
                <span className="admin-kpi-label">{t('admin:overview.kpis.health')}</span>
                <strong className="admin-kpi-value admin-kpi-value--sm">{data.healthStatus}</strong>
              </div>
            </div>

            <div className="admin-panels">
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2>{t('admin:overview.panels.feedback')}</h2>
                  <Link to="/admin/feedback">{t('admin:overview.viewAll')}</Link>
                </div>
                {data.recentFeedback.length === 0 ? (
                  <p className="admin-empty">{t('admin:feedback.empty')}</p>
                ) : (
                  <ul className="admin-attention-list">
                    {data.recentFeedback.map((item) => (
                      <li key={item.id}>
                        <Link to="/admin/feedback">
                          <strong>{item.userName || item.userEmail || '—'}</strong>
                          <span>{item.commentExcerpt || t('admin:feedback.noComment')}</span>
                          <em>{formatDateTime(item.createdAt)}</em>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2>{t('admin:overview.panels.errors')}</h2>
                  <Link to="/admin/errors">{t('admin:overview.viewAll')}</Link>
                </div>
                {data.recentErrors.length === 0 ? (
                  <p className="admin-empty">{t('admin:errors.empty')}</p>
                ) : (
                  <ul className="admin-attention-list">
                    {data.recentErrors.map((item) => (
                      <li key={item.id}>
                        <Link to="/admin/errors">
                          <strong>
                            {item.statusCode} {item.method} {item.path}
                          </strong>
                          <span>{item.messageExcerpt}</span>
                          <em>{formatDateTime(item.occurredAt)}</em>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2>{t('admin:overview.panels.users')}</h2>
                  <Link to="/admin/users">{t('admin:overview.viewAll')}</Link>
                </div>
                {data.newestUsers.length === 0 ? (
                  <p className="admin-empty">{t('admin:users.empty')}</p>
                ) : (
                  <ul className="admin-attention-list">
                    {data.newestUsers.map((item) => (
                      <li key={item.id}>
                        <Link to="/admin/users">
                          <strong>
                            {[item.firstName, item.lastName].filter(Boolean).join(' ') || item.email}
                          </strong>
                          <span>
                            {item.email} · {item.role}
                          </span>
                          <em>{formatDateTime(item.createdAt)}</em>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default AdminOverviewPage;
