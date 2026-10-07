import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  adminOpsService,
  AdminUserDetail,
  AdminUserListItem,
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

const AdminUsersPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common', 'errors']);
  const { user } = useAuth();
  const { formatDateTime } = useLocaleFormatters();
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<AdminUserDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(
    async (p = page) => {
      setLoading(true);
      setFailed(false);
      try {
        const data = await adminOpsService.listUsers({
          search: search.trim() || undefined,
          role: role || undefined,
          page: p,
          pageSize: 30,
          sortBy,
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
    [page, role, search, sortBy]
  );

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const openDetail = async (id: string) => {
    setDetailError(null);
    try {
      setSelected(await adminOpsService.getUser(id));
    } catch (err) {
      setDetailError(getApiErrorMessage(err, t));
    }
  };

  if (user?.role !== 'Administrator') {
    return (
      <PageContainer>
        <div className="error-message">{t('admin:users.forbidden')}</div>
      </PageContainer>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <PageContainer>
      <div className="admin-page">
        <Breadcrumbs />
        <PageHeader
          title={t('admin:users.title')}
          subtitle={t('admin:users.subtitle', { count: total })}
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin:users.searchPlaceholder')}
            aria-label={t('admin:users.searchPlaceholder')}
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label={t('admin:users.role')}>
            <option value="">{t('admin:users.allRoles')}</option>
            <option value="FieldOwner">FieldOwner</option>
            <option value="Producer">Producer</option>
            <option value="Agronomist">Agronomist</option>
            <option value="Administrator">Administrator</option>
            <option value="ServiceProvider">ServiceProvider</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label={t('admin:users.sort')}
          >
            <option value="createdAt">{t('admin:users.sortCreated')}</option>
            <option value="lastSeenAt">{t('admin:users.sortLastSeen')}</option>
          </select>
          <Button type="submit" variant="outline">
            {t('common:actions.apply', { defaultValue: 'Apply' })}
          </Button>
        </form>

        {loading ? (
          <LoadingSpinner />
        ) : failed ? (
          <div className="error-message">{t('admin:users.loadFailed')}</div>
        ) : items.length === 0 ? (
          <p className="admin-empty">{t('admin:users.empty')}</p>
        ) : (
          <div className="admin-split">
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin:users.columns.user')}</th>
                    <th>{t('admin:users.columns.role')}</th>
                    <th>{t('admin:users.columns.created')}</th>
                    <th>{t('admin:users.columns.lastLogin')}</th>
                    <th>{t('admin:users.columns.lastSeen')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={selected?.id === item.id ? 'is-unseen' : undefined}
                      onClick={() => void openDetail(item.id)}
                    >
                      <td>
                        <div>
                          {[item.firstName, item.lastName].filter(Boolean).join(' ') || '—'}
                        </div>
                        <div className="admin-muted">{item.email}</div>
                      </td>
                      <td>{item.role}</td>
                      <td>{formatDateTime(item.createdAt)}</td>
                      <td>{item.lastLoginAt ? formatDateTime(item.lastLoginAt) : '—'}</td>
                      <td>{item.lastSeenAt ? formatDateTime(item.lastSeenAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <aside className="admin-detail">
              {detailError && <div className="error-message">{detailError}</div>}
              {!selected ? (
                <p className="admin-empty">{t('admin:users.select')}</p>
              ) : (
                <div className="admin-detail-body">
                  <h2>
                    {[selected.firstName, selected.lastName].filter(Boolean).join(' ') ||
                      selected.email}
                  </h2>
                  <dl className="admin-dl">
                    <div>
                      <dt>{t('admin:users.columns.email')}</dt>
                      <dd>{selected.email}</dd>
                    </div>
                    <div>
                      <dt>{t('admin:users.columns.role')}</dt>
                      <dd>{selected.role}</dd>
                    </div>
                    <div>
                      <dt>{t('admin:users.columns.created')}</dt>
                      <dd>{formatDateTime(selected.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>{t('admin:users.columns.lastLogin')}</dt>
                      <dd>{selected.lastLoginAt ? formatDateTime(selected.lastLoginAt) : '—'}</dd>
                    </div>
                    <div>
                      <dt>{t('admin:users.columns.lastSeen')}</dt>
                      <dd>{selected.lastSeenAt ? formatDateTime(selected.lastSeenAt) : '—'}</dd>
                    </div>
                    <div>
                      <dt>{t('admin:users.language')}</dt>
                      <dd>{selected.language}</dd>
                    </div>
                    <div>
                      <dt>{t('admin:users.experienceMode')}</dt>
                      <dd>{selected.experienceMode}</dd>
                    </div>
                  </dl>
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

export default AdminUsersPage;
