import { Task, CreateTaskDto, Evidence } from '../taskService';
import { mockTasks, simulateDelay } from './mockData';

let tasks = [...mockTasks];

export const mockTaskService = {
  getTasks: async (fieldId?: string, assignedTo?: string): Promise<Task[]> => {
    await simulateDelay();
    let filtered = [...tasks];
    
    if (fieldId) {
      filtered = filtered.filter(t => t.fieldId === fieldId);
    }
    if (assignedTo) {
      filtered = filtered.filter(t => t.assignedTo === assignedTo);
    }
    
    return filtered;
  },

  getTask: async (id: string): Promise<Task> => {
    await simulateDelay();
    const task = tasks.find(t => t.id === id);
    if (!task) {
      throw new Error('Task not found');
    }
    return { ...task };
  },

  createTask: async (data: CreateTaskDto): Promise<Task> => {
    await simulateDelay();
    const newTask: Task = {
      id: `task${Date.now()}`,
      ...data,
      status: 'pending',
      evidence: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasks.push(newTask);
    return { ...newTask };
  },

  updateTaskStatus: async (id: string, status: string): Promise<Task> => {
    await simulateDelay();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('Task not found');
    }
    
    const now = new Date().toISOString();
    if (status === 'in_progress' && !tasks[index].actualStart) {
      tasks[index].actualStart = now;
    }
    if (status === 'completed' && !tasks[index].actualEnd) {
      tasks[index].actualEnd = now;
    }
    
    tasks[index] = {
      ...tasks[index],
      status,
      updatedAt: now,
    };
    
    return { ...tasks[index] };
  },

  addEvidence: async (id: string, photoUrl?: string, notes?: string): Promise<Task> => {
    await simulateDelay();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('Task not found');
    }
    
    const evidence: Evidence = {
      photoUrl,
      notes,
      timestamp: new Date().toISOString(),
    };
    
    tasks[index] = {
      ...tasks[index],
      evidence: [...(tasks[index].evidence || []), evidence],
      updatedAt: new Date().toISOString(),
    };
    
    return { ...tasks[index] };
  },

  assignTask: async (id: string, assignedTo: string): Promise<Task> => {
    await simulateDelay();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('Task not found');
    }
    
    tasks[index] = {
      ...tasks[index],
      assignedTo,
      updatedAt: new Date().toISOString(),
    };
    
    return { ...tasks[index] };
  },
};
