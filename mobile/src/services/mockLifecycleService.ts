import { Lifecycle, mockLifecycles, getLifecyclesByRole, simulateDelay } from './mockDataService';

export const mockLifecycleService = {
  getLifecycle: async (fieldId: string): Promise<Lifecycle | null> => {
    await simulateDelay();
    const lifecycle = mockLifecycles.find(l => l.fieldId === fieldId);
    return lifecycle ? { ...lifecycle } : null;
  },

  getLifecycles: async (userId: string, userRole: string): Promise<Lifecycle[]> => {
    await simulateDelay();
    return getLifecyclesByRole(userId, userRole);
  },

  initializeLifecycle: async (fieldId: string): Promise<Lifecycle> => {
    await simulateDelay();
    const existing = mockLifecycles.find(l => l.fieldId === fieldId);
    if (existing) return { ...existing };
    const created: Lifecycle = {
      id: `lc_${fieldId}`,
      fieldId,
      currentYear: 'low',
      currentStage: 'dormancy',
      cycleStartDate: new Date().toISOString(),
    };
    mockLifecycles.push(created);
    return { ...created };
  },

  advanceStage: async (fieldId: string): Promise<Lifecycle> => {
    await simulateDelay();
    const lifecycle = mockLifecycles.find(l => l.fieldId === fieldId);
    if (!lifecycle) throw new Error('Lifecycle not found');
    return { ...lifecycle };
  },

  revertStage: async (fieldId: string): Promise<Lifecycle> => {
    await simulateDelay();
    const lifecycle = mockLifecycles.find(l => l.fieldId === fieldId);
    if (!lifecycle) throw new Error('Lifecycle not found');
    return { ...lifecycle };
  },

  progressCycle: async (fieldId: string): Promise<Lifecycle> => {
    await simulateDelay();
    const lifecycle = mockLifecycles.find(l => l.fieldId === fieldId);
    if (!lifecycle) throw new Error('Lifecycle not found');
    return { ...lifecycle };
  },

  correctLifecycle: async (
    fieldId: string,
    payload: { currentYear?: string; currentStage?: string }
  ): Promise<Lifecycle> => {
    await simulateDelay();
    const lifecycle = mockLifecycles.find((l) => l.fieldId === fieldId);
    if (!lifecycle) throw new Error('Lifecycle not found');
    if (payload.currentYear) lifecycle.currentYear = payload.currentYear;
    if (payload.currentStage) lifecycle.currentStage = payload.currentStage;
    return { ...lifecycle };
  },
};
