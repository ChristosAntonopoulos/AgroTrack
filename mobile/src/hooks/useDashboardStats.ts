import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { DashboardStats } from '../services/mockDataService';
import { getDashboardService } from '../services/serviceFactory';

export interface UseDashboardStatsResult {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useDashboardStats = (): UseDashboardStatsResult => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const dashboardStats = await getDashboardService().computeStats(user.id, user.role);
      setStats(dashboardStats);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard stats');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, loading, error, refresh: loadStats };
};
