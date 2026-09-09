import { useEffect, useMemo, useState } from 'react';
import { FamilyModule, familyService } from '../services/familyService';
import { useAuth } from '../context/AuthContext';

/** Union of modules from all active family memberships for the signed-in user. */
export const useFamilyMembershipModules = (): ReadonlySet<FamilyModule> | null => {
  const { user, isAuthenticated } = useAuth();
  const [modules, setModules] = useState<FamilyModule[] | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setModules(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const memberships = await familyService.getMyMemberships();
      if (cancelled) return;
      const union = Array.from(new Set(memberships.flatMap((m) => m.modules)));
      setModules(union);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.userId]);

  return useMemo(() => {
    if (!modules || modules.length === 0) return null;
    return new Set(modules);
  }, [modules]);
};
