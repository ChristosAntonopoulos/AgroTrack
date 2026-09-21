import { useMemo } from 'react';
import type { Field } from '../services/fieldService';
import type { FieldAccessLevel, FieldModule } from '../services/fieldPeopleService';
import { useAccessContext } from './useAccessContext';
import { useAuth } from '../context/AuthContext';

export type GrantedFieldAccess = {
  kind: 'family' | 'partner';
  accessLevel: FieldAccessLevel;
  modules: FieldModule[];
  adminUserId: string;
  /** @deprecated Use adminUserId */
  ownerUserId: string;
};

/** When the signed-in user is not Admin on this field, resolve Partner/Family grant by fieldId. */
export const useGrantedFieldAccess = (field: Field | null | undefined): GrantedFieldAccess | null => {
  const { user, isAuthenticated } = useAuth();
  const { context } = useAccessContext();

  return useMemo(() => {
    if (!field || !user || !isAuthenticated || !context) return null;

    const snap = context.fields.find((f) => f.fieldId === field.id);
    if (!snap || snap.role === 'Admin') return null;

    return {
      kind: snap.role === 'Partner' ? ('partner' as const) : ('family' as const),
      accessLevel: snap.accessLevel,
      modules: snap.modules,
      adminUserId: snap.adminUserId,
      ownerUserId: snap.adminUserId,
    };
  }, [field, user, isAuthenticated, context]);
};
