import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo, useRef } from 'react';
import { getPartnerService, isMockMode } from '../services/serviceFactory';
import { inAppMessageService } from '../services/inAppCampaignService';
import { accountService } from '../services/accountService';
import { PREFERENCES_CHANGED_EVENT, settingsService } from '../services/settingsService';
import { mergeDemoInbox } from '../components/Notifications/demoInbox';
import { readInboxIds, rememberInboxRead } from '../components/Notifications/inboxReadStore';
import { partitionNotifications } from '../components/Notifications/notificationVisibility';
import { useAuth } from './AuthContext';
import { useInAppMessages } from './InAppMessageContext';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  /** Raw server type, such as task_assigned or task_approval. */
  eventType?: string;
  source?: 'transactional' | 'campaign' | 'local';
  campaignId?: string;
  campaignKind?: string;
  isCompleted?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  hiddenUnreadCount: number;
  inboxLoading: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  openNotification: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const mapInboxType = (type: string, source: string): Notification['type'] => {
  if (source === 'campaign') {
    if (type === 'poll' || type === 'questionnaire') return 'warning';
    return 'info';
  }
  return type.includes('update') ? 'success' : 'info';
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [prefs, setPrefs] = useState(() => settingsService.getPreferences().notificationPrefs);
  const loadedOnce = useRef(false);
  const { isAuthenticated, user } = useAuth();
  const { openCampaign, refreshInboxSignal } = useInAppMessages();

  const loadInbox = useCallback(async () => {
    const userId = user?.userId;
    const applyRead = (id: string, isRead: boolean) => isRead || readInboxIds(userId).has(id);
    try {
      const fetched = await inAppMessageService.getInbox();
      const items = mergeDemoInbox(fetched, userId, isMockMode());
      const relatedById = new Map<
        string,
        { relatedEntityId?: string; relatedEntityType?: string; actionUrl?: string }
      >();
      try {
        const legacy = await getPartnerService().getNotifications();
        legacy.forEach((n) => {
          relatedById.set(n.id, {
            relatedEntityId: n.relatedEntityId,
            relatedEntityType: n.relatedEntityType,
            actionUrl: n.actionUrl,
          });
        });
      } catch {
        // Related-entity enrichment is optional.
      }

      setNotifications((prev) => {
        const localOnly = prev.filter((n) => n.id.startsWith('notif-'));
        const fromApi: Notification[] = items.map((item) => {
          const related = relatedById.get(item.id);
          return {
            id: item.id,
            type: mapInboxType(item.type, item.source),
            eventType: item.type,
            title: item.title,
            message: item.message,
            timestamp: new Date(item.createdAt),
            read: applyRead(item.id, item.isRead),
            actionUrl: item.actionUrl ?? related?.actionUrl,
            relatedEntityId: item.relatedEntityId ?? related?.relatedEntityId,
            relatedEntityType: item.relatedEntityType ?? related?.relatedEntityType,
            source: item.source === 'campaign' ? 'campaign' : 'transactional',
            campaignId: item.campaignId ?? undefined,
            campaignKind: item.campaignKind ?? undefined,
            isCompleted: item.isCompleted,
          };
        });
        return [...fromApi, ...localOnly];
      });
    } catch {
      try {
        const items = mergeDemoInbox([], userId, isMockMode());
        const legacy = items.length > 0 ? items : await getPartnerService().getNotifications().then((rows) =>
          rows.map((row) => ({
            id: row.id,
            source: 'transactional',
            type: row.type,
            title: row.title,
            message: row.message,
            actionUrl: row.actionUrl,
            relatedEntityId: row.relatedEntityId,
            relatedEntityType: row.relatedEntityType,
            isRead: row.isRead,
            isCompleted: row.isRead,
            createdAt: row.createdAt,
          }))
        );
        setNotifications((prev) => {
          const localOnly = prev.filter((n) => n.id.startsWith('notif-'));
          const fromApi: Notification[] = legacy.map((item) => ({
            id: item.id,
            type: item.type.includes('update') ? 'success' : 'info',
            eventType: item.type,
            title: item.title,
            message: item.message,
            timestamp: new Date(item.createdAt),
            read: applyRead(item.id, item.isRead),
            actionUrl: item.actionUrl ?? undefined,
            relatedEntityId: item.relatedEntityId ?? undefined,
            relatedEntityType: item.relatedEntityType ?? undefined,
            source: 'transactional',
          }));
          return [...fromApi, ...localOnly];
        });
      } catch {
        // Inbox is optional when the API is offline.
      }
    }
  }, [user?.userId]);
  useEffect(() => {
    const sync = () => setPrefs(settingsService.getPreferences().notificationPrefs);
    window.addEventListener(PREFERENCES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(PREFERENCES_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!user?.userId) return;
    void accountService.loadNotificationPrefs(user.userId).then((loaded) => {
      if (loaded) settingsService.savePreferences({ notificationPrefs: loaded });
    });
  }, [user?.userId]);

  useEffect(() => {
    if (!isAuthenticated) {
      loadedOnce.current = false;
      setInboxLoading(false);
      setNotifications((prev) => prev.filter((n) => n.id.startsWith('notif-')));
      return;
    }

    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      if (!loadedOnce.current) setInboxLoading(true);
      try {
        await loadInbox();
        loadedOnce.current = true;
      } finally {
        if (!cancelled) setInboxLoading(false);
      }
    };
    void run();
    const timer = window.setInterval(() => void run(), 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isAuthenticated, loadInbox, refreshInboxSignal]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
      source: 'local',
    };
    setNotifications((prev) => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    rememberInboxRead(id, user?.userId);
    setNotifications((prev) => prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)));
    if (id.startsWith('notif-') || id.startsWith('demo-')) return;

    if (id.startsWith('campaign:')) {
      const campaignId = id.slice('campaign:'.length);
      void inAppMessageService.markSeen(campaignId).catch(() => undefined);
      return;
    }

    void getPartnerService().markNotificationRead(id).catch(() => undefined);
  };

  const markAllAsRead = () => {
    const userId = user?.userId;
    setNotifications((prev) => {
      prev.forEach((n) => {
        if (!n.read) rememberInboxRead(n.id, userId);
        if (n.read || n.id.startsWith('notif-') || n.id.startsWith('demo-')) return;
        if (n.source === 'campaign' && n.campaignId) {
          void inAppMessageService.markSeen(n.campaignId).catch(() => undefined);
        } else if (n.source === 'transactional') {
          void getPartnerService().markNotificationRead(n.id).catch(() => undefined);
        }
      });
      return prev.map((notif) => ({ ...notif, read: true }));
    });
  };
  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    if (id.startsWith('campaign:')) {
      const campaignId = id.slice('campaign:'.length);
      void inAppMessageService.dismiss(campaignId).catch(() => undefined);
    }
  };

  const clearAll = () => {
    setNotifications((prev) => {
      prev.forEach((n) => {
        if (n.id.startsWith('campaign:') && n.campaignId) {
          void inAppMessageService.dismiss(n.campaignId).catch(() => undefined);
        }
      });
      return [];
    });
  };

  const openNotification = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.source === 'campaign' && notification.campaignId) {
      openCampaign(notification.campaignId);
    }
  };

  const { visible, hiddenUnread } = useMemo(
    () => partitionNotifications(notifications, prefs),
    [notifications, prefs]
  );
  const unreadCount = visible.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications: visible,
        unreadCount,
        hiddenUnreadCount: hiddenUnread,
        inboxLoading,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        openNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
