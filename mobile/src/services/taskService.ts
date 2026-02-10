import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, mockTasks, getTasksByRole, simulateDelay, saveTasksToStorage, getPersistedTasks } from './mockDataService';

export { Task } from './mockDataService';

const STORAGE_KEY = '@olive_lifecycle_tasks';

// Load tasks on service initialization
let persistedTasks: Task[] | null = null;

const loadPersistedTasks = async (): Promise<Task[]> => {
  if (persistedTasks) {
    return persistedTasks;
  }
  
  // Use getPersistedTasks which already sanitizes AsyncStorage data
  const persisted = await getPersistedTasks();
  if (persisted) {
    persistedTasks = persisted;
    return persistedTasks;
  }
  
  return [];
};

const getTasks = async (): Promise<Task[]> => {
  const persisted = await loadPersistedTasks();
  if (persisted.length > 0) {
    // Data from AsyncStorage is already sanitized by getPersistedTasks
    return persisted;
  }
  // Mock data already has correct types, return directly
  return mockTasks;
};

export const taskService = {
  getAssignedTasks: async (userId: string, userRole: string): Promise<Task[]> => {
    await simulateDelay();
    const allTasks = await getTasks();
    // getTasks already returns correct types (sanitized if from storage, correct if mock)
    return getTasksByRole(userId, userRole, allTasks);
  },

  getTask: async (id: string): Promise<Task> => {
    await simulateDelay();
    const allTasks = await getTasks();
    const task = allTasks.find(t => t.id === id);
    if (!task) {
      throw new Error('Task not found');
    }
    // getTasks already returns correct types
    return { ...task };
  },

  getTasksByField: async (fieldId: string): Promise<Task[]> => {
    await simulateDelay();
    const allTasks = await getTasks();
    // getTasks already returns correct types
    return allTasks.filter(task => task.fieldId === fieldId);
  },

  updateTaskStatus: async (taskId: string, status: string): Promise<Task> => {
    await simulateDelay();
    
    const allTasks = await getTasks();
    const taskIndex = allTasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    const now = new Date().toISOString();
    const updatedTask: Task = {
      ...allTasks[taskIndex],
      status,
      updatedAt: now,
      // Set actualStart when moving to in_progress
      actualStart: status === 'in_progress' && !allTasks[taskIndex].actualStart 
        ? now 
        : allTasks[taskIndex].actualStart,
      // Set actualEnd when completing
      actualEnd: status === 'completed' && !allTasks[taskIndex].actualEnd
        ? now
        : allTasks[taskIndex].actualEnd,
    };

    allTasks[taskIndex] = updatedTask;
    persistedTasks = allTasks;
    
    // Persist to storage
    try {
      await saveTasksToStorage(allTasks);
    } catch (error) {
      console.error('Error saving task update:', error);
    }

    // Task data is already correct type, return directly
    return { ...updatedTask };
  },

  addEvidence: async (taskId: string, photoUrl?: string, notes?: string): Promise<Task> => {
    await simulateDelay();
    
    const allTasks = await getTasks();
    const taskIndex = allTasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    const evidence = {
      photoUrl,
      notes,
      timestamp: new Date().toISOString(),
    };

    const updatedTask: Task = {
      ...allTasks[taskIndex],
      evidence: [...(allTasks[taskIndex].evidence || []), evidence],
      updatedAt: new Date().toISOString(),
    };

    allTasks[taskIndex] = updatedTask;
    persistedTasks = allTasks;
    
    // Persist to storage
    try {
      await saveTasksToStorage(allTasks);
    } catch (error) {
      console.error('Error saving evidence:', error);
    }

    // Task data is already correct type, return directly
    return { ...updatedTask };
  },
};
