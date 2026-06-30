import { Field, GeoJsonPolygon, CreateFieldDto, ActivateFieldRequest, ActivateFieldResponse } from './fieldService';
import { mockFields, getFieldsByRole, simulateDelay } from './mockDataService';
import { estimatePolygonAreaSqm } from '../utils/polygonArea';

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

  createField: async (data: CreateFieldDto): Promise<Field> => {
    await simulateDelay();
    const newField: Field = {
      id: `field_${Date.now()}`,
      ownerId: 'mock-owner',
      name: data.name,
      area: data.area,
      cropType: data.cropType,
      locationText: data.locationText,
      variety: data.variety,
      treeAge: data.treeAge,
      treeCount: data.treeCount,
      groundType: data.groundType || data.soilType,
      soilType: data.soilType,
      irrigationStatus: data.irrigationStatus ?? false,
      irrigationType: data.irrigationType,
      slope: data.slope,
      accessNotes: data.accessNotes,
      status: data.status || 'Draft',
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

  updateBoundary: async (id: string, boundary: GeoJsonPolygon): Promise<Field> => {
    await simulateDelay();
    const idx = mockFields.findIndex(f => f.id === id);
    if (idx === -1) throw new Error('Field not found');
    const ring = boundary.coordinates?.[0] ?? [];
    const sqm = ring.length >= 3 ? Math.round(estimatePolygonAreaSqm(ring)) : undefined;
    mockFields[idx] = {
      ...mockFields[idx],
      boundary,
      appMeasuredAreaSqm: sqm,
      area: sqm ?? mockFields[idx].area,
      updatedAt: new Date().toISOString(),
    };
    return mockFields[idx];
  },

  activateField: async (id: string, _request: ActivateFieldRequest): Promise<ActivateFieldResponse> => {
    await simulateDelay();
    const idx = mockFields.findIndex(f => f.id === id);
    if (idx === -1) throw new Error('Field not found');
    mockFields[idx] = {
      ...mockFields[idx],
      status: 'Active',
      updatedAt: new Date().toISOString(),
    };
    return {
      field: mockFields[idx],
      suggestLifecyclePlan: true,
      lifecycleInitialized: false,
    };
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
