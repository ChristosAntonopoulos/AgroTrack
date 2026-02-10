import AsyncStorage from '@react-native-async-storage/async-storage';
import { sanitizeTasks } from '../utils/dataSanitizer';

// Types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export interface Field {
  id: string;
  ownerId: string;
  name: string;
  latitude?: number;
  longitude?: number;
  area: number;
  variety?: string;
  treeAge?: number;
  groundType?: string;
  irrigationStatus: boolean;
  currentLifecycleYear: string;
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  photoUrl?: string;
  notes?: string;
  timestamp: string;
}

export interface Task {
  id: string;
  fieldId: string;
  type: string;
  title: string;
  description?: string;
  status: string;
  assignedTo?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  lifecycleYear: string;
  cost?: number;
  evidence: Evidence[];
  createdAt: string;
  updatedAt: string;
}

export interface Lifecycle {
  id: string;
  fieldId: string;
  currentYear: string;
  cycleStartDate: string;
  lastProgressionDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Helper function to add delay to simulate API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user1',
    email: 'owner@olivefarm.com',
    firstName: 'John',
    lastName: 'Smith',
    role: 'FieldOwner',
  },
  {
    id: 'user2',
    email: 'producer1@olivefarm.com',
    firstName: 'Maria',
    lastName: 'Garcia',
    role: 'Producer',
  },
  {
    id: 'user3',
    email: 'producer2@olivefarm.com',
    firstName: 'Ahmed',
    lastName: 'Hassan',
    role: 'Producer',
  },
  {
    id: 'user4',
    email: 'producer3@olivefarm.com',
    firstName: 'Sophie',
    lastName: 'Martin',
    role: 'Producer',
  },
  {
    id: 'user5',
    email: 'agronomist@olivefarm.com',
    firstName: 'Dr. James',
    lastName: 'Wilson',
    role: 'Agronomist',
  },
  {
    id: 'user6',
    email: 'admin@olivefarm.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'Administrator',
  },
  {
    id: 'user7',
    email: 'service@olivefarm.com',
    firstName: 'Service',
    lastName: 'Provider',
    role: 'ServiceProvider',
  },
];

// Mock Fields
const now = new Date();
const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

export const mockFields: Field[] = [
  {
    id: 'field1',
    ownerId: 'user1',
    name: 'North Olive Grove',
    latitude: 37.7749,
    longitude: -122.4194,
    area: 12.5,
    variety: 'Kalamata',
    treeAge: 15,
    groundType: 'Clay Loam',
    irrigationStatus: true,
    currentLifecycleYear: 'low',
    createdAt: oneYearAgo.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'field2',
    ownerId: 'user1',
    name: 'South Valley Fields',
    latitude: 37.7849,
    longitude: -122.4094,
    area: 8.3,
    variety: 'Arbequina',
    treeAge: 8,
    groundType: 'Sandy Loam',
    irrigationStatus: false,
    currentLifecycleYear: 'high',
    createdAt: oneYearAgo.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'field3',
    ownerId: 'user1',
    name: 'East Hill Plantation',
    latitude: 37.7649,
    longitude: -122.4294,
    area: 15.7,
    variety: 'Picual',
    treeAge: 20,
    groundType: 'Loam',
    irrigationStatus: true,
    currentLifecycleYear: 'low',
    createdAt: oneYearAgo.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'field4',
    ownerId: 'user1',
    name: 'West Slope Orchard',
    latitude: 37.7549,
    longitude: -122.4394,
    area: 6.2,
    variety: 'Koroneiki',
    treeAge: 12,
    groundType: 'Sandy',
    irrigationStatus: true,
    currentLifecycleYear: 'high',
    createdAt: oneYearAgo.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'field5',
    ownerId: 'user1',
    name: 'Central Meadow',
    latitude: 37.7949,
    longitude: -122.3994,
    area: 10.0,
    variety: 'Frantoio',
    treeAge: 18,
    groundType: 'Clay',
    irrigationStatus: false,
    currentLifecycleYear: 'low',
    createdAt: oneYearAgo.toISOString(),
    updatedAt: now.toISOString(),
  },
];

