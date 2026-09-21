import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { getPartnerService } from '../services/serviceFactory';
import { inAppMessageService } from '../services/inAppCampaignService';
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
  source?: 'transactional' | 'campaign' | 'local';
  campaignId?: string;
  campaignKind?: string;
  isCompleted?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
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
  const { isAuthenticated } = useAuth();
  const { openCampaign, refreshInboxSignal } = useInAppMessages();

  const loadInbox = useCallback(async () => {
    try {
      const items = await inAppMessageService.getInbox();
      setNotifications((prev) => {
        const localOnly = prev.filter((n) => n.id.startsWith('notif-'));
        const fromApi: Notification[] = items.map((item) => ({
          id: item.id,
          type: mapInboxType(item.type, item.source),
          title: item.title,
          message: item.message,
          timestamp: new Date(item.createdAt),
          read: item.isRead,
          actionUrl: item.actionUrl ?? undefined,
          source: item.source === 'campaign' ? 'campaign' : 'transactional',
          campaignId: item.campaignId ?? undefined,
          campaignKind: item.campaignKind ?? undefined,
          isCompleted: item.isCompleted,
        }));
        return [...fromApi, ...localOnly];
      });
    } catch {
      // Fallback to legacy transactional endpoint if merged inbox is unavailable.
      try {
        const items = await getPartnerService().getNotifications();
        setNotifications((prev) => {
          const localOnly = prev.filter((n) => n.id.startsWith('notif-'));
          const fromApi: Notification[] = items.map((item) => ({
            id: item.id,
            type: item.type.includes('update') ? 'success' : 'info',
            title: item.title,
            message: item.message,
            timestamp: new Date(item.createdAt),
            read: item.isRead,
            actionUrl: item.actionUrl,
            source: 'transactional',
          }));
          return [...fromApi, ...localOnly];
        });
      } catch {
        // Inbox is optional when the API is offline.
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications((prev) => prev.filter((n) => n.id.startsWith('notif-')));
      return;
    }

    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadInbox();
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
    setNotifications((prev) => prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)));
    if (id.startsWith('notif-')) return;

    if (id.startsWith('campaign:')) {
      const campaignId = id.slice('campaign:'.length);
      void inAppMessageService.markSeen(campaignId).catch(() => undefined);
      return;
    }

    void getPartnerService().markNotificationRead(id).catch(() => undefined);
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      prev.forEach((n) => {
        if (n.read || n.id.startsWith('notif-')) return;
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
    setNotifications([]);
  };

  const openNotification = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.source === 'campaign' && notification.campaignId) {
      openCampaign(notification.campaignId);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
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
