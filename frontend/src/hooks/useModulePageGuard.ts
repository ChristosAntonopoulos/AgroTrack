import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { modules, capabilities, isAdminOnActive, isCollaboratorOnActive } = useActiveFieldAccess();
  const navigate = useNavigate();
  const adminOnly = opts.adminOnly === true;
  const requiredModule = adminOnly ? null : opts.module;

  const result = useMemo(() => {
    if (loading) {
      return { allowed: true, loading: true };
    }

    if (adminOnly) {
      return { allowed: capabilities?.canManageAccess ?? isAdminOnActive, loading: false };
    }

    if (capabilities && requiredModule) {
      const allowedByCapability = {
        fields: capabilities.canViewField,
        tasks: capabilities.canViewTasks,
        photos: capabilities.canViewPhotos,
        documents: capabilities.canViewDocuments,
        money: capabilities.canViewMoney,
        chronologio: capabilities.canViewChronologio,
        harvest: capabilities.canViewHarvest,
      }[requiredModule];
      return { allowed: allowedByCapability, loading: false };
    }

    if (isAdminOnActive || modules === null) {
      return { allowed: true, loading: false };
    }

    if (isCollaboratorOnActive && requiredModule) {
      return { allowed: modules.has(requiredModule), loading: false };
    }

    return { allowed: true, loading: false };
  }, [loading, adminOnly, requiredModule, modules, capabilities, isAdminOnActive, isCollaboratorOnActive]);

  useEffect(() => {
    if (!result.loading && !result.allowed) {
      const module = adminOnly ? 'access' : requiredModule;
      navigate(`/access-denied?module=${encodeURIComponent(module || 'field')}`, { replace: true });
    }
  }, [result.loading, result.allowed, adminOnly, requiredModule, navigate]);

  return result;
};
