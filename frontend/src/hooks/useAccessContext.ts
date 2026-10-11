import { useCallback, useEffect, useState } from 'react';
import {
  AccessContext,
  fieldPeopleService,
} from '../services/fieldPeopleService';
import { useAuth } from '../context/AuthContext';

let cachedContext: AccessContext | null = null;
let cachedUserId: string | null = null;
let inflight: Promise<AccessContext> | null = null;
let cachedAt = 0;

/** QA-040: a seat/role change made elsewhere must show up without a full re-login. */
export const ACCESS_CONTEXT_TTL_MS = 60_000;

const loadAccessContext = async (userId: string): Promise<AccessContext> => {
  const fresh = Date.now() - cachedAt < ACCESS_CONTEXT_TTL_MS;
  if (cachedContext && cachedUserId === userId && fresh) return cachedContext;
  if (inflight && cachedUserId === userId) return inflight;

  cachedUserId = userId;
  inflight = fieldPeopleService.getAccessContext().then((ctx) => {
    cachedContext = ctx;
    cachedAt = Date.now();
    inflight = null;
    return ctx;
  });
  return inflight;
};

/** Drop cached access-context (e.g. after accepting an invite). */
export const invalidateAccessContext = () => {
  cachedContext = null;
  cachedUserId = null;
  inflight = null;
};

/**
 * Cached GET /api/v1/me/access-context for the signed-in user.
 * Per-field seats drive nav / capture gates — never union modules across fields.
 */
export const useAccessContext = (): {
  context: AccessContext | null;
  loading: boolean;
  refresh: () => Promise<void>;
} => {
  const { user, isAuthenticated } = useAuth();
  const [context, setContext] = useState<AccessContext | null>(() =>
    user?.userId && cachedUserId === user.userId ? cachedContext : null
  );
  const [loading, setLoading] = useState(Boolean(isAuthenticated && user && !context));

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.userId) {
      setContext(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    invalidateAccessContext();
    try {
      const next = await loadAccessContext(user.userId);
      setContext(next);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.userId]);

  useEffect(() => {
    if (!isAuthenticated || !user?.userId) {
      setContext(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadAccessContext(user.userId).then((next) => {
      if (!cancelled) {
        setContext(next);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.userId]);

  // Re-read access (TTL-gated) whenever the tab becomes visible again.
  useEffect(() => {
    if (!isAuthenticated || !user?.userId) return undefined;
    const userId = user.userId;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void loadAccessContext(userId).then((next) => setContext(next));
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isAuthenticated, user?.userId]);

  return { context, loading, refresh };
};
