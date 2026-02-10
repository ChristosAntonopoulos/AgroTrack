// Ministry Notification Service - Provides ministry notifications filtered by role
// Currently uses mock data, structured for future backend API integration

export interface MinistryNotification {
  id: string;
  title: string;
  message: string;
  type: 'regulation' | 'subsidy' | 'deadline' | 'alert' | 'training';
  priority: 'high' | 'medium' | 'low';
  date: Date;
  expirationDate?: Date;
  read: boolean;
  actionUrl?: string;
  category: string;
  targetRoles?: string[]; // Which roles should see this
}

// Mock notifications data
const mockNotifications: MinistryNotification[] = [
  {
    id: 'notif1',
    title: 'New Pesticide Regulations',
    message: 'The Ministry of Agriculture has updated regulations regarding pesticide usage. All producers must complete certification by end of month.',
    type: 'regulation',
    priority: 'high',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    expirationDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
    read: false,
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
    read: false,
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
    read: false,
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
    read: false,
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
    read: true,
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
    read: false,
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
    read: false,
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
    read: false,
    category: 'Compliance',
    targetRoles: ['Administrator'],
  },
];

export interface MinistryNotificationService {
  getNotifications(userRole: string): Promise<MinistryNotification[]>;
  getUnreadCount(userRole: string): Promise<number>;
  markAsRead(notificationId: string): Promise<void>;
  getUrgentNotifications(userRole: string): Promise<MinistryNotification[]>;
}

class MinistryNotificationServiceImpl implements MinistryNotificationService {
  private notifications: MinistryNotification[] = [...mockNotifications];
  private readIds: Set<string> = new Set();

  async getNotifications(userRole: string): Promise<MinistryNotification[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Filter by role and expiration
    const now = new Date();
    return this.notifications
      .filter(notif => {
        // Check if notification targets this role
        if (notif.targetRoles && !notif.targetRoles.includes(userRole)) {
          return false;
        }
        
        // Check if expired
        if (notif.expirationDate && notif.expirationDate < now) {
          return false;
        }
        
        return true;
      })
      .map(notif => ({
        ...notif,
        read: this.readIds.has(notif.id),
      }))
      .sort((a, b) => {
        // Sort by priority (critical > high > medium > low)
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by date (newest first)
        return b.date.getTime() - a.date.getTime();
      });
  }

  async getUnreadCount(userRole: string): Promise<number> {
    const notifications = await this.getNotifications(userRole);
    return notifications.filter(n => !this.readIds.has(n.id)).length;
  }

  async markAsRead(notificationId: string): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    this.readIds.add(notificationId);
  }

  async getUrgentNotifications(userRole: string): Promise<MinistryNotification[]> {
    const notifications = await this.getNotifications(userRole);
    return notifications.filter(n => 
      (n.priority === 'high' || n.priority === 'critical') && 
      !this.readIds.has(n.id)
    );
  }
}

// Export singleton instance
export const ministryNotificationService: MinistryNotificationService = new MinistryNotificationServiceImpl();

// Future: Replace with real API implementation
// export const ministryNotificationService: MinistryNotificationService = new BackendNotificationService(API_URL);
