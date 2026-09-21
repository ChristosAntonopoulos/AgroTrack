import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { inAppMessageService, InAppMessage } from '../services/inAppCampaignService';
import InAppMessageHost from '../components/inApp/InAppMessageHost';

type InAppMessageContextValue = {
  openCampaign: (campaignId: string) => void;
  refreshPending: () => Promise<void>;
  refreshInboxSignal: number;
};

const InAppMessageContext = createContext<InAppMessageContextValue | undefined>(undefined);

export const InAppMessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [active, setActive] = useState<InAppMessage | null>(null);
  const [refreshInboxSignal, setRefreshInboxSignal] = useState(0);
  const activeRef = useRef<InAppMessage | null>(null);
  activeRef.current = active;

  const bumpInbox = useCallback(() => {
    setRefreshInboxSignal((n) => n + 1);
  }, []);

  const openCampaign = useCallback(async (campaignId: string) => {
    try {
      const message = await inAppMessageService.getMessage(campaignId);
      setActive(message);
      void inAppMessageService.markSeen(campaignId).catch(() => undefined);
    } catch {
      setActive(null);
    }
  }, []);

  const refreshPending = useCallback(async () => {
    if (!isAuthenticated) {
      setActive(null);
      return;
    }
    try {
      const pending = await inAppMessageService.getPendingModals();
      if (pending.length === 0 || activeRef.current) return;
      setActive(pending[0]);
      void inAppMessageService.markSeen(pending[0].id).catch(() => undefined);
    } catch {
      // Optional when offline.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setActive(null);
      return;
    }
    void refreshPending();
    const timer = setInterval(() => {
      void refreshPending();
    }, 60000);
    return () => clearInterval(timer);
  }, [isAuthenticated, refreshPending]);

  const close = useCallback(() => {
    setActive(null);
    bumpInbox();
  }, [bumpInbox]);

  const value = useMemo(
    () => ({
      openCampaign: (id: string) => {
        void openCampaign(id);
      },
      refreshPending,
      refreshInboxSignal,
    }),
    [openCampaign, refreshPending, refreshInboxSignal]
  );

  return (
    <InAppMessageContext.Provider value={value}>
      {children}
      <InAppMessageHost
        message={active}
        onClose={close}
        onUpdated={(next) => {
          setActive(next);
          bumpInbox();
        }}
      />
    </InAppMessageContext.Provider>
  );
};

export const useInAppMessages = () => {
  const ctx = useContext(InAppMessageContext);
  if (!ctx) {
    throw new Error('useInAppMessages must be used within InAppMessageProvider');
  }
  return ctx;
};

export const useInAppMessagesOptional = () => useContext(InAppMessageContext);
