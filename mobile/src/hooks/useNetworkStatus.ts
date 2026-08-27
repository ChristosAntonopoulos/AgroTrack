import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { OfflineQueue } from '../utils/offlineQueue';

/** Low-level NetInfo hook. Prefer useOfflineMode from OfflineContext in UI. */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? true;
      setIsOnline(online);
      if (online) {
        OfflineQueue.syncPending().catch(console.error);
      }
    });
    return unsubscribe;
  }, []);

  return { isOnline };
};
