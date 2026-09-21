import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { inAppMessageService, InAppMessage } from '../services/inAppCampaignService';
import InAppMessageHost from '../components/InAppMessages/InAppMessageHost';

type InAppMessageContextValue = {
  openCampaign: (campaignId: string) => void;
  refreshPending: () => Promise<void>;
  refreshInboxSignal: number;
};

const InAppMessageContext = createContextSafe();

function createContextSafe() {
  return React.createContext<InAppMessageContextValue | undefined>(undefined);
}

export const InAppMessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [active, setActive] = useState<InAppMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshInboxSignal, setRefreshInboxSignal] = useState(0);
  const activeRef = useRef<InAppMessage | null>(null);
  activeRef.current = active;

  const bumpInbox = useCallback(() => {
    setRefreshInboxSignal((n) => n + 1);
  }, []);

  const openCampaign = useCallback(async (campaignId: string) => {
    setLoading(true);
    try {
      const message = await inAppMessageService.getMessage(campaignId);
      setActive(message);
      void inAppMessageService.markSeen(campaignId).catch(() => undefined);
    } catch {
      setActive(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPending = useCallback(async () => {
    if (!isAuthenticated) {
      setActive(null);
      return;
    }
    try {
      const pending = await inAppMessageService.getPendingModals();
      if (pending.length === 0) return;
      if (activeRef.current) return;
      setActive(pending[0]);
      void inAppMessageService.markSeen(pending[0].id).catch(() => undefined);
    } catch {
      // Modals are optional when the API is offline.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setActive(null);
      return;
    }
    void refreshPending();
    const timer = window.setInterval(() => {
      void refreshPending();
    }, 60000);
    return () => window.clearInterval(timer);
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
        loading={loading}
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
  const ctx = React.useContext(InAppMessageContext);
  if (!ctx) {
    throw new Error('useInAppMessages must be used within InAppMessageProvider');
  }
  return ctx;
};
