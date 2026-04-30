import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import Badge from '../components/Common/Badge';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { ministryNotificationService, MinistryNotification } from '../services/ministryNotificationService';
import MinistryNotificationList from '../components/Ministry/MinistryNotificationList';
import { CheckCircle2, Filter } from 'lucide-react';
import './MinistryNotificationsPage.css';

const MinistryNotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<MinistryNotification[]>([]);
  const [urgentOnly, setUrgentOnly] = useState(false);

  const load = async (mode: 'all' | 'urgent' = urgentOnly ? 'urgent' : 'all') => {
    try {
      setError(null);
      setLoading(true);
      const data =
        mode === 'urgent'
          ? await ministryNotificationService.getUrgentNotifications(role)
          : await ministryNotificationService.getNotifications(role);
      setNotifications(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load notifications');
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
    await ministryNotificationService.markAsRead(id);
    await load();
  };

  const handleMarkAllAsRead = async () => {
    await ministryNotificationService.markAllAsRead(role);
    await load();
  };

  const handleOpen = async (n: MinistryNotification) => {
    if (!n.read) {
      await ministryNotificationService.markAsRead(n.id);
      await load();
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <PageContainer>
      <div className="ministry-page">
        <Breadcrumbs />

        <div className="ministry-page-header">
          <div>
            <h1>Ministry Notifications</h1>
            <p className="ministry-subtitle">Role-targeted regulations, subsidies, deadlines, and alerts</p>
          </div>

          <div className="ministry-actions">
            <Button
              variant={urgentOnly ? 'secondary' : 'outline'}
              size="sm"
              icon={<Filter />}
              onClick={() => setUrgentOnly((v) => !v)}
            >
              {urgentOnly ? 'Urgent only' : 'All'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={<CheckCircle2 />}
              onClick={handleMarkAllAsRead}
              disabled={notifications.length === 0 || unreadCount === 0}
            >
              Mark all read
            </Button>

            <Badge variant={unreadCount > 0 ? 'warning' : 'info'} size="md">
              {unreadCount} unread
            </Badge>
          </div>
        </div>

        {error ? <div className="error-message">{error}</div> : null}

        <Card padding="md">
          <MinistryNotificationList notifications={notifications} onMarkAsRead={handleMarkAsRead} onOpen={handleOpen} />
        </Card>
      </div>
    </PageContainer>
  );
};

export default MinistryNotificationsPage;

