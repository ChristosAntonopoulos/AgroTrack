import { Activity } from './activityService';
import { simulateDelay } from './mockDataService';

const MOCK_ACTIVITIES: Omit<Activity, 'fieldId'>[] = [
  {
    id: 'mock-1',
    type: 'task_completed',
    message: 'Irrigation check completed',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'mock-2',
    type: 'task_updated',
    message: 'Pruning scheduled for next week',
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'mock-3',
    type: 'lifecycle',
    message: 'Lifecycle stage updated to high year',
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
];

export const mockActivityService = {
  getActivities: async (fieldId: string, limit = 50): Promise<Activity[]> => {
    await simulateDelay();
    return MOCK_ACTIVITIES.slice(0, limit).map(a => ({ ...a, fieldId }));
  },
};
