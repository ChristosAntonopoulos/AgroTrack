import { useEffect, useMemo, useState } from 'react';
import { FamilyModule } from '../services/familyService';
import { ownerPartnerService } from '../services/ownerPartnerService';
import { useAuth } from '../context/AuthContext';

/**
 * Union of modules from active family + partner memberships for the signed-in user.
 * Used to show nav items the invitee can open on owners' groves.
 */
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
      const ctx = await ownerPartnerService.getAccessContext();
      if (cancelled) return;
      const union = Array.from(
        new Set([
          ...ctx.familyMemberships.flatMap((m) => m.modules),
          ...ctx.partnerMemberships.flatMap((m) => m.modules),
        ])
      );
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
