import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { POST_PURCHASE_REFRESH } from '../config/billingConfig';
import { revenueCatWebAdapter } from '../billing/revenueCatWebAdapter';
import type { BillingAdapter } from '../billing/types';
import {
  ClientSubscriptionHint,
  SubscriptionSnapshot,
  normalizeSnapshot,
} from '../billing/subscriptionModel';
import { subscriptionService } from '../services/subscriptionService';

export type PaywallSource =
  | 'add_field'
  | 'field_limit'
  | 'field_limit_error'
  | 'settings'
  | 'landing'
  | 'read_only_notice'
  | 'readonly_field'
  | 'billing_recovery';

export type PaywallIntent = 'add_field' | 'upgrade' | 'pro_limit' | 'settings' | 'readonly' | 'generic';

export type PaywallRequest = {
  source: PaywallSource;
  intent?: PaywallIntent;
  returnAction?: (() => void) | null;
};

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type SubscriptionContextValue = {
  snapshot: SubscriptionSnapshot | null;
  isLoading: boolean;
  loadState: LoadState;
  isStale: boolean;
  error: string | null;
  billing: BillingAdapter;
  refresh: (hint?: ClientSubscriptionHint | null) => Promise<SubscriptionSnapshot | null>;
  ensureFresh: () => Promise<SubscriptionSnapshot | null>;
  applySnapshot: (snapshot: SubscriptionSnapshot) => void;
  syncAfterPurchase: (hint: ClientSubscriptionHint) => Promise<SubscriptionSnapshot | null>;
  paywall: PaywallRequest | null;
  showUpgradePaywall: (request: PaywallRequest) => void;
  closePaywall: () => void;
  writableSelectionOpen: boolean;
  openWritableSelection: () => void;
  closeWritableSelection: () => void;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export const SubscriptionProvider: React.FC<{
  children: ReactNode;
  billing?: BillingAdapter;
}> = ({ children, billing = revenueCatWebAdapter }) => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.userId ?? null;

  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number>(0);
  const [paywall, setPaywall] = useState<PaywallRequest | null>(null);
  const [writableSelectionOpen, setWritableSelectionOpen] = useState(false);
  const inFlightRef = useRef<Promise<SubscriptionSnapshot | null> | null>(null);

  const applySnapshot = useCallback((next: SubscriptionSnapshot) => {
    setSnapshot(next);
    setFetchedAt(Date.now());
    setLoadState('ready');
    setError(null);
  }, []);

  const refresh = useCallback(
    async (hint?: ClientSubscriptionHint | null) => {
      if (!isAuthenticated || !userId) {
        setSnapshot(null);
        setLoadState('idle');
        return null;
      }

      if (inFlightRef.current && !hint) {
        return inFlightRef.current;
      }

      const run = (async () => {
        setLoadState((prev) => (prev === 'ready' ? prev : 'loading'));
        setError(null);
        try {
          await billing.identify(userId, user?.email);
          const next = hint
            ? await subscriptionService.refresh(hint)
            : await subscriptionService.getSubscription();
          applySnapshot(next);
          return next;
        } catch (err: any) {
          setError(err?.message || 'subscription_load_failed');
          setLoadState((prev) => (prev === 'ready' ? prev : 'error'));
          return snapshot;
        } finally {
          inFlightRef.current = null;
        }
      })();

      inFlightRef.current = run;
      return run;
    },
    [applySnapshot, billing, isAuthenticated, snapshot, user?.email, userId]
  );

  const ensureFresh = useCallback(async () => {
    if (snapshot && Date.now() - fetchedAt < 15_000) {
      return snapshot;
    }
    return refresh();
  }, [fetchedAt, refresh, snapshot]);

  const syncAfterPurchase = useCallback(
    async (hint: ClientSubscriptionHint) => {
      let latest = await refresh(hint);
      for (let i = 0; i < POST_PURCHASE_REFRESH.attempts; i += 1) {
        if (latest?.entitlementActive || latest?.plan === 'pro') {
          return latest;
        }
        await new Promise((r) => setTimeout(r, POST_PURCHASE_REFRESH.delayMs));
        latest = await refresh(hint);
      }
      return latest;
    },
    [refresh]
  );

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setSnapshot(null);
      setLoadState('idle');
      void billing.reset();
      return;
    }
    setLoadState('loading');
    void refresh();
  }, [billing, isAuthenticated, refresh, userId]);

  const showUpgradePaywall = useCallback((request: PaywallRequest) => {
    setPaywall(request);
  }, []);

  const closePaywall = useCallback(() => {
    const action = paywall?.returnAction;
    setPaywall(null);
    // returnAction is invoked by the paywall success UI, not on close.
    void action;
  }, [paywall]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      snapshot,
      isLoading: loadState === 'loading' && snapshot == null,
      loadState,
      isStale: snapshot != null && Date.now() - fetchedAt > 60_000,
      error,
      billing,
      refresh,
      ensureFresh,
      applySnapshot,
      syncAfterPurchase,
      paywall,
      showUpgradePaywall,
      closePaywall: () => setPaywall(null),
      writableSelectionOpen,
      openWritableSelection: () => setWritableSelectionOpen(true),
      closeWritableSelection: () => setWritableSelectionOpen(false),
    }),
    [
      snapshot,
      loadState,
      fetchedAt,
      error,
      billing,
      refresh,
      ensureFresh,
      applySnapshot,
      syncAfterPurchase,
      paywall,
      showUpgradePaywall,
      writableSelectionOpen,
    ]
  );

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
};

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return ctx;
}

/** Optional hook for screens that may render outside the provider (should be rare). */
export function useSubscriptionOptional(): SubscriptionContextValue | null {
  return useContext(SubscriptionContext) ?? null;
}

// Keep normalize available for tests without circular imports.
export const __normalizeSubscriptionSnapshot = normalizeSnapshot;
