import {
  Field,
  CreateFieldDto,
  UpdateFieldDto,
  GeoJsonPolygon,
  ImportGreekCadastreFieldResponse,
  FieldAreaValidationResponse,
  ActivateFieldRequest,
  ActivateFieldResponse,
} from '../fieldService';
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
    const worksMyself = data.worksThisFieldMyself !== false;
    
    const newField: Field = {
      id: `field${Date.now()}`,
      ownerId: userId,
      ...data,
      cropType: data.cropType || 'Olive',
      status: data.status || 'Draft',
      currentLifecycleYear: 'low',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memberships: [
        {
          userId,
          displayName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Owner' : 'Owner',
          capacities: worksMyself ? ['own', 'work'] : ['own'],
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ],
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

  importGreekCadastre: async (kdFile: File, kfFile: File): Promise<ImportGreekCadastreFieldResponse> => {
    await simulateDelay();
    const created = await mockFieldService.createField({
      name: 'Olive Field - Mock Import',
      area: 127,
      cropType: 'Olive',
      irrigationStatus: false,
      status: 'NeedsBoundaryConfirmation',
      locationText: 'Mock cadastre location',
    });
    return {
      draftFieldId: created.id,
      suggestedName: created.name,
      greekCadastre: {
        kaek: '362621142088/0/0',
        normalizedKaek: '362621142088/0/0',
        officialAreaSqm: 127,
        source: 'UserUploadedPdf',
        verificationStatus: 'NeedsUserConfirmation',
      },
      warnings: ['Mock import — boundary must be drawn manually.'],
      missingRequiredConfirmation: ['Boundary', 'Crop details', 'User confirmation'],
      duplicateKaekFieldIds: [],
    };
  },

  updateBoundary: async (id: string, boundary: GeoJsonPolygon): Promise<Field> => {
    await simulateDelay();
    return mockFieldService.updateField(id, { boundary, appMeasuredAreaSqm: 500 } as UpdateFieldDto);
  },

  validateArea: async (id: string): Promise<FieldAreaValidationResponse> => {
    await simulateDelay();
    const field = await mockFieldService.getField(id);
    return {
      officialAreaSqm: field.greekCadastre?.officialAreaSqm,
      appMeasuredAreaSqm: field.appMeasuredAreaSqm,
      severity: 'Ok',
      message: 'Mock area validation',
      warnings: [],
    };
  },

  activateField: async (id: string, _request: ActivateFieldRequest): Promise<ActivateFieldResponse> => {
    await simulateDelay();
    const field = await mockFieldService.updateField(id, { status: 'Active' } as UpdateFieldDto);
    return { field: { ...field, status: 'Active' }, suggestLifecyclePlan: true, lifecycleInitialized: false };
  },
};
