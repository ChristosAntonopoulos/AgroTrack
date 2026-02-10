import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats, DashboardStats } from '../services/mockDataService';

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
  
  // Track stats changes for debugging
  useEffect(() => {
    if (__DEV__) {
      console.log(`[useDashboardStats] Stats state changed:`, stats ? `present (${Object.keys(stats).length} keys)` : 'null');
      if (stats) {
        console.log(`[useDashboardStats] Stats keys:`, Object.keys(stats));
      }
    }
  }, [stats]);

  const loadStats = useCallback(async () => {
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const dashboardStats = getDashboardStats(user.id, user.role);
      
      if (__DEV__) {
        console.log(`[useDashboardStats] Loaded stats for role: ${user.role}`);
        console.log(`[useDashboardStats] Stats:`, dashboardStats);
        // DashboardStats should only have number values, but check for any string booleans
        Object.keys(dashboardStats).forEach(key => {
          const value = (dashboardStats as any)[key];
          if (typeof value === 'string' && (value === 'true' || value === 'false')) {
            console.warn(`[useDashboardStats] Found string boolean in stats.${key}: ${value}`);
          }
        });
      }
      
      // Set both stats and loading together - React will batch these
      // This ensures they update in the same render cycle
      setStats(dashboardStats);
      setLoading(false);
      
      if (__DEV__) {
        console.log('[useDashboardStats] Stats and loading state updated together');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard stats');
      setStats(null);
      setLoading(false);
      console.error('Error loading dashboard stats:', err);
    }
  }, [user]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refresh: loadStats,
  };
};
