import React from 'react';
import { MinistryNotification } from '../../services/ministryNotificationService';
import MinistryNotificationCard from './MinistryNotificationCard';
import './MinistryNotifications.css';

type Props = {
  notifications: MinistryNotification[];
  onMarkAsRead: (id: string) => void;
  onOpen?: (notification: MinistryNotification) => void;
};

const MinistryNotificationList: React.FC<Props> = ({ notifications, onMarkAsRead, onOpen }) => {
  if (notifications.length === 0) {
    return (
      <div className="ministry-notif-empty">
        <div className="ministry-notif-empty-icon" aria-hidden>
          📰
        </div>
        <div className="ministry-notif-empty-title">No ministry notifications</div>
        <div className="ministry-notif-empty-subtitle">You’re all caught up.</div>
      </div>
    );
  }

  return (
    <div className="ministry-notif-list">
      {notifications.map((n) => (
        <MinistryNotificationCard key={n.id} notification={n} onMarkAsRead={onMarkAsRead} onOpen={onOpen} />
      ))}
    </div>
  );
};

export default MinistryNotificationList;

