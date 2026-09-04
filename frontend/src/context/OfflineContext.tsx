import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { OfflineQueue } from '../utils/offlineQueue';
import { EntityCache } from '../utils/entityCache';
import { isDeviceOnline } from '../utils/networkStatus';

interface OfflineContextValue {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  isShowingCachedData: boolean;
  lastDropMessage: string | null;
  /** Bumps when reconnecting or after a successful queue flush — pages should refetch. */
  refreshGeneration: number;
  setShowingCachedData: (value: boolean) => void;
  syncNow: () => Promise<void>;
  clearDropMessage: () => void;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(() => isDeviceOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isShowingCachedData, setShowingCachedData] = useState(false);
  const [lastDropMessage, setLastDropMessage] = useState<string | null>(null);
  const [refreshGeneration, setRefreshGeneration] = useState(0);
  const wasOnlineRef = useRef(isDeviceOnline());

  const syncNow = useCallback(async () => {
    if (OfflineQueue.isSyncing()) return;
    setIsSyncing(true);
    try {
      const result = await OfflineQueue.syncPending();
      if (result.synced > 0) {
        setRefreshGeneration((g) => g + 1);
      }
    } finally {
      setIsSyncing(false);
      const count = await OfflineQueue.getCount();
      setPendingCount(count);
    }
  }, []);

  const handleCameOnline = useCallback(() => {
    setIsOnline(true);
    setShowingCachedData(false);
    setRefreshGeneration((g) => g + 1);
    syncNow().catch(console.error);
  }, [syncNow]);

  useEffect(() => {
    const unsubQueue = OfflineQueue.subscribe(setPendingCount);
    const unsubSuccess = OfflineQueue.onSyncSuccess((op, data) => {
      EntityCache.applySyncSuccess(op, data);
    });
    const unsubDrop = OfflineQueue.onSyncDrop((_op, reason) => {
      setLastDropMessage(reason);
    });

    const onOnline = () => {
      if (!wasOnlineRef.current) {
        wasOnlineRef.current = true;
        handleCameOnline();
      } else {
        setIsOnline(true);
        syncNow().catch(console.error);
      }
    };

    const onOffline = () => {
      wasOnlineRef.current = false;
      setIsOnline(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // App open while online: flush any pending mutations (pages load fresh themselves).
    if (isDeviceOnline()) {
      syncNow().catch(console.error);
    }

    return () => {
      unsubQueue();
      unsubSuccess();
      unsubDrop();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [handleCameOnline, syncNow]);

  const value = useMemo(
    () => ({
      isOnline,
      pendingCount,
      isSyncing,
      isShowingCachedData,
      lastDropMessage,
      refreshGeneration,
      setShowingCachedData,
      syncNow,
      clearDropMessage: () => setLastDropMessage(null),
    }),
    [
      isOnline,
      pendingCount,
      isSyncing,
      isShowingCachedData,
      lastDropMessage,
      refreshGeneration,
      syncNow,
    ]
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};

export const useOfflineMode = (): OfflineContextValue => {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    throw new Error('useOfflineMode must be used within OfflineProvider');
  }
  return ctx;
};
