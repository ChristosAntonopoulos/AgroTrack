export type MinistryNotificationType = 'regulation' | 'subsidy' | 'deadline' | 'alert' | 'training';
export type MinistryNotificationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface MinistryNotification {
  id: string;
  title: string;
  message: string;
  type: MinistryNotificationType;
  priority: MinistryNotificationPriority;
  date: Date;
  expirationDate?: Date;
  read: boolean;
  actionUrl?: string;
  category: string;
  targetRoles?: string[];
}

const READ_IDS_KEY = 'Oleachron_ministry_notification_read_ids_v1';

const loadReadIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((x) => typeof x === 'string'));
    return new Set();
  } catch {
    return new Set();
  }
};

const saveReadIds = (ids: Set<string>) => {
  try {
    localStorage.setItem(READ_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
};

// Mock notifications data (ported from mobile)
const mockNotifications: Omit<MinistryNotification, 'read'>[] = [
  {
    id: 'notif1',
    title: 'New Pesticide Regulations',
    message:
      'The Ministry of Agriculture has updated regulations regarding pesticide usage. All producers must complete certification by end of month.',
    type: 'regulation',
    priority: 'high',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    expirationDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
    category: 'Compliance',
    targetRoles: ['Producer', 'ServiceProvider', 'Agronomist'],
  },
  {
    id: 'notif2',
    title: 'Olive Oil Subsidy Program',
    message: 'Applications for the 2024 Olive Oil Production Subsidy are now open. Deadline: March 15, 2024.',
    type: 'subsidy',
    priority: 'high',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    expirationDate: new Date('2024-03-15'),
    category: 'Financial',
    targetRoles: ['FieldOwner'],
  },
  {
    id: 'notif3',
    title: 'Annual Field Registration Deadline',
    message: 'All field owners must complete annual registration by February 28, 2024.',
    type: 'deadline',
    priority: 'high',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    expirationDate: new Date('2024-02-28'),
    category: 'Compliance',
    targetRoles: ['FieldOwner'],
  },
  {
    id: 'notif4',
    title: 'Weather Alert: Frost Warning',
    message: 'The National Weather Service has issued a frost warning for your region. Protect sensitive crops.',
    type: 'alert',
    priority: 'critical',
    date: new Date(Date.now() - 6 * 60 * 60 * 1000),
    expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    category: 'Weather',
    targetRoles: ['FieldOwner', 'Producer', 'Agronomist'],
  },
  {
    id: 'notif5',
    title: 'Agricultural Training Workshop',
    message: 'Free workshop on sustainable olive cultivation practices. Register by February 20.',
    type: 'training',
    priority: 'medium',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    expirationDate: new Date('2024-02-20'),
    category: 'Education',
    targetRoles: ['FieldOwner', 'Producer', 'Agronomist'],
  },
  {
    id: 'notif6',
    title: 'Worker Safety Standards Update',
    message: 'New safety standards for agricultural workers have been published. Review and implement by March 1.',
    type: 'regulation',
    priority: 'high',
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    expirationDate: new Date('2024-03-01'),
    category: 'Safety',
    targetRoles: ['Producer', 'ServiceProvider', 'Administrator'],
  },
  {
    id: 'notif7',
    title: 'Organic Certification Renewal',
    message: 'Organic certification renewals are due by March 31. Submit documentation early to avoid delays.',
    type: 'deadline',
    priority: 'medium',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    expirationDate: new Date('2024-03-31'),
    category: 'Certification',
    targetRoles: ['FieldOwner'],
  },
  {
    id: 'notif8',
    title: 'Data Protection Compliance',
    message: 'Platform must comply with new data protection regulations. System updates required.',
    type: 'regulation',
    priority: 'high',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    category: 'Compliance',
    targetRoles: ['Administrator'],
  },
];

const priorityOrder: Record<MinistryNotificationPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export interface MinistryNotificationService {
  getNotifications(userRole: string): Promise<MinistryNotification[]>;
  getUnreadCount(userRole: string): Promise<number>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userRole: string): Promise<void>;
  getUrgentNotifications(userRole: string): Promise<MinistryNotification[]>;
}

class MinistryNotificationServiceImpl implements MinistryNotificationService {
  private readIds: Set<string> = loadReadIds();

  private save() {
    saveReadIds(this.readIds);
  }

  async getNotifications(userRole: string): Promise<MinistryNotification[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));

    const now = new Date();
    return mockNotifications
      .filter((notif) => {
        if (notif.targetRoles && userRole && !notif.targetRoles.includes(userRole)) {
          return false;
        }
        if (notif.expirationDate && notif.expirationDate < now) {
          return false;
        }
        return true;
      })
      .map((notif) => ({
        ...notif,
        read: this.readIds.has(notif.id),
      }))
      .sort((a, b) => {
        const p = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        if (p !== 0) return p;
        return b.date.getTime() - a.date.getTime();
      });
  }

  async getUnreadCount(userRole: string): Promise<number> {
    const notifications = await this.getNotifications(userRole);
    return notifications.filter((n) => !this.readIds.has(n.id)).length;
  }

  async markAsRead(notificationId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    this.readIds.add(notificationId);
    this.save();
  }

  async markAllAsRead(userRole: string): Promise<void> {
    const notifications = await this.getNotifications(userRole);
    notifications.forEach((n) => this.readIds.add(n.id));
    this.save();
  }

  async getUrgentNotifications(userRole: string): Promise<MinistryNotification[]> {
    const notifications = await this.getNotifications(userRole);
    return notifications.filter((n) => (n.priority === 'high' || n.priority === 'critical') && !n.read);
  }
}

export const ministryNotificationService: MinistryNotificationService = new MinistryNotificationServiceImpl();