// Mock Tasks
const taskTypes = ['Pruning', 'Harvesting', 'Fertilization', 'Irrigation', 'Pest Control', 'Soil Testing'];
const taskStatuses = ['pending', 'in_progress', 'completed'];

function generateMockTasks(): Task[] {
  const tasks: Task[] = [];
  const today = new Date();
  
  mockFields.forEach((field, fieldIndex) => {
    // Generate 5-8 tasks per field
    const taskCount = 5 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < taskCount; i++) {
      const daysAgo = Math.floor(Math.random() * 90); // Tasks from last 90 days
      const scheduledStart = new Date(today);
      scheduledStart.setDate(scheduledStart.getDate() - daysAgo);
      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setDate(scheduledEnd.getDate() + Math.floor(Math.random() * 7) + 1);
      
      const status = taskStatuses[Math.floor(Math.random() * taskStatuses.length)];
      let actualStart: string | undefined;
      let actualEnd: string | undefined;
      
      if (status === 'in_progress' || status === 'completed') {
        actualStart = new Date(scheduledStart.getTime() + Math.random() * 86400000).toISOString();
      }
      if (status === 'completed') {
        actualEnd = new Date(scheduledEnd.getTime() - Math.random() * 86400000).toISOString();
      }
      
      const assignedTo = Math.random() > 0.3 ? mockUsers[1 + Math.floor(Math.random() * 3)].id : undefined;
      
      const task: Task = {
        id: `task${fieldIndex + 1}_${i + 1}`,
        fieldId: field.id,
        type: taskTypes[Math.floor(Math.random() * taskTypes.length)],
        title: `${taskTypes[Math.floor(Math.random() * taskTypes.length)]} - ${field.name}`,
        description: `Perform ${taskTypes[Math.floor(Math.random() * taskTypes.length)].toLowerCase()} on ${field.name}`,
        status,
        assignedTo,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        actualStart,
        actualEnd,
        lifecycleYear: field.currentLifecycleYear,
        cost: status === 'completed' ? Math.random() * 500 + 100 : undefined,
        evidence: status === 'completed' && Math.random() > 0.5 ? [
          {
            photoUrl: `https://picsum.photos/400/300?random=${fieldIndex}_${i}`,
            notes: 'Task completed successfully',
            timestamp: actualEnd || scheduledEnd.toISOString(),
          }
        ] : [],
        createdAt: scheduledStart.toISOString(),
        updatedAt: status === 'completed' ? (actualEnd || scheduledEnd.toISOString()) : scheduledStart.toISOString(),
      };
      
      tasks.push(task);
    }
  });
  
  return tasks;
}

export const mockTasks = generateMockTasks();

// Mock Lifecycles
export const mockLifecycles: Lifecycle[] = mockFields.map((field, index) => ({
  id: `lifecycle${index + 1}`,
  fieldId: field.id,
  currentYear: field.currentLifecycleYear,
  cycleStartDate: oneYearAgo.toISOString(),
  lastProgressionDate: index % 2 === 0 ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
  createdAt: oneYearAgo.toISOString(),
  updatedAt: now.toISOString(),
}));

// Helper to simulate API delay
export const simulateDelay = () => delay(100 + Math.random() * 400);

// Role-based filtering functions
export const getFieldsByRole = (userId: string, userRole: string): Field[] => {
  switch (userRole) {
    case 'FieldOwner':
      return mockFields.filter(field => field.ownerId === userId);
    case 'Producer':
      // Producers see fields where they have assigned tasks
      const producerTaskFieldIds = mockTasks
        .filter(task => task.assignedTo === userId)
        .map(task => task.fieldId);
      return mockFields.filter(field => producerTaskFieldIds.includes(field.id));
    case 'Agronomist':
    case 'Administrator':
      return [...mockFields];
    case 'ServiceProvider':
      // Service providers see fields where they have assigned tasks
      const serviceTaskFieldIds = mockTasks
        .filter(task => task.assignedTo === userId)
        .map(task => task.fieldId);
      return mockFields.filter(field => serviceTaskFieldIds.includes(field.id));
    default:
      return [];
  }
};

