import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FamilyModule } from '../services/familyService';
import { ownerPartnerService } from '../services/ownerPartnerService';
import { useAuth } from '../context/AuthContext';
import { testUsers } from '../services/mockUsers';

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
  }, [isAuthenticated, user?.id]);

  return useMemo(() => {
    if (!modules || modules.length === 0) return null;
    return new Set(modules);
  }, [modules]);
};

/** Demo owner genitive label for Greek badge copy. */
const DEMO_OWNER_GENITIVE_EL: Record<string, string> = {
  [testUsers[0].userId]: 'Γιώργου Παπαδάκη',
};

/**
 * Owner display name when the signed-in user is a family collaborator (not grove owner).
 * Prefer access-context ownerDisplayName; Greek demo uses genitive for natural copy.
 */
export const useFamilyCollaboratorOwnerLabel = (): string | null => {
  const { user, isAuthenticated } = useAuth();
  const { i18n } = useTranslation();
  const [ownerLabel, setOwnerLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setOwnerLabel(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const ctx = await ownerPartnerService.getAccessContext();
      if (cancelled) return;
      const membership = ctx.familyMemberships[0];
      if (!membership || membership.ownerUserId === user.id) {
        setOwnerLabel(null);
        return;
      }
      const lang = i18n.language?.startsWith('el') ? 'el' : i18n.language;
      const demoGenitive = lang === 'el' ? DEMO_OWNER_GENITIVE_EL[membership.ownerUserId] : undefined;
      setOwnerLabel(demoGenitive || membership.ownerDisplayName || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, i18n.language]);

  return ownerLabel;
};
