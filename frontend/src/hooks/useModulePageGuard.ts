import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FieldModule } from '../services/fieldPeopleService';
import { useAccessContext } from './useAccessContext';
import { useActiveFieldAccess } from './useActiveFieldAccess';

export type ModulePageGuardOptions =
  | { module: FieldModule; adminOnly?: false }
  | { adminOnly: true; module?: never };

export type ModulePageGuardResult = {
  /**
   * Module pages are always allowed after loading — permissions filter field data,
   * they do not hide product surfaces. Admin-only surfaces still gate here.
   */
  allowed: boolean;
  /** True while access-context is still loading — avoid flashing forbidden UI. */
  loading: boolean;
};

/**
 * Thin UX gate. Module routes stay open (empty when no permitted fields).
 * Admin-only surfaces still redirect. Backend ACL remains authoritative for data.
 */
export const useModulePageGuard = (opts: ModulePageGuardOptions): ModulePageGuardResult => {
  const { loading } = useAccessContext();
  const { capabilities, isAdminOnActive } = useActiveFieldAccess();
  const navigate = useNavigate();
  const adminOnly = opts.adminOnly === true;

  const result = useMemo(() => {
    if (loading) {
      return { allowed: true, loading: true };
    }

    if (adminOnly) {
      return { allowed: capabilities?.canManageAccess ?? isAdminOnActive, loading: false };
    }

    return { allowed: true, loading: false };
  }, [loading, adminOnly, capabilities, isAdminOnActive]);

  useEffect(() => {
    if (adminOnly && !result.loading && !result.allowed) {
      navigate('/access-denied?module=access', { replace: true });
    }
  }, [adminOnly, result.loading, result.allowed, navigate]);

  return result;
};