export const getTasksByRole = (userId: string, userRole: string, tasks: Task[] = mockTasks): Task[] => {
  switch (userRole) {
    case 'FieldOwner':
      // Field owners see tasks for their fields
      const ownerFieldIds = mockFields
        .filter(field => field.ownerId === userId)
        .map(field => field.id);
      return tasks.filter(task => ownerFieldIds.includes(task.fieldId));
    case 'Producer':
    case 'ServiceProvider':
      // Producers and service providers see only assigned tasks
      return tasks.filter(task => task.assignedTo === userId);
    case 'Agronomist':
    case 'Administrator':
      return [...tasks];
    default:
      return [];
  }
};

export const getLifecyclesByRole = (userId: string, userRole: string): Lifecycle[] => {
  const fieldIds = getFieldsByRole(userId, userRole).map(field => field.id);
  return mockLifecycles.filter(lifecycle => fieldIds.includes(lifecycle.fieldId));
};

// AsyncStorage persistence helpers
const TASKS_STORAGE_KEY = '@olive_lifecycle_tasks';

export const saveTasksToStorage = async (tasks: Task[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Error saving tasks to storage:', error);
    throw error;
  }
};

export const getPersistedTasks = async (): Promise<Task[] | null> => {
  try {
    const stored = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Sanitize tasks to ensure boolean values are strict booleans, not strings
      return sanitizeTasks(parsed);
    }
  } catch (error) {
    console.error('Error loading persisted tasks:', error);
  }
  return null;
};

export const clearPersistedTasks = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TASKS_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing persisted tasks:', error);
  }
};

// Task update helpers
export const updateTaskInMemory = (tasks: Task[], taskId: string, updates: Partial<Task>): Task[] => {
  const index = tasks.findIndex(t => t.id === taskId);
  if (index === -1) {
    return tasks;
  }
  
  const updated = [...tasks];
  updated[index] = { ...updated[index], ...updates };
  return updated;
};

export const addEvidenceToTask = (tasks: Task[], taskId: string, evidence: Evidence): Task[] => {
  const index = tasks.findIndex(t => t.id === taskId);
  if (index === -1) {
    return tasks;
  }
  
  const updated = [...tasks];
  updated[index] = {
    ...updated[index],
    evidence: [...(updated[index].evidence || []), evidence],
    updatedAt: new Date().toISOString(),
  };
  return updated;
};

// Dashboard statistics helpers
export interface DashboardStats {
  // Existing stats
  totalFields?: number;
  totalArea?: number;
  totalTasks?: number;
  pendingTasks?: number;
  inProgressTasks?: number;
  completedTasks?: number;
  completionRate?: number;
  upcomingTasks?: number;
  fieldsMonitored?: number;
  totalUsers?: number;
  
  // Weather-related stats
  weatherAlerts?: number;
  fieldsNeedingIrrigation?: number;
  workableDaysThisWeek?: number;
  
  // Ministry notifications
  unreadMinistryNotifications?: number;
  urgentNotifications?: number;
  notificationsThisWeek?: number;
  
  // Field Health (Agronomist)
  fieldsNeedingAttention?: number;
  averageHealthScore?: number;
  criticalFields?: number;
  
  // Service Provider
  activeServices?: number;
  pendingRequests?: number;
  monthlyRevenue?: number;
  serviceRating?: number;
  
  // GPS/Location
  fieldsWithGPS?: number;
  nearestField?: {
    id: string;
    name: string;
    distance: number; // in km
    coordinates: { lat: number; lng: number };
  };
  
