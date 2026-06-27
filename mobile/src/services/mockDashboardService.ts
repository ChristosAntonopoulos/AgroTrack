import { getDashboardStats, DashboardStats } from './mockDataService';

export const mockDashboardService = {
  computeStats: async (userId: string, userRole: string): Promise<DashboardStats> => {
    return getDashboardStats(userId, userRole);
  },
};
