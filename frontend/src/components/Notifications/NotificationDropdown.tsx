import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useNotifications, Notification } from '../../context/NotificationContext';
import { migrateLegacyHomePath } from '../../navigation/homePath';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import { Check, X, Trash2 } from 'lucide-react';
import './NotificationDropdown.css';

interface NotificationDropdownProps {
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const { t } = useTranslation('common');
  const { formatRelativeTime } = useLocaleFormatters();
  const { notifications, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(migrateLegacyHomePath(notification.actionUrl));
      onClose();
    }
  };

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h3>{t('notifications.title')}</h3>
        <div className="notification-actions">
          {notifications.length > 0 && (
            <>
              <button
                onClick={markAllAsRead}
                className="mark-all-read-btn"
                title={t('notifications.markAllRead')}
              >
                <Check />
              </button>
              <button onClick={clearAll} className="clear-all-btn" title={t('notifications.clearAll')}>
                <Trash2 />
              </button>
            </>
          )}
          <button onClick={onClose} className="close-btn" title={t('close')}>
            <X />
          </button>
        </div>
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="no-notifications">{t('notifications.empty')}</div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${notification.read ? 'read' : 'unread'}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-content">
                <div className={`notification-type-indicator ${notification.type}`}></div>
                <div className="notification-text">
                  <div className="notification-title">{notification.title}</div>
                  <div className="notification-message">{notification.message}</div>
                  <div className="notification-time">{formatRelativeTime(notification.timestamp)}</div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
                className="remove-notification-btn"
                title={t('delete')}
              >
                <X />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
