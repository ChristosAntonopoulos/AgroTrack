import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useNotifications, Notification } from '../../context/NotificationContext';
import { migrateLegacyHomePath } from '../../navigation/homePath';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import { Bell, Check, Megaphone, MessageCircleQuestion, PieChart, Trash2, X } from 'lucide-react';
import './NotificationDropdown.css';

interface NotificationDropdownProps {
  onClose: () => void;
}

const SourceBadge: React.FC<{ notification: Notification; label: string }> = ({
  notification,
  label,
}) => {
  const kind = notification.campaignKind || notification.type;
  let Icon = Bell;
  if (notification.source === 'campaign') {
    if (kind === 'poll') Icon = PieChart;
    else if (kind === 'questionnaire') Icon = MessageCircleQuestion;
    else Icon = Megaphone;
  }
  return (
    <span className={`notification-badge source-${notification.source || 'local'}`}>
      <Icon size={12} aria-hidden />
      {label}
    </span>
  );
};

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const { t } = useTranslation('common');
  const { formatRelativeTime } = useLocaleFormatters();
  const { notifications, markAsRead, markAllAsRead, removeNotification, clearAll, openNotification } =
    useNotifications();
  const navigate = useNavigate();

  const badgeLabel = (notification: Notification) => {
    if (notification.source !== 'campaign') return t('notifications.badge.inbox');
    if (notification.campaignKind === 'poll') return t('inApp.poll');
    if (notification.campaignKind === 'questionnaire') return t('inApp.questionnaire');
    return t('inApp.announcement');
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.source === 'campaign' && notification.campaignId) {
      openNotification(notification);
      onClose();
      return;
    }
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(migrateLegacyHomePath(notification.actionUrl));
      onClose();
    }
  };

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <div>
          <h3>{t('notifications.title')}</h3>
          <p className="notification-subtitle">{t('notifications.subtitle')}</p>
        </div>
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
          <div className="no-notifications">
            <Bell size={28} aria-hidden />
            <strong>{t('notifications.empty')}</strong>
            <span>{t('notifications.emptyHint')}</span>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${notification.read ? 'read' : 'unread'}`}
              onClick={() => handleNotificationClick(notification)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNotificationClick(notification);
                }
              }}
            >
              <div className="notification-content">
                <div className={`notification-type-indicator ${notification.type}`}></div>
                <div className="notification-text">
                  <div className="notification-title-row">
                    <div className="notification-title">{notification.title}</div>
                    <SourceBadge notification={notification} label={badgeLabel(notification)} />
                  </div>
                  <div className="notification-message">{notification.message}</div>
                  <div className="notification-meta">
                    <span className="notification-time">
                      {formatRelativeTime(notification.timestamp)}
                    </span>
                    {notification.source === 'campaign' && !notification.isCompleted && (
                      <span className="notification-cta">{t('notifications.tapToRespond')}</span>
                    )}
                  </div>
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
