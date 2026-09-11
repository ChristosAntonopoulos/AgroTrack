import { useEffect, useMemo, useState } from 'react';
import type { Field } from '../services/fieldService';
import type { FamilyAccessLevel, FamilyModule } from '../services/familyService';
import { ownerPartnerService, AccessContext } from '../services/ownerPartnerService';
import { useAuth } from '../context/AuthContext';

export type GrantedFieldAccess = {
  kind: 'family' | 'partner';
  accessLevel: FamilyAccessLevel;
  modules: FamilyModule[];
  ownerUserId: string;
};

/** When the signed-in user is not the field owner, resolve family/partner grant for that owner. */
export const useGrantedFieldAccess = (field: Field | null | undefined): GrantedFieldAccess | null => {
  const { user, isAuthenticated } = useAuth();
  const [ctx, setCtx] = useState<AccessContext | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setCtx(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = await ownerPartnerService.getAccessContext();
      if (!cancelled) setCtx(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.userId]);

  return useMemo(() => {
    if (!field || !user || !ctx) return null;
    if (field.ownerId === user.userId) return null;

    const family = ctx.familyMemberships.find((m) => m.ownerUserId === field.ownerId);
    if (family) {
      return {
        kind: 'family' as const,
        accessLevel: family.accessLevel,
        modules: family.modules,
        ownerUserId: family.ownerUserId,
      };
    }

    const partner = ctx.partnerMemberships.find((m) => m.ownerUserId === field.ownerId);
    if (partner) {
      return {
        kind: 'partner' as const,
        accessLevel: partner.accessLevel,
        modules: partner.modules,
        ownerUserId: partner.ownerUserId,
      };
    }

    return null;
  }, [field, user, ctx]);
};
