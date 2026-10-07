import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  adminOpsService,
  AdminErrorDetail,
  AdminErrorListItem,
} from '../../services/adminOpsService';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import { getApiErrorMessage } from '../../utils/translateApiError';
import Breadcrumbs from '../../components/Layout/Breadcrumbs';
import PageContainer from '../../components/Common/PageContainer';
import PageHeader from '../../components/Common/PageHeader';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Button from '../../components/Common/Button';
import AdminTabs from './AdminTabs';
import './AdminPages.css';

const AdminErrorsPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common', 'errors']);
  const { user } = useAuth();
  const { formatDateTime } = useLocaleFormatters();
  const [items, setItems] = useState<AdminErrorListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [unackedOnly, setUnackedOnly] = useState(true);
  const [pathPrefix, setPathPrefix] = useState('');
  const [sinceHours, setSinceHours] = useState('168');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<AdminErrorDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [acking, setAcking] = useState(false);

  const load = useCallback(
    async (p = page) => {
      setLoading(true);
      setFailed(false);
      try {
        const hours = Number(sinceHours);
        const since =
          Number.isFinite(hours) && hours > 0
            ? new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
            : undefined;
        const data = await adminOpsService.listErrors({
          page: p,
          pageSize: 30,
          unacknowledgedOnly: unackedOnly || undefined,
          pathPrefix: pathPrefix.trim() || undefined,
          since,
        });
        setItems(data.items);
        setTotal(data.total);
        setPage(data.page);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [page, pathPrefix, sinceHours, unackedOnly]
  );

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const openDetail = async (id: string) => {
    setDetailError(null);
    try {
      setSelected(await adminOpsService.getError(id));
    } catch (err) {
      setDetailError(getApiErrorMessage(err, t));
    }
  };

  const acknowledge = async () => {
    if (!selected || selected.acknowledgedAt) return;
    setAcking(true);
    setDetailError(null);
    try {
      await adminOpsService.acknowledgeError(selected.id);
      const next = { ...selected, acknowledgedAt: new Date().toISOString() };
      setSelected(next);
      setItems((prev) =>
        prev.map((item) => (item.id === next.id ? { ...item, acknowledgedAt: next.acknowledgedAt } : item))
      );
    } catch (err) {
      setDetailError(getApiErrorMessage(err, t));
    } finally {
      setAcking(false);
    }
  };

  if (user?.role !== 'Administrator') {
    return (
      <PageContainer>
        <div className="error-message">{t('admin:errors.forbidden')}</div>
      </PageContainer>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <PageContainer>
      <div className="admin-page">
        <Breadcrumbs />
        <PageHeader
          title={t('admin:errors.title')}
          subtitle={t('admin:errors.subtitle', { count: total })}
        />
        <AdminTabs />

        <form
          className="admin-filters"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            void load(1);
          }}
        >
          <input
            type="search"
            value={pathPrefix}
            onChange={(e) => setPathPrefix(e.target.value)}
            placeholder={t('admin:errors.pathPrefixPlaceholder')}
            aria-label={t('admin:errors.pathPrefixPlaceholder')}
          />
          <select
            value={sinceHours}
            onChange={(e) => setSinceHours(e.target.value)}
            aria-label={t('admin:errors.since')}
          >
            <option value="24">{t('admin:errors.since24h')}</option>
            <option value="168">{t('admin:errors.since7d')}</option>
            <option value="720">{t('admin:errors.since30d')}</option>
            <option value="">{t('admin:errors.sinceAll')}</option>
          </select>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={unackedOnly}
              onChange={(e) => {
                setUnackedOnly(e.target.checked);
                setPage(1);
              }}
            />
            {t('admin:errors.unackedOnly')}
          </label>
          <Button type="submit" variant="outline">
            {t('common:actions.apply', { defaultValue: 'Apply' })}
          </Button>
        </form>

        {loading ? (
          <LoadingSpinner />
        ) : failed ? (
          <div className="error-message">{t('admin:errors.loadFailed')}</div>
        ) : items.length === 0 ? (
          <p className="admin-empty">{t('admin:errors.empty')}</p>
        ) : (
          <div className="admin-split">
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin:errors.columns.when')}</th>
                    <th>{t('admin:errors.columns.request')}</th>
                    <th>{t('admin:errors.columns.type')}</th>
                    <th>{t('admin:errors.columns.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={!item.acknowledgedAt ? 'is-unseen' : undefined}
                      onClick={() => void openDetail(item.id)}
                    >
                      <td>{formatDateTime(item.occurredAt)}</td>
                      <td>
                        <div>
                          {item.method} {item.path}
                        </div>
                        <div className="admin-muted">{item.messageExcerpt}</div>
                      </td>
                      <td>{item.exceptionType.split('.').pop()}</td>
                      <td>
                        {item.acknowledgedAt
                          ? t('admin:errors.acknowledged')
                          : t('admin:errors.open')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <aside className="admin-detail">
              {detailError && <div className="error-message">{detailError}</div>}
              {!selected ? (
                <p className="admin-empty">{t('admin:errors.select')}</p>
              ) : (
                <div className="admin-detail-body">
                  <h2>
                    {selected.statusCode} {selected.method} {selected.path}
                  </h2>
                  <dl className="admin-dl">
                    <div>
                      <dt>{t('admin:errors.columns.when')}</dt>
                      <dd>{formatDateTime(selected.occurredAt)}</dd>
                    </div>
                    <div>
                      <dt>{t('admin:errors.columns.type')}</dt>
                      <dd>{selected.exceptionType}</dd>
                    </div>
                    <div>
                      <dt>{t('admin:errors.requestId')}</dt>
                      <dd>{selected.requestId || '—'}</dd>
                    </div>
                    <div>
                      <dt>{t('admin:errors.userId')}</dt>
                      <dd>{selected.userId || '—'}</dd>
                    </div>
                  </dl>
                  <pre className="admin-stack">{selected.message}</pre>
                  {selected.stackTrace && <pre className="admin-stack">{selected.stackTrace}</pre>}
                  {!selected.acknowledgedAt && (
                    <Button variant="primary" onClick={() => void acknowledge()} disabled={acking}>
                      {t('admin:errors.acknowledge')}
                    </Button>
                  )}
                </div>
              )}
            </aside>
          </div>
        )}

        {totalPages > 1 && (
          <div className="admin-pager">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t('common:pagination.prev', { defaultValue: 'Previous' })}
            </Button>
            <span>
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('common:pagination.next', { defaultValue: 'Next' })}
            </Button>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default AdminErrorsPage;
