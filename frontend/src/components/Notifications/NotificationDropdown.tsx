import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useNotifications, Notification } from '../../context/NotificationContext';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import { resolveNotificationTarget } from './resolveNotificationTarget';
import { Link } from 'react-router-dom';
import { drawerState, notificationCategory } from './notificationVisibility';
import { Bell, Check, CloudSun, Leaf, Megaphone, MessageCircleQuestion, MoreVertical, PieChart, UserRound, Wallet, X } from 'lucide-react';
import './NotificationDropdown.css';

interface NotificationDropdownProps {
  onClose: () => void;
}

const SourceBadge: React.FC<{ notification: Notification; label: string }> = ({
  notification,
  label,
}) => {
  const kind = notification.campaignKind || notification.eventType || notification.type;
  const category = notificationCategory(notification);
  let Icon = Bell;
  if (notification.source === 'campaign') {
    if (kind === 'poll') Icon = PieChart;
    else if (kind === 'questionnaire') Icon = MessageCircleQuestion;
    else Icon = Megaphone;
  } else if (category === 'taskAssignment') Icon = UserRound;
  else if (category === 'approval') Icon = Check;
  else if (category === 'harvest') Icon = Leaf;
  else if (category === 'financial') Icon = Wallet;
  else if (category === 'satelliteWeather') Icon = CloudSun;
  return (
    <span className={`notification-source-badge source-${notification.source || 'local'}`}>
      <Icon size={12} aria-hidden />
      {label}
    </span>
  );
};

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const { t } = useTranslation('common');
  const { formatDateTime } = useLocaleFormatters();
  const {
    notifications,
    hiddenUnreadCount,
    inboxLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    openNotification,
  } = useNotifications();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const badgeLabel = (notification: Notification) => {
    if (notification.source === 'campaign') {
      if (notification.campaignKind === 'poll') return t('inApp.poll');
      if (notification.campaignKind === 'questionnaire') return t('inApp.questionnaire');
      return t('inApp.announcement');
    }
    const category = notificationCategory(notification);
    return t(`notifications.types.${category}`);
  };

  const state = drawerState(notifications.length, hiddenUnreadCount, inboxLoading);

  const handleNotificationClick = (notification: Notification) => {
    if (notification.source === 'campaign' && notification.campaignId) {
      openNotification(notification);
      onClose();
      return;
    }

    markAsRead(notification.id);
    const target = resolveNotificationTarget(notification);
    if (target) {
      navigate(target);
      onClose();
    }
  };

  const handleClearAll = () => {
    setMenuOpen(false);
    const count = notifications.length;
    if (count === 0) return;
    const ok = window.confirm(t('notifications.clearAllConfirm', { count }));
    if (!ok) return;
    clearAll();
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
                type="button"
                onClick={markAllAsRead}
                className="mark-all-read-btn"
                title={t('notifications.markAllRead')}
                aria-label={t('notifications.markAllRead')}
              >
                <Check size={18} />
              </button>
              <div className="notification-more" ref={menuRef}>
                <button
                  type="button"
                  className="notification-more-btn"
                  title={t('moreMenu')}
                  aria-label={t('moreMenu')}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <MoreVertical size={18} />
                </button>
                {menuOpen ? (
                  <div className="notification-overflow-menu" role="menu">
                    <button type="button" role="menuitem" className="is-danger" onClick={handleClearAll}>
                      {t('notifications.clearAll')}
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
          <button type="button" onClick={onClose} className="close-btn" title={t('close')} aria-label={t('close')}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="notification-list">
        {state === 'loading' ? (
          <div className="no-notifications">
            <Bell size={28} aria-hidden />
            <strong>{t('notifications.loading')}</strong>
          </div>
        ) : state === 'hidden' ? (
          <div className="no-notifications">
            <Bell size={28} aria-hidden />
            <strong>{t('notifications.hiddenBySettings', { count: hiddenUnreadCount })}</strong>
            <Link to="/settings" onClick={onClose}>
              {t('notifications.reviewSettings')}
            </Link>
          </div>
        ) : state === 'clear' ? (
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
                    <span className="notification-time">{formatDateTime(notification.timestamp)}</span>
                    {notification.source === 'campaign' && !notification.isCompleted && (
                      <span className="notification-cta">{t('notifications.tapToRespond')}</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
                className="remove-notification-btn"
                title={t('delete')}
                aria-label={t('delete')}
              >
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
