import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Megaphone, MessageSquareHeart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  adminFeedbackService,
  AdminFeedbackDetail,
  AdminFeedbackListItem,
} from '../../services/inAppCampaignService';
import { getApiBaseUrl } from '../../config/apiConfig';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import { getApiErrorMessage } from '../../utils/translateApiError';
import Breadcrumbs from '../../components/Layout/Breadcrumbs';
import PageContainer from '../../components/Common/PageContainer';
import PageHeader from '../../components/Common/PageHeader';
import Button from '../../components/Common/Button';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import './AdminPages.css';

const mediaUrl = (path?: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = getApiBaseUrl().replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

const FeedbackInboxPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common', 'errors']);
  const { user } = useAuth();
  const { formatDateTime } = useLocaleFormatters();
  const [items, setItems] = useState<AdminFeedbackListItem[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<AdminFeedbackDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    setFailed(false);
    try {
      const data = await adminFeedbackService.list(p, 30);
      setItems(data.items);
      setUnseenCount(data.unseenCount);
      setTotal(data.total);
      setPage(data.page);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const openDetail = async (id: string) => {
    setDetailError(null);
    try {
      const detail = await adminFeedbackService.get(id);
      setSelected(detail);
      if (!detail.seenAt) {
        await adminFeedbackService.markSeen(id);
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, seenAt: new Date().toISOString() } : item
          )
        );
        setUnseenCount((n) => Math.max(0, n - 1));
        setSelected({ ...detail, seenAt: new Date().toISOString() });
      }
    } catch (err) {
      setDetailError(getApiErrorMessage(err, t));
    }
  };

  if (user?.role !== 'Administrator') {
    return (
      <PageContainer>
        <div className="admin-page">
          <Breadcrumbs />
          <div className="error-message">{t('admin:feedback.forbidden')}</div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="admin-page">
        <Breadcrumbs />
        <PageHeader
          title={t('admin:feedback.title')}
          subtitle={t('admin:feedback.subtitle', { count: unseenCount })}
          actions={
            <Button to="/admin/campaigns" variant="outline" icon={<Megaphone size={16} />}>
              {t('admin:campaigns.nav')}
            </Button>
          }
        />

        <div className="admin-tabs">
          <Link to="/admin/campaigns" className="admin-tab">
            <Megaphone size={16} /> {t('admin:campaigns.nav')}
          </Link>
          <Link to="/admin/feedback" className="admin-tab is-active">
            <MessageSquareHeart size={16} /> {t('admin:feedback.nav')}
            {unseenCount > 0 ? ` (${unseenCount})` : ''}
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : failed ? (
          <div className="error-message">{t('admin:feedback.loadFailed')}</div>
        ) : items.length === 0 ? (
          <p className="admin-empty">{t('admin:feedback.empty')}</p>
        ) : (
          <div className="admin-feedback-layout">
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin:feedback.columns.user')}</th>
                    <th>{t('admin:feedback.columns.comment')}</th>
                    <th>{t('admin:feedback.columns.when')}</th>
                    <th>{t('admin:feedback.columns.media')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={!item.seenAt ? 'is-unseen' : undefined}
                      onClick={() => void openDetail(item.id)}
                    >
                      <td>
                        <div>{item.userName || item.userEmail || item.userId}</div>
                        <div className="admin-muted">{item.role}</div>
                      </td>
                      <td>{item.commentExcerpt || '—'}</td>
                      <td>{formatDateTime(item.createdAt)}</td>
                      <td>
                        {[item.hasScreenshot && '📷', item.hasPhoto && '🖼'].filter(Boolean).join(' ') ||
                          '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="admin-pager">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t('common:previous')}
                </Button>
                <span>
                  {page} / {Math.max(1, Math.ceil(total / 30))}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page * 30 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t('common:next')}
                </Button>
              </div>
            </div>

            <aside className="admin-feedback-detail">
              {detailError && <div className="error-message">{detailError}</div>}
              {!selected ? (
                <p className="admin-empty">{t('admin:feedback.select')}</p>
              ) : (
                <>
                  <h2>{selected.userName || selected.userEmail}</h2>
                  <p className="admin-muted">
                    {selected.role} · {selected.userEmail} · {formatDateTime(selected.createdAt)}
                  </p>
                  {selected.pageUrl && (
                    <p>
                      <a href={selected.pageUrl} target="_blank" rel="noreferrer">
                        {selected.pageUrl}
                      </a>
                    </p>
                  )}
                  <p className="admin-comment">{selected.comment || t('admin:feedback.noComment')}</p>
                  {selected.userAgent && <p className="admin-muted">{selected.userAgent}</p>}
                  <div className="admin-media">
                    {mediaUrl(selected.screenshotUrl) && (
                      <a href={mediaUrl(selected.screenshotUrl)!} target="_blank" rel="noreferrer">
                        <img src={mediaUrl(selected.screenshotUrl)!} alt="screenshot" />
                      </a>
                    )}
                    {mediaUrl(selected.photoUrl) && (
                      <a href={mediaUrl(selected.photoUrl)!} target="_blank" rel="noreferrer">
                        <img src={mediaUrl(selected.photoUrl)!} alt="photo" />
                      </a>
                    )}
                  </div>
                </>
              )}
            </aside>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default FeedbackInboxPage;
