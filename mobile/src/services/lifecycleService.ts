import {
  Lifecycle,
  mockLifecycles,
  getLifecyclesByRole,
  simulateDelay,
} from './mockDataService';

export { Lifecycle } from './mockDataService';

export const lifecycleService = {
  getLifecycle: async (fieldId: string): Promise<Lifecycle | null> => {
    await simulateDelay();
    const lifecycle = mockLifecycles.find(l => l.fieldId === fieldId);
    return lifecycle ? { ...lifecycle } : null;
  },

  getLifecycles: async (userId: string, userRole: string): Promise<Lifecycle[]> => {
    await simulateDelay();
    return getLifecyclesByRole(userId, userRole);
  },

  // Read-only - no update methods
};
