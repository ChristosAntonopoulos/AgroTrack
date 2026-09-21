import { useCallback, useEffect, useState } from 'react';
import {
  AccessContext,
  fieldPeopleService,
} from '../services/fieldPeopleService';
import { useAuth } from '../context/AuthContext';

let cachedContext: AccessContext | null = null;
let cachedUserId: string | null = null;
let inflight: Promise<AccessContext> | null = null;

const loadAccessContext = async (userId: string): Promise<AccessContext> => {
  if (cachedContext && cachedUserId === userId) return cachedContext;
  if (inflight && cachedUserId === userId) return inflight;

  cachedUserId = userId;
  inflight = fieldPeopleService.getAccessContext().then((ctx) => {
    cachedContext = ctx;
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

  return { context, loading, refresh };
};
