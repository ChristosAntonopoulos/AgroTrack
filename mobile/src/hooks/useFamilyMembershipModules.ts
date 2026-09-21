import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FamilyModule } from '../services/familyService';
import { fieldPeopleService, FieldAccessSnapshot } from '../services/fieldPeopleService';
import { useAuth } from '../context/AuthContext';
import { testUsers } from '../services/mockUsers';

const FIELD_KEY = '@Oleachron/lastPartnerFieldId';

const pickActiveSnapshot = (
  fields: FieldAccessSnapshot[],
  preferredId: string | null
): FieldAccessSnapshot | null => {
  if (fields.length === 0) return null;
  if (preferredId) {
    const match = fields.find((f) => f.fieldId === preferredId);
    if (match) return match;
  }
  return fields[0];
};

/**
 * Modules for the currently selected field only (not a union across groves).
 */
export const useFamilyMembershipModules = (): ReadonlySet<FamilyModule> | null => {
  const { user, isAuthenticated } = useAuth();
  const [snapshot, setSnapshot] = useState<FieldAccessSnapshot | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setSnapshot(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [ctx, preferred] = await Promise.all([
        fieldPeopleService.getAccessContext(),
        AsyncStorage.getItem(FIELD_KEY),
      ]);
      if (cancelled) return;
      setSnapshot(pickActiveSnapshot(ctx.fields, preferred));
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  return useMemo(() => {
    if (!snapshot) return null;
    if (snapshot.role === 'Admin') return null;
    return new Set(snapshot.modules);
  }, [snapshot]);
};

export const useActiveFieldAccessLevel = (): 'view' | 'help' | 'work' | null => {
  const { user, isAuthenticated } = useAuth();
  const [level, setLevel] = useState<'view' | 'help' | 'work' | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLevel(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [ctx, preferred] = await Promise.all([
        fieldPeopleService.getAccessContext(),
        AsyncStorage.getItem(FIELD_KEY),
      ]);
      if (cancelled) return;
      const snap = pickActiveSnapshot(ctx.fields, preferred);
      if (!snap || snap.role === 'Admin') {
        setLevel(null);
        return;
      }
      setLevel(snap.accessLevel);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  return level;
};

const DEMO_OWNER_GENITIVE_EL: Record<string, string> = {
  [testUsers[0].userId]: 'Γιώργου Παπαδάκη',
};

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
      const [ctx, preferred] = await Promise.all([
        fieldPeopleService.getAccessContext(),
        AsyncStorage.getItem(FIELD_KEY),
      ]);
      if (cancelled) return;
      const snap = pickActiveSnapshot(ctx.fields, preferred);
      if (!snap || snap.role === 'Admin' || snap.adminUserId === user.id) {
        setOwnerLabel(null);
        return;
      }
      const lang = i18n.language?.startsWith('el') ? 'el' : i18n.language;
      const demoGenitive = lang === 'el' ? DEMO_OWNER_GENITIVE_EL[snap.adminUserId] : undefined;
      setOwnerLabel(demoGenitive || snap.fieldName || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, i18n.language]);

  return ownerLabel;
};
