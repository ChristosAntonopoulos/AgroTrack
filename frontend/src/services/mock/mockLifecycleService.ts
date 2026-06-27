import { Lifecycle } from '../lifecycleService';
import { mockLifecycles, simulateDelay } from './mockData';

let lifecycles = [...mockLifecycles];

export const mockLifecycleService = {
  getLifecycle: async (fieldId: string): Promise<Lifecycle | null> => {
    await simulateDelay();
    const lifecycle = lifecycles.find(l => l.fieldId === fieldId);
    return lifecycle ? { ...lifecycle } : null;
  },

  initializeLifecycle: async (fieldId: string): Promise<Lifecycle> => {
    await simulateDelay();
    const existing = lifecycles.find(l => l.fieldId === fieldId);
    if (existing) {
      return { ...existing };
    }
    
    const newLifecycle: Lifecycle = {
      id: `lifecycle${Date.now()}`,
      fieldId,
      currentYear: 'low',
      cycleStartDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    lifecycles.push(newLifecycle);
    return { ...newLifecycle };
  },

  progressCycle: async (fieldId: string): Promise<Lifecycle> => {
    await simulateDelay();
    const index = lifecycles.findIndex(l => l.fieldId === fieldId);
    if (index === -1) {
      throw new Error('Lifecycle not found');
    }
    
    lifecycles[index] = {
      ...lifecycles[index],
      currentYear: lifecycles[index].currentYear === 'low' ? 'high' : 'low',
      lastProgressionDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    return { ...lifecycles[index] };
  },

  advanceStage: async (fieldId: string): Promise<Lifecycle> => {
    await simulateDelay();
    const stages = ['dormancy', 'bud_break', 'flowering', 'fruit_set', 'fruit_growth', 'harvest'];
    const index = lifecycles.findIndex(l => l.fieldId === fieldId);
    if (index === -1) throw new Error('Lifecycle not found');
    const current = lifecycles[index].currentStage || 'dormancy';
    const stageIndex = stages.indexOf(current);
    if (stageIndex >= stages.length - 1) throw new Error('Already at final stage');
    lifecycles[index] = { ...lifecycles[index], currentStage: stages[stageIndex + 1], updatedAt: new Date().toISOString() };
    return { ...lifecycles[index] };
  },

  revertStage: async (fieldId: string): Promise<Lifecycle> => {
    await simulateDelay();
    const stages = ['dormancy', 'bud_break', 'flowering', 'fruit_set', 'fruit_growth', 'harvest'];
    const index = lifecycles.findIndex(l => l.fieldId === fieldId);
    if (index === -1) throw new Error('Lifecycle not found');
    const current = lifecycles[index].currentStage || 'dormancy';
    const stageIndex = stages.indexOf(current);
    if (stageIndex <= 0) throw new Error('Already at first stage');
    lifecycles[index] = { ...lifecycles[index], currentStage: stages[stageIndex - 1], updatedAt: new Date().toISOString() };
    return { ...lifecycles[index] };
  },
};
