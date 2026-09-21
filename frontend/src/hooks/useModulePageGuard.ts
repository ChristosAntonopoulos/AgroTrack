import { useMemo } from 'react';
import type { FieldModule } from '../services/fieldPeopleService';
import { useAccessContext } from './useAccessContext';
import { useActiveFieldAccess } from './useActiveFieldAccess';

export type ModulePageGuardOptions =
  | { module: FieldModule; adminOnly?: false }
  | { adminOnly: true; module?: never };

export type ModulePageGuardResult = {
  /** False when the active-field seat lacks the required module / admin role. */
  allowed: boolean;
  /** True while access-context is still loading — avoid flashing forbidden UI. */
  loading: boolean;
};

/**
 * Thin UX gate for module pages. Backend ACL remains authoritative.
 * Collaborators are checked against the active field seat's modules only.
 */
export const useModulePageGuard = (opts: ModulePageGuardOptions): ModulePageGuardResult => {
  const { loading } = useAccessContext();
  const { modules, isAdminOnActive, isCollaboratorOnActive } = useActiveFieldAccess();
  const adminOnly = opts.adminOnly === true;
  const requiredModule = adminOnly ? null : opts.module;

  return useMemo(() => {
    if (loading) {
      return { allowed: true, loading: true };
    }

    if (adminOnly) {
      return { allowed: isAdminOnActive, loading: false };
    }

    if (isAdminOnActive || modules === null) {
      return { allowed: true, loading: false };
    }

    if (isCollaboratorOnActive && requiredModule) {
      return { allowed: modules.has(requiredModule), loading: false };
    }

    return { allowed: true, loading: false };
  }, [loading, adminOnly, requiredModule, modules, isAdminOnActive, isCollaboratorOnActive]);
};
