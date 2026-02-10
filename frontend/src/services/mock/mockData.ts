import { Field, CreateFieldDto, UpdateFieldDto } from '../fieldService';
import { Task, CreateTaskDto, Evidence } from '../taskService';
import { User } from '../userService';
import { Lifecycle } from '../lifecycleService';

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
