import { useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FieldAccessLevel,
  FieldAccessSnapshot,
  FieldCapabilities,
  FieldModule,
} from '../services/fieldPeopleService';
import {
  rememberPartnerFieldId,
  rememberedPartnerFieldId,
} from '../services/partnerService';
import { useAccessContext } from './useAccessContext';
import { useAuth } from '../context/AuthContext';
import { demoAccounts } from '../services/demoAccounts';

export type ActiveFieldAccess = {
  fieldId: string | null;
  snapshot: FieldAccessSnapshot | null;
  /** Modules for the active field only — null when Admin / unrestricted. */
  modules: ReadonlySet<FieldModule> | null;
  /** Seat access level on the active field — null when Admin / unrestricted. */
  accessLevel: FieldAccessLevel | null;
  capabilities: FieldCapabilities | null;
  isAdminOnActive: boolean;
  isCollaboratorOnActive: boolean;
  ownsAnyField: boolean;
};

const resolvePreferredFieldId = (
  searchFieldId: string | null,
  pathFieldId: string | null,
  fields: FieldAccessSnapshot[]
): string | null => {
  const remembered = rememberedPartnerFieldId();
  const candidates = [searchFieldId, pathFieldId, remembered].filter(Boolean) as string[];
  for (const id of candidates) {
    if (fields.some((f) => f.fieldId === id)) {
      rememberPartnerFieldId(id);
      return id;
    }
  }
  const first = fields[0]?.fieldId || null;
  if (first) rememberPartnerFieldId(first);
  return first;
};

const fieldIdFromPath = (pathname: string): string | null => {
  const match = /^\/fields\/([^/]+)/.exec(pathname);
  if (!match) return null;
  const id = match[1];
  if (!id || id === 'new') return null;
  return id;
};

/**
 * Access for the currently selected field only (query, path, or last-used).
 * Does not union modules across fields.
 */
export const useActiveFieldAccess = (): ActiveFieldAccess => {
  const { context } = useAccessContext();
  const [params] = useSearchParams();
  const location = useLocation();

  return useMemo(() => {
    const fields = context?.fields || [];
    const ownsAnyField = Boolean(context?.ownsAnyField);
    if (fields.length === 0) {
      return {
        fieldId: null,
        snapshot: null,
        modules: null,
        accessLevel: null,
        capabilities: null,
        isAdminOnActive: ownsAnyField,
        isCollaboratorOnActive: false,
        ownsAnyField,
      };
    }

    const fieldId = resolvePreferredFieldId(
      params.get('fieldId'),
      fieldIdFromPath(location.pathname),
      fields
    );
    const snapshot = fields.find((f) => f.fieldId === fieldId) || null;
    const isAdminOnActive = snapshot?.role === 'Admin' || (!snapshot && ownsAnyField);
    const isCollaboratorOnActive =
      Boolean(snapshot) && (snapshot!.role === 'Partner' || snapshot!.role === 'Family');

    return {
      fieldId,
      snapshot,
      modules: isCollaboratorOnActive ? new Set(snapshot!.modules) : null,
      accessLevel: isCollaboratorOnActive ? snapshot!.accessLevel : null,
      capabilities: snapshot?.capabilities || null,
      isAdminOnActive,
      isCollaboratorOnActive,
      ownsAnyField,
    };
  }, [context, params, location.pathname]);
};

const DEMO_ADMIN_GENITIVE_EL: Record<string, string> = {
  [demoAccounts[0].userId]: 'Γιώργου Παπαδάκη',
};

/**
 * Label for header badge when the user is Partner/Family on the active field.
 */
export const useActiveFieldCollaboratorLabel = (): string | null => {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const { snapshot, isCollaboratorOnActive } = useActiveFieldAccess();

  return useMemo(() => {
    if (!user || !isCollaboratorOnActive || !snapshot) return null;
    if (snapshot.adminUserId === user.userId) return null;
    const lang = i18n.language?.startsWith('el') ? 'el' : i18n.language;
    const demoGenitive = lang === 'el' ? DEMO_ADMIN_GENITIVE_EL[snapshot.adminUserId] : undefined;
    return demoGenitive || snapshot.fieldName || null;
  }, [user, isCollaboratorOnActive, snapshot, i18n.language]);
};
