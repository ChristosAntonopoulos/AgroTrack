import { Field, mockFields, getFieldsByRole, simulateDelay } from './mockDataService';

export const mockFieldService = {
  getFields: async (userId: string, userRole: string): Promise<Field[]> => {
    await simulateDelay();
    return getFieldsByRole(userId, userRole);
  },

  getField: async (id: string): Promise<Field> => {
    await simulateDelay();
    const field = mockFields.find(f => f.id === id);
    if (!field) {
      throw new Error('Field not found');
    }
    return { ...field };
  },

  createField: async (data: {
    name: string;
    area: number;
    variety?: string;
    treeAge?: number;
    groundType?: string;
    irrigationStatus?: boolean;
  }): Promise<Field> => {
    await simulateDelay();
    const newField: Field = {
      id: `field_${Date.now()}`,
      ownerId: 'mock-owner',
      name: data.name,
      area: data.area,
      variety: data.variety,
      treeAge: data.treeAge,
      groundType: data.groundType,
      irrigationStatus: data.irrigationStatus ?? false,
      currentLifecycleYear: 'low',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockFields.push(newField);
    return newField;
  },

  updateField: async (id: string, data: Partial<Field>): Promise<Field> => {
    await simulateDelay();
    const idx = mockFields.findIndex(f => f.id === id);
    if (idx === -1) throw new Error('Field not found');
    mockFields[idx] = { ...mockFields[idx], ...data, updatedAt: new Date().toISOString() };
    return mockFields[idx];
  },

  deleteField: async (id: string): Promise<void> => {
    await simulateDelay();
    const idx = mockFields.findIndex(f => f.id === id);
    if (idx !== -1) mockFields.splice(idx, 1);
  },

  getProducers: async (_fieldId: string): Promise<string[]> => [],
  assignProducer: async (): Promise<void> => { await simulateDelay(); },
  unassignProducer: async (): Promise<void> => { await simulateDelay(); },
};
