import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, mockTasks, getTasksByRole, simulateDelay, saveTasksToStorage, getPersistedTasks } from './mockDataService';

let persistedTasks: Task[] | null = null;

const loadPersistedTasks = async (): Promise<Task[]> => {
  if (persistedTasks) {
    return persistedTasks;
  }
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
    return persisted;
  }
  return mockTasks;
};

export const mockTaskService = {
  getAssignedTasks: async (userId: string, userRole: string): Promise<Task[]> => {
    await simulateDelay();
    const allTasks = await getTasks();
    return getTasksByRole(userId, userRole, allTasks);
  },

  getTask: async (id: string): Promise<Task> => {
    await simulateDelay();
    const allTasks = await getTasks();
    const task = allTasks.find(t => t.id === id);
    if (!task) {
      throw new Error('Task not found');
    }
    return { ...task };
  },

  getTasksByField: async (fieldId: string): Promise<Task[]> => {
    await simulateDelay();
    const allTasks = await getTasks();
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
      actualStart: status === 'in_progress' && !allTasks[taskIndex].actualStart ? now : allTasks[taskIndex].actualStart,
      actualEnd: status === 'completed' && !allTasks[taskIndex].actualEnd ? now : allTasks[taskIndex].actualEnd,
    };
    allTasks[taskIndex] = updatedTask;
    persistedTasks = allTasks;
    try {
      await saveTasksToStorage(allTasks);
    } catch (error) {
      console.error('Error saving task update:', error);
    }
    return { ...updatedTask };
  },

  addEvidence: async (taskId: string, photoUrl?: string, notes?: string): Promise<Task> => {
    await simulateDelay();
    const allTasks = await getTasks();
    const taskIndex = allTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }
    const evidence = { photoUrl, notes, timestamp: new Date().toISOString() };
    const updatedTask: Task = {
      ...allTasks[taskIndex],
      evidence: [...(allTasks[taskIndex].evidence || []), evidence],
      updatedAt: new Date().toISOString(),
    };
    allTasks[taskIndex] = updatedTask;
    persistedTasks = allTasks;
    try {
      await saveTasksToStorage(allTasks);
    } catch (error) {
      console.error('Error saving evidence:', error);
    }
    return { ...updatedTask };
  },

  createTask: async (data: {
    fieldId: string;
    type: string;
    title: string;
    description?: string;
    scheduledStart?: string;
    scheduledEnd?: string;
  }): Promise<Task> => {
    await simulateDelay();
    const allTasks = await getTasks();
    const newTask: Task = {
      id: `task_${Date.now()}`,
      fieldId: data.fieldId,
      type: data.type,
      title: data.title,
      description: data.description,
      status: 'pending',
      scheduledStart: data.scheduledStart,
      scheduledEnd: data.scheduledEnd,
      lifecycleYear: 'low',
      evidence: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    allTasks.push(newTask);
    persistedTasks = allTasks;
    return newTask;
  },

  assignTask: async (taskId: string, userId: string): Promise<Task> => {
    await simulateDelay();
    const allTasks = await getTasks();
    const idx = allTasks.findIndex(t => t.id === taskId);
    if (idx === -1) throw new Error('Task not found');
    allTasks[idx] = { ...allTasks[idx], assignedTo: userId, updatedAt: new Date().toISOString() };
    return allTasks[idx];
  },

  approveTask: async (taskId: string): Promise<Task> => {
    await simulateDelay();
    const allTasks = await getTasks();
    const idx = allTasks.findIndex(t => t.id === taskId);
    if (idx === -1) throw new Error('Task not found');
    allTasks[idx] = { ...allTasks[idx], approvalStatus: 'approved', updatedAt: new Date().toISOString() };
    return allTasks[idx];
  },

  rejectTask: async (taskId: string): Promise<Task> => {
    await simulateDelay();
    const allTasks = await getTasks();
    const idx = allTasks.findIndex(t => t.id === taskId);
    if (idx === -1) throw new Error('Task not found');
    allTasks[idx] = {
      ...allTasks[idx],
      approvalStatus: 'rejected',
      status: 'in_progress',
      updatedAt: new Date().toISOString(),
    };
    return allTasks[idx];
  },
};
