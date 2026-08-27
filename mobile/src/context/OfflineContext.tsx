import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import NetInfo from '@react-native-community/netinfo';
import { OfflineQueue } from '../utils/offlineQueue';
import { EntityCache } from '../utils/entityCache';

interface OfflineContextValue {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  isShowingCachedData: boolean;
  lastDropMessage: string | null;
  /** Increments when a sync flush finishes with at least one success */
  syncGeneration: number;
  setShowingCachedData: (value: boolean) => void;
  syncNow: () => Promise<void>;
  clearDropMessage: () => void;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isShowingCachedData, setShowingCachedData] = useState(false);
  const [lastDropMessage, setLastDropMessage] = useState<string | null>(null);
  const [syncGeneration, setSyncGeneration] = useState(0);

  const syncNow = useCallback(async () => {
    if (OfflineQueue.isSyncing()) return;
    setIsSyncing(true);
    try {
      const result = await OfflineQueue.syncPending();
      if (result.synced > 0) {
        setSyncGeneration((g) => g + 1);
      }
    } finally {
      setIsSyncing(false);
      const count = await OfflineQueue.getCount();
      setPendingCount(count);
    }
  }, []);

  useEffect(() => {
    const unsubQueue = OfflineQueue.subscribe(setPendingCount);
    const unsubSuccess = OfflineQueue.onSyncSuccess((op, data) => {
      EntityCache.applySyncSuccess(op, data).catch(console.error);
    });
    const unsubDrop = OfflineQueue.onSyncDrop((_op, reason) => {
      setLastDropMessage(reason);
    });

    const unsubNet = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? true;
      setIsOnline(online);
      if (online) {
        setShowingCachedData(false);
        syncNow().catch(console.error);
      }
    });

    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected ?? true);
    });

    return () => {
      unsubQueue();
      unsubSuccess();
      unsubDrop();
      unsubNet();
    };
  }, [syncNow]);

  const value = useMemo(
    () => ({
      isOnline,
      pendingCount,
      isSyncing,
      isShowingCachedData,
      lastDropMessage,
      syncGeneration,
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
      syncGeneration,
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
