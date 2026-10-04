import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../context/NotificationContext';
import NotificationDropdown from './NotificationDropdown';
import { Bell } from 'lucide-react';
import './NotificationBell.css';

const NotificationBell: React.FC = () => {
  const { t } = useTranslation('common');
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const label =
    unreadCount > 0
      ? t('notifications.openUnread', { count: unreadCount })
      : t('notifications.open');

  return (
    <div className="notification-bell-container">
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell />
        {unreadCount > 0 && (
          <span className="notification-bell-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>
      {isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
    </div>
  );
};

export default NotificationBell;
