import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Megaphone, MessageSquareHeart, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminCampaignService, InAppCampaign } from '../../services/inAppCampaignService';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import Breadcrumbs from '../../components/Layout/Breadcrumbs';
import PageContainer from '../../components/Common/PageContainer';
import PageHeader from '../../components/Common/PageHeader';
import Button from '../../components/Common/Button';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import './AdminPages.css';

const CampaignsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const { user } = useAuth();
  const { formatDateTime } = useLocaleFormatters();
  const [items, setItems] = useState<InAppCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setItems(await adminCampaignService.list());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (user?.role !== 'Administrator') {
    return (
      <PageContainer>
        <div className="admin-page">
          <Breadcrumbs />
          <div className="error-message">{t('admin:campaigns.forbidden')}</div>
        </div>
      </PageContainer>
    );
  }

  const titleFor = (c: InAppCampaign) =>
    i18n.language.startsWith('el') ? c.title.el || c.title.en : c.title.en || c.title.el;

  return (
    <PageContainer>
      <div className="admin-page">
        <Breadcrumbs />
        <PageHeader
          title={t('admin:campaigns.title')}
          subtitle={t('admin:campaigns.subtitle')}
          actions={
            <div className="admin-header-actions">
              <Button to="/admin/feedback" variant="outline" icon={<MessageSquareHeart size={16} />}>
                {t('admin:feedback.nav')}
              </Button>
              <Button to="/admin/campaigns/new" variant="primary" icon={<Plus size={16} />}>
                {t('admin:campaigns.new')}
              </Button>
            </div>
          }
        />

        <div className="admin-tabs">
          <Link to="/admin/campaigns" className="admin-tab is-active">
            <Megaphone size={16} /> {t('admin:campaigns.nav')}
          </Link>
          <Link to="/admin/feedback" className="admin-tab">
            <MessageSquareHeart size={16} /> {t('admin:feedback.nav')}
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : failed ? (
          <div className="error-message">{t('admin:campaigns.loadFailed')}</div>
        ) : items.length === 0 ? (
          <p className="admin-empty">{t('admin:campaigns.empty')}</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin:campaigns.columns.title')}</th>
                  <th>{t('admin:campaigns.columns.kind')}</th>
                  <th>{t('admin:campaigns.columns.status')}</th>
                  <th>{t('admin:campaigns.columns.placements')}</th>
                  <th>{t('admin:campaigns.columns.updated')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/admin/campaigns/${c.id}`}>{titleFor(c)}</Link>
                    </td>
                    <td>{t(`admin:campaigns.kinds.${c.kind}`, { defaultValue: c.kind })}</td>
                    <td>
                      <span className={`admin-badge status-${c.status}`}>{c.status}</span>
                    </td>
                    <td>
                      {[c.placements.inbox && 'inbox', c.placements.modal && 'modal']
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </td>
                    <td>{formatDateTime(c.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default CampaignsPage;
