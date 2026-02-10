import { Field, CreateFieldDto, UpdateFieldDto } from '../fieldService';
import { mockFields, mockTasks, simulateDelay } from './mockData';

let fields = [...mockFields];

// Helper to get current user from localStorage (mimicking auth context)
const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
  } catch {
    // Ignore
  }
  return null;
};

export const mockFieldService = {
  getFields: async (): Promise<Field[]> => {
    await simulateDelay();
    const user = getCurrentUser();
    if (!user) {
      return [];
    }

    // FieldOwners get their owned fields
    if (user.role === 'FieldOwner' || user.role === 'Administrator') {
      return fields.filter(f => f.ownerId === user.userId || f.ownerId === user.id);
    }
    
    // Producers get fields where they have assigned tasks
    if (user.role === 'Producer') {
      const userId = user.userId || user.id;
      const userTasks = mockTasks.filter(t => t.assignedTo === userId);
      const fieldIds = Array.from(new Set(userTasks.map(t => t.fieldId)));
      return fields.filter(f => fieldIds.includes(f.id));
    }

    // Default: return all fields (for Agronomist, etc.)
    return [...fields];
  },

  getField: async (id: string): Promise<Field> => {
    await simulateDelay();
    const field = fields.find(f => f.id === id);
    if (!field) {
      throw new Error('Field not found');
    }

    const user = getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check access: owner or has tasks in this field
    const userId = user.userId || user.id;
    const isOwner = field.ownerId === userId;
    const hasTasks = user.role === 'Producer' && mockTasks.some(t => t.fieldId === id && t.assignedTo === userId);
    
    if (!isOwner && !hasTasks && user.role !== 'Administrator' && user.role !== 'Agronomist') {
      throw new Error('You do not have access to this field.');
    }

    return { ...field };
  },

  createField: async (data: CreateFieldDto): Promise<Field> => {
    await simulateDelay();
    const user = getCurrentUser();
    const userId = user?.userId || user?.id || 'user1';
    
    const newField: Field = {
      id: `field${Date.now()}`,
      ownerId: userId, // Use current user as owner
      ...data,
      currentLifecycleYear: 'low',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fields.push(newField);
    return { ...newField };
  },

  updateField: async (id: string, data: UpdateFieldDto): Promise<Field> => {
    await simulateDelay();
    const index = fields.findIndex(f => f.id === id);
    if (index === -1) {
      throw new Error('Field not found');
    }
    fields[index] = {
      ...fields[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return { ...fields[index] };
  },

  deleteField: async (id: string): Promise<void> => {
    await simulateDelay();
    const index = fields.findIndex(f => f.id === id);
    if (index === -1) {
      throw new Error('Field not found');
    }
    fields.splice(index, 1);
  },
};
