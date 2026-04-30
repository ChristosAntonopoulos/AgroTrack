import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, CheckCircle2 } from 'lucide-react';
import Badge from '../Common/Badge';
import Button from '../Common/Button';
import { MinistryNotification } from '../../services/ministryNotificationService';
import './MinistryNotifications.css';

type Props = {
  notification: MinistryNotification;
  onMarkAsRead: (id: string) => void;
  onOpen?: (notification: MinistryNotification) => void;
};

const priorityVariant = (priority: MinistryNotification['priority']) => {
  switch (priority) {
    case 'critical':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    default:
      return 'primary';
  }
};

export const MinistryNotificationCard: React.FC<Props> = ({ notification, onMarkAsRead, onOpen }) => {
  return (
    <div className={`ministry-notif-card ${notification.read ? 'read' : 'unread'}`}>
      <div className="ministry-notif-card-main" onClick={() => onOpen?.(notification)} role="button" tabIndex={0}>
        <div className="ministry-notif-card-top">
          <div className="ministry-notif-card-title">{notification.title}</div>
          <div className="ministry-notif-card-badges">
            <Badge size="sm" variant={priorityVariant(notification.priority)}>
              {notification.priority.toUpperCase()}
            </Badge>
            <Badge size="sm" variant="primary">
              {notification.type}
            </Badge>
          </div>
        </div>

        <div className="ministry-notif-card-message">{notification.message}</div>

        <div className="ministry-notif-card-meta">
          <span className="ministry-notif-card-category">{notification.category}</span>
          <span className="ministry-notif-card-time">
            {formatDistanceToNow(notification.date, { addSuffix: true })}
          </span>
        </div>
      </div>

      <div className="ministry-notif-card-actions">
        {!notification.read ? (
          <Button
            size="sm"
            variant="outline"
            icon={<CheckCircle2 size={16} />}
            onClick={() => onMarkAsRead(notification.id)}
          >
            Mark read
          </Button>
        ) : null}
        {notification.actionUrl ? (
          <Button
            size="sm"
            variant="ghost"
            icon={<ExternalLink size={16} />}
            onClick={() => window.open(notification.actionUrl, '_blank', 'noopener,noreferrer')}
          >
            Open
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default MinistryNotificationCard;

