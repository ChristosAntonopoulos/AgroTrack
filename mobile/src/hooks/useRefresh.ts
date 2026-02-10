import { useState, useCallback } from 'react';

export interface UseRefreshResult {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

export const useRefresh = (
  refreshFn: () => Promise<void>
): UseRefreshResult => {
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshFn();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      // Ensure we always set a strict boolean
      setRefreshing(false);
    }
  }, [refreshFn]);

  // Always ensure refreshing is a strict boolean before returning
  return {
    refreshing: Boolean(refreshing),
    onRefresh,
  };
};
