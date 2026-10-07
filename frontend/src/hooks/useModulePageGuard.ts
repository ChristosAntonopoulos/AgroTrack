import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FieldCapabilities, FieldModule } from '../services/fieldPeopleService';
import { useAccessContext } from './useAccessContext';
import { useActiveFieldAccess } from './useActiveFieldAccess';

export type ModulePageGuardOptions =
  | { module: FieldModule; adminOnly?: false }
  | { adminOnly: true; module?: never };

export type ModulePageGuardResult = {
  allowed: boolean;
  /** True while access-context is still loading — avoid flashing forbidden UI. */
  loading: boolean;
};

const moduleAllowed = (module: FieldModule, capabilities: FieldCapabilities): boolean => {
  switch (module) {
    case 'tasks':
      return capabilities.canViewTasks;
    case 'money':
      return capabilities.canViewMoney;
    case 'photos':
      return capabilities.canViewPhotos;
    case 'harvest':
      return capabilities.canViewHarvest;
    case 'chronologio':
      return capabilities.canViewChronologio;
    case 'fields':
      return capabilities.canViewField;
    case 'documents':
      return capabilities.canViewDocuments;
    default:
      return true;
  }
};

/**
 * UX gate for module routes. Owners stay open; Family/Collaborator seats
 * redirect when the active field does not grant the module. Backend ACL remains authoritative.
 */
export const useModulePageGuard = (opts: ModulePageGuardOptions): ModulePageGuardResult => {
  const { loading } = useAccessContext();
  const { capabilities, isAdminOnActive, isCollaboratorOnActive } = useActiveFieldAccess();
  const navigate = useNavigate();
  const adminOnly = opts.adminOnly === true;

  const result = useMemo(() => {
    if (loading) {
      return { allowed: true, loading: true };
    }

    if (adminOnly) {
      return { allowed: capabilities?.canManageAccess ?? isAdminOnActive, loading: false };
    }

    // Owners / unrestricted active field: keep module surfaces open (empty when no data).
    // Family/Collaborator seats gate on the active field capabilities.
    if (!isCollaboratorOnActive || isAdminOnActive) {
      return { allowed: true, loading: false };
    }

    if (!capabilities) {
      return { allowed: true, loading: false };
    }

    return { allowed: moduleAllowed(opts.module, capabilities), loading: false };
  }, [loading, adminOnly, capabilities, isAdminOnActive, isCollaboratorOnActive, opts]);

  useEffect(() => {
    if (result.loading || result.allowed) return;
    const module = adminOnly ? 'access' : opts.module;
    navigate(`/access-denied?module=${module}`, { replace: true });
  }, [adminOnly, opts, result.loading, result.allowed, navigate]);

  return result;
};
