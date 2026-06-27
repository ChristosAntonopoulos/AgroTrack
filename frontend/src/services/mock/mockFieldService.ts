import { Field, CreateFieldDto, UpdateFieldDto } from '../fieldService';
import { simulateDelay } from './mockData';
import { demoStore } from '../demo/demoStore';
import { DEMO_OWNER_ID } from '../demo/demoSeedGenerator';

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
    demoStore.ensureSeeded();
    const fields = demoStore.getFields();
    const tasks = demoStore.getTasks();
    const assignments = demoStore.getAssignments();
    const user = getCurrentUser();
    if (!user) {
      return [];
    }

    // FieldOwners get their owned fields
    if (user.role === 'FieldOwner' || user.role === 'Administrator') {
      return fields.filter(f => f.ownerId === user.userId || f.ownerId === user.id);
    }
    
    // Producers get fields where they are assigned (or have assigned tasks)
    if (user.role === 'Producer') {
      const userId = user.userId || user.id;
      const assignedFieldIds = Object.entries(assignments)
        .filter(([, producerIds]) => producerIds.includes(userId))
        .map(([fieldId]) => fieldId);

      const taskFieldIds = Array.from(new Set(tasks.filter(t => t.assignedTo === userId).map(t => t.fieldId)));
      const fieldIds = Array.from(new Set([...assignedFieldIds, ...taskFieldIds]));
      return fields.filter(f => fieldIds.includes(f.id));
    }

    // Default: return all fields (for Agronomist, etc.)
    return [...fields];
  },

  getField: async (id: string): Promise<Field> => {
    await simulateDelay();
    demoStore.ensureSeeded();
    const fields = demoStore.getFields();
    const tasks = demoStore.getTasks();
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
    const hasTasks = user.role === 'Producer' && tasks.some(t => t.fieldId === id && t.assignedTo === userId);
    
    if (!isOwner && !hasTasks && user.role !== 'Administrator' && user.role !== 'Agronomist') {
      throw new Error('You do not have access to this field.');
    }

    return { ...field };
  },

  createField: async (data: CreateFieldDto): Promise<Field> => {
    await simulateDelay();
    demoStore.ensureSeeded();
    const user = getCurrentUser();
    const userId = user?.userId || user?.id || DEMO_OWNER_ID;
    
    const newField: Field = {
      id: `field${Date.now()}`,
      ownerId: userId, // Use current user as owner
      ...data,
      currentLifecycleYear: 'low',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    demoStore.setFields([...demoStore.getFields(), newField]);
    return { ...newField };
  },

  updateField: async (id: string, data: UpdateFieldDto): Promise<Field> => {
    await simulateDelay();
    const updated = demoStore.updateField(id, data);
    return { ...updated };
  },

  deleteField: async (id: string): Promise<void> => {
    await simulateDelay();
    demoStore.ensureSeeded();
    const fields = demoStore.getFields();
    const index = fields.findIndex(f => f.id === id);
    if (index === -1) {
      throw new Error('Field not found');
    }
    const next = [...fields];
    next.splice(index, 1);
    demoStore.setFields(next);
  },

  getAssignedProducers: async (fieldId: string): Promise<string[]> => {
    await simulateDelay();
    demoStore.ensureSeeded();
    const assignments = demoStore.getAssignments();
    return assignments[fieldId] || [];
  },

  assignProducer: async (fieldId: string, producerId: string): Promise<void> => {
    await simulateDelay();
    demoStore.ensureSeeded();
    demoStore.assignProducerToField(fieldId, producerId);
    demoStore.addEvent({
      type: 'producer_assigned',
      timestamp: new Date().toISOString(),
      fieldId,
      actorUserId: DEMO_OWNER_ID,
      message: `Producer assigned to field: ${producerId}`,
    });
  },

  unassignProducer: async (fieldId: string, producerId: string): Promise<void> => {
    await simulateDelay();
    demoStore.ensureSeeded();
    demoStore.unassignProducerFromField(fieldId, producerId);
    demoStore.addEvent({
      type: 'producer_unassigned',
      timestamp: new Date().toISOString(),
      fieldId,
      actorUserId: DEMO_OWNER_ID,
      message: `Producer removed from field: ${producerId}`,
    });
  },
};