  // Financial (FieldOwner)
  totalInvestment?: number;
  monthlyCosts?: number;
  budgetUtilization?: number;
  
  // Performance (Producer)
  tasksCompletedThisWeek?: number;
  averageCompletionTime?: number; // in hours
  qualityScore?: number; // 0-100
  onTimeCompletionRate?: number; // percentage
}

// Helper function to calculate distance between coordinates (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getDashboardStats = (userId: string, userRole: string, tasks: Task[] = mockTasks): DashboardStats => {
  const fields = getFieldsByRole(userId, userRole);
  const roleTasks = getTasksByRole(userId, userRole, tasks);
  
  const stats: DashboardStats = {};
  
  // Common calculations for all roles
  const fieldsWithGPS = fields.filter(f => f.latitude && f.longitude);
  stats.fieldsWithGPS = fieldsWithGPS.length;
  
  // Calculate nearest field (mock user location at 37.7749, -122.4194)
  if (fieldsWithGPS.length > 0) {
    const userLat = 37.7749;
    const userLng = -122.4194;
    let nearest = fieldsWithGPS[0];
    let minDistance = calculateDistance(userLat, userLng, nearest.latitude!, nearest.longitude!);
    
    fieldsWithGPS.forEach(field => {
      const distance = calculateDistance(userLat, userLng, field.latitude!, field.longitude!);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = field;
      }
    });
    
    stats.nearestField = {
      id: nearest.id,
      name: nearest.name,
      distance: Math.round(minDistance * 10) / 10,
      coordinates: { lat: nearest.latitude!, lng: nearest.longitude! },
    };
  }
  
  // Mock ministry notification counts (will be replaced by actual service)
  stats.unreadMinistryNotifications = Math.floor(Math.random() * 5);
  stats.urgentNotifications = Math.floor(Math.random() * 2);
  stats.notificationsThisWeek = Math.floor(Math.random() * 10) + 5;
  
  // Mock weather stats
  stats.weatherAlerts = Math.floor(Math.random() * 3);
  stats.workableDaysThisWeek = Math.floor(Math.random() * 3) + 4;
  
  switch (userRole) {
    case 'FieldOwner':
      stats.totalFields = fields.length;
      stats.totalArea = fields.reduce((sum, field) => sum + field.area, 0);
      stats.totalTasks = roleTasks.length;
      stats.pendingTasks = roleTasks.filter(t => t.status === 'pending').length;
      stats.inProgressTasks = roleTasks.filter(t => t.status === 'in_progress').length;
      stats.completedTasks = roleTasks.filter(t => t.status === 'completed').length;
      stats.completionRate = stats.totalTasks > 0 
        ? Math.round((stats.completedTasks! / stats.totalTasks) * 100) 
        : 0;
      
      // Financial metrics
      stats.totalInvestment = Math.round(fields.reduce((sum, field) => sum + field.area * 5000, 0));
      stats.monthlyCosts = Math.round(roleTasks.reduce((sum, task) => sum + (task.cost || 0), 0));
      stats.budgetUtilization = stats.totalInvestment > 0
        ? Math.round((stats.monthlyCosts! / (stats.totalInvestment! / 12)) * 100)
        : 0;
      
      // Fields needing irrigation (mock - based on irrigation status)
      stats.fieldsNeedingIrrigation = fields.filter(f => !f.irrigationStatus && f.currentLifecycleYear === 'high').length;
      break;
      
    case 'Producer':
      stats.totalTasks = roleTasks.length;
      stats.pendingTasks = roleTasks.filter(t => t.status === 'pending').length;
      stats.inProgressTasks = roleTasks.filter(t => t.status === 'in_progress').length;
      stats.completedTasks = roleTasks.filter(t => t.status === 'completed').length;
      stats.completionRate = stats.totalTasks > 0 
        ? Math.round((stats.completedTasks! / stats.totalTasks) * 100) 
        : 0;
      
      // Upcoming tasks (scheduled in next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      stats.upcomingTasks = roleTasks.filter(t => {
        if (!t.scheduledStart) return false;
        const scheduled = new Date(t.scheduledStart);
        return scheduled <= nextWeek && scheduled >= new Date() && t.status === 'pending';
      }).length;
      
      // Performance metrics
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const completedThisWeek = roleTasks.filter(t => 
        t.status === 'completed' && t.actualEnd && new Date(t.actualEnd) >= oneWeekAgo
      );
      stats.tasksCompletedThisWeek = completedThisWeek.length;
      
      // Calculate average completion time (mock calculation)
      const tasksWithTime = completedThisWeek.filter(t => t.actualStart && t.actualEnd);
      if (tasksWithTime.length > 0) {
        const totalHours = tasksWithTime.reduce((sum, t) => {
          const start = new Date(t.actualStart!);
          const end = new Date(t.actualEnd!);
          return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }, 0);
        stats.averageCompletionTime = Math.round((totalHours / tasksWithTime.length) * 10) / 10;
      } else {
        stats.averageCompletionTime = 4.5; // Default mock value
      }
      
      // Quality score and on-time completion (mock)
      stats.qualityScore = Math.floor(Math.random() * 20) + 80; // 80-100
      stats.onTimeCompletionRate = Math.floor(Math.random() * 20) + 75; // 75-95
      break;
      
    case 'ServiceProvider':
      stats.totalTasks = roleTasks.length;
      stats.pendingTasks = roleTasks.filter(t => t.status === 'pending').length;
      stats.inProgressTasks = roleTasks.filter(t => t.status === 'in_progress').length;
      stats.completedTasks = roleTasks.filter(t => t.status === 'completed').length;
      stats.completionRate = stats.totalTasks > 0 
        ? Math.round((stats.completedTasks! / stats.totalTasks) * 100) 
        : 0;
      
      // Upcoming tasks
      const nextWeekSP = new Date();
      nextWeekSP.setDate(nextWeekSP.getDate() + 7);
      stats.upcomingTasks = roleTasks.filter(t => {
        if (!t.scheduledStart) return false;
        const scheduled = new Date(t.scheduledStart);
        return scheduled <= nextWeekSP && scheduled >= new Date() && t.status === 'pending';
      }).length;
      
      // Service provider metrics
      stats.activeServices = fields.length; // Fields being serviced
      stats.pendingRequests = Math.floor(Math.random() * 5);
      stats.monthlyRevenue = Math.round(roleTasks.reduce((sum, task) => sum + (task.cost || 0), 0));
      stats.serviceRating = Math.floor(Math.random() * 10) + 40; // 4.0-5.0 (scaled to 40-50)
      break;
      
    case 'Agronomist':
      stats.fieldsMonitored = fields.length;
      stats.totalTasks = roleTasks.length;
      stats.pendingTasks = roleTasks.filter(t => t.status === 'pending').length;
      stats.inProgressTasks = roleTasks.filter(t => t.status === 'in_progress').length;
      stats.completedTasks = roleTasks.filter(t => t.status === 'completed').length;
      
      // Field health metrics
      stats.fieldsNeedingAttention = Math.floor(fields.length * 0.3); // 30% need attention
      stats.averageHealthScore = Math.floor(Math.random() * 20) + 70; // 70-90
      stats.criticalFields = Math.floor(fields.length * 0.1); // 10% critical
      break;
      
    case 'Administrator':
      stats.totalFields = mockFields.length;
      stats.totalArea = mockFields.reduce((sum, field) => sum + field.area, 0);
      stats.totalTasks = tasks.length;
      stats.totalUsers = mockUsers.length;
      stats.pendingTasks = tasks.filter(t => t.status === 'pending').length;
      stats.inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
      stats.completedTasks = tasks.filter(t => t.status === 'completed').length;
      break;
  }
  
  return stats;
};
