import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, Notification } from '../../context/NotificationContext';
import { Check, X, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import './NotificationDropdown.css';

interface NotificationDropdownProps {
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const { notifications, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      onClose();
    }
  };

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h3>Notifications</h3>
        <div className="notification-actions">
          {notifications.length > 0 && (
            <>
              <button onClick={markAllAsRead} className="mark-all-read-btn" title="Mark all as read">
                <Check />
              </button>
              <button onClick={clearAll} className="clear-all-btn" title="Clear all">
                <Trash2 />
              </button>
            </>
          )}
          <button onClick={onClose} className="close-btn" title="Close">
            <X />
          </button>
        </div>
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="no-notifications">No notifications</div>
        ) : (
          notifications.map(notification => (
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
                  <div className="notification-time">
                    {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
                className="remove-notification-btn"
                title="Remove"
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
