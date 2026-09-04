import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/translateApiError';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import Badge from '../components/Common/Badge';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { getMinistryNotificationService } from '../services/serviceFactory';
import { MinistryNotification } from '../services/ministryNotificationService';
import MinistryNotificationList from '../components/Ministry/MinistryNotificationList';
import { CheckCircle2, Filter } from 'lucide-react';
import './MinistryNotificationsPage.css';

const MinistryNotificationsPage: React.FC = () => {
  const { t } = useTranslation(['ministry', 'errors']);
  const { user } = useAuth();
  const role = user?.role || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<MinistryNotification[]>([]);
  const [urgentOnly, setUrgentOnly] = useState(false);

  const ministryService = getMinistryNotificationService();

  const load = async (mode: 'all' | 'urgent' = urgentOnly ? 'urgent' : 'all') => {
    try {
      setError(null);
      setLoading(true);
      const data =
        mode === 'urgent'
          ? await ministryService.getUrgentNotifications(role)
          : await ministryService.getNotifications(role);
      setNotifications(data);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t) || t('ministry:failedLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, urgentOnly]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const handleMarkAsRead = async (id: string) => {
    await ministryService.markAsRead(id);
    await load();
  };

  const handleMarkAllAsRead = async () => {
    await ministryService.markAllAsRead(role);
    await load();
  };

  const handleOpen = async (n: MinistryNotification) => {
    if (!n.read) {
      await ministryService.markAsRead(n.id);
      await load();
    }
  };

  return (
    <PageContainer>
      <div className="ministry-page">
        <Breadcrumbs />

        <div className="ministry-page-header">
          <div>
            <h1>{t('ministry:title')}</h1>
            <p className="ministry-subtitle">Role-targeted regulations, subsidies, deadlines, and alerts</p>
          </div>

          <div className="ministry-actions">
            <Button
              variant={urgentOnly ? 'secondary' : 'outline'}
              size="sm"
              icon={<Filter />}
              onClick={() => setUrgentOnly((v) => !v)}
            >
              {urgentOnly ? t('ministry:urgentOnly') : t('common:all')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={<CheckCircle2 />}
              onClick={handleMarkAllAsRead}
              disabled={loading || notifications.length === 0 || unreadCount === 0}
            >
              {t('ministry:markAllRead')}
            </Button>

            <Badge variant={unreadCount > 0 ? 'warning' : 'info'} size="md">
              {unreadCount} unread
            </Badge>
          </div>
        </div>

        {error ? <div className="error-message">{error}</div> : null}

        {loading ? (
          <LoadingSpinner className="page-inline-loading" />
        ) : (
          <Card padding="md">
            <MinistryNotificationList notifications={notifications} onMarkAsRead={handleMarkAsRead} onOpen={handleOpen} />
          </Card>
        )}
      </div>
    </PageContainer>
  );
};

export default MinistryNotificationsPage;

