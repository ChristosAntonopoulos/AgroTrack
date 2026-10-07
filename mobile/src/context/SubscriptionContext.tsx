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
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import {
  GATE_MAX_WAIT_MS,
  POST_PURCHASE_REFRESH,
  SNAPSHOT_FRESH_MS,
  SNAPSHOT_STALE_MS,
} from '../billing/billingConfig';
import { revenueCatAdapter } from '../billing/revenueCatAdapter';
import type { BillingAdapter } from '../billing/types';
import { trackBillingEvent } from '../billing/billingAnalytics';
import { ClientSubscriptionHint, SubscriptionSnapshot } from '../billing/subscriptionModel';
import { subscriptionService } from '../services/subscriptionService';
import { isMockMode } from '../services/serviceFactory';

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
  /** Runs after a successful purchase when the user taps the success CTA (e.g. open the field form). */
  returnAction?: (() => void) | null;
};

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type SubscriptionContextValue = {
  /** Authoritative plan from the backend. Null until first load (never assume "Free" while loading). */
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

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const SubscriptionProvider: React.FC<{
  children: ReactNode;
  billing?: BillingAdapter;
}> = ({ children, billing = revenueCatAdapter }) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  // RevenueCat App User ID = The Olive Lot user.id. Never email / device id.
  const userId = user?.id ?? null;
  // Mock mode has no subscription backend: stay "unknown" so every gate lets the user through.
  const backendEnabled = !isMockMode();

  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [paywall, setPaywall] = useState<PaywallRequest | null>(null);
  const [writableSelectionOpen, setWritableSelectionOpen] = useState(false);

  // Refs keep callbacks stable so effects don't refetch whenever the snapshot changes.
  const snapshotRef = useRef<SubscriptionSnapshot | null>(null);
  const fetchedAtRef = useRef(0);
  const inFlightRef = useRef<Promise<SubscriptionSnapshot | null> | null>(null);
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = userId;

  const applySnapshot = useCallback((next: SubscriptionSnapshot) => {
    snapshotRef.current = next;
    fetchedAtRef.current = Date.now();
    setSnapshot(next);
    setFetchedAt(fetchedAtRef.current);
    setLoadState('ready');
    setError(null);
  }, []);

  const refresh = useCallback(
    async (hint?: ClientSubscriptionHint | null) => {
      const requestedFor = userIdRef.current;
      if (!requestedFor || !backendEnabled) {
        return null;
      }
      if (inFlightRef.current && !hint) {
        return inFlightRef.current;
      }

      const run = (async () => {
        setLoadState((prev) => (prev === 'ready' ? prev : 'loading'));
        setError(null);
        try {
          const next = hint
            ? await subscriptionService.refresh(hint)
            : await subscriptionService.getSubscription();
          // The user may have logged out / switched while the request was in flight.
          if (userIdRef.current !== requestedFor) return null;
          applySnapshot(next);
          return next;
        } catch (err) {
          trackBillingEvent('subscription_refresh_failed');
          setError((err as { message?: string } | null)?.message || 'subscription_load_failed');
          setLoadState((prev) => (prev === 'ready' ? prev : 'error'));
          return snapshotRef.current;
        } finally {
          inFlightRef.current = null;
        }
      })();

      inFlightRef.current = run;
      return run;
    },
    [applySnapshot, backendEnabled]
  );

  const ensureFresh = useCallback(async () => {
    if (snapshotRef.current && Date.now() - fetchedAtRef.current < SNAPSHOT_FRESH_MS) {
      return snapshotRef.current;
    }
    // Don't let a slow / offline network hold the "Add grove" tap hostage: past the wait budget we
    // fall back to the last known snapshot (or null) and the backend enforces the limit on save.
    return Promise.race([
      refresh(),
      sleep(GATE_MAX_WAIT_MS).then(() => snapshotRef.current),
    ]);
  }, [refresh]);

  const syncAfterPurchase = useCallback(
    async (hint: ClientSubscriptionHint) => {
      let latest = await refresh(hint);
      for (let i = 0; i < POST_PURCHASE_REFRESH.attempts; i += 1) {
        if (latest?.entitlementActive || latest?.plan === 'pro') return latest;
        await sleep(POST_PURCHASE_REFRESH.delayMs);
        latest = await refresh(hint);
      }
      return latest;
    },
    [refresh]
  );

  // Initialise RevenueCat once for the app session.
  useEffect(() => {
    void billing.init();
  }, [billing]);

  // Identity + initial load. Wait for auth to settle so a cold start doesn't log out a cached user.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !userId) {
      snapshotRef.current = null;
      fetchedAtRef.current = 0;
      inFlightRef.current = null;
      setSnapshot(null);
      setFetchedAt(0);
      setLoadState('idle');
      setError(null);
      setPaywall(null);
      setWritableSelectionOpen(false);
      void billing.reset();
      return;
    }
    void billing.identify(userId);
    if (backendEnabled) {
      // New identity: never show the previous user's plan while the first load runs.
      snapshotRef.current = null;
      fetchedAtRef.current = 0;
      setSnapshot(null);
      setLoadState('loading');
      void refresh();
    }
  }, [authLoading, backendEnabled, billing, isAuthenticated, refresh, userId]);

  // Coming back from Play / App Store subscription management: pick up plan changes.
  useEffect(() => {
    if (!isAuthenticated) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void ensureFresh();
    });
    return () => sub.remove();
  }, [ensureFresh, isAuthenticated]);

  const showUpgradePaywall = useCallback((request: PaywallRequest) => setPaywall(request), []);
  const closePaywall = useCallback(() => setPaywall(null), []);
  const openWritableSelection = useCallback(() => setWritableSelectionOpen(true), []);
  const closeWritableSelection = useCallback(() => setWritableSelectionOpen(false), []);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      snapshot,
      isLoading: loadState === 'loading' && snapshot == null,
      loadState,
      isStale: snapshot != null && Date.now() - fetchedAt > SNAPSHOT_STALE_MS,
      error,
      billing,
      refresh,
      ensureFresh,
      applySnapshot,
      syncAfterPurchase,
      paywall,
      showUpgradePaywall,
      closePaywall,
      writableSelectionOpen,
      openWritableSelection,
      closeWritableSelection,
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
      closePaywall,
      writableSelectionOpen,
      openWritableSelection,
      closeWritableSelection,
    ]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return ctx;
}

/** For components that may render outside the provider (e.g. shared widgets). */
export function useSubscriptionOptional(): SubscriptionContextValue | null {
  return useContext(SubscriptionContext) ?? null;
}
