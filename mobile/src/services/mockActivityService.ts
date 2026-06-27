import { Activity } from './activityService';
import { simulateDelay } from './mockDataService';

export const mockActivityService = {
  getActivities: async (_fieldId: string, _limit = 50): Promise<Activity[]> => {
    await simulateDelay();
    return [];
  },
};
