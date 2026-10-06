import api from './api';
import { Field } from './fieldService';
import type { FamilyModule, FamilyAccessLevel } from './familyService';
import { FAMILY_MODULES, DEFAULT_FAMILY_MODULES } from './familyService';

export type FieldPersonRole = 'Admin' | 'Partner' | 'Family';
export type FieldAccessLevel = FamilyAccessLevel;
export type FieldModule = FamilyModule;
export const DEFAULT_FIELD_MODULES = DEFAULT_FAMILY_MODULES;
export const MAX_PARTNER_SEATS = 1;
export const MAX_FAMILY_SEATS = 2;
export type FieldCapacity = 'own' | 'work' | 'advise' | 'help' | 'view';

/** Same flags as the API FieldCapabilitiesDto and the web client. */
export interface FieldCapabilities {
  canViewField: boolean;
  canViewBoundary: boolean;
  canViewSensitiveIdentity: boolean;
  canViewEnvironmentalData: boolean;
  canViewChronologio: boolean;
  canCreateRecords: boolean;
  canViewTasks: boolean;
  canManageTasks: boolean;
  canViewPhotos: boolean;
  canUploadPhotos: boolean;
  canViewMoney: boolean;
  canViewHarvest: boolean;
  canViewDocuments: boolean;
  canManageDocuments: boolean;
  canManageAccess: boolean;
  canEditField: boolean;
  canArchiveField: boolean;
  canRestoreField: boolean;
  canPermanentlyDelete: boolean;
  canDeleteField: boolean;
}

export interface FieldMembership {
  userId: string;
  displayName?: string;
  email?: string;
  phone?: string;
  role: FieldPersonRole;
  modules: FieldModule[];
  accessLevel: FieldAccessLevel;
  status: string;
  inviteId?: string;
  fieldId?: string;
  fieldName?: string;
  /** @deprecated Derived from role + accessLevel for older screens. */
  capacities: FieldCapacity[];
}

export interface FieldInvite {
  id: string;
  token: string;
  code?: string;
  fieldId: string;
  fieldName: string;
  invitedBy?: string;
  role: FieldPersonRole;
  modules: FieldModule[];
  accessLevel: FieldAccessLevel;
  shareUrl: string;
  whatsAppUrl: string;
  mailtoUrl?: string;
  smsUrl?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  status?: string;
  expiresAt?: string;
  acceptedBy?: string;
  invitedByName?: string;
  createdAt?: string;
  emailSent?: boolean;
  inviteeHasAccount?: boolean;
  targetUserId?: string;
  notificationQueued?: boolean;
  /** @deprecated */
  capacities?: FieldCapacity[];
}

export interface AdvisorComment {
  id: string;
  userId: string;
  displayName?: string;
  body: string;
  createdAt: string;
}

export interface FieldAccessSnapshot {
  fieldId: string;
  fieldName: string;
  role: FieldPersonRole;
  modules: FieldModule[];
  accessLevel: FieldAccessLevel;
  adminUserId: string;
  capabilities?: FieldCapabilities;
}

export interface AccessContext {
  fields: FieldAccessSnapshot[];
  ownsAnyField: boolean;
}

const normalizeRole = (role?: string): FieldPersonRole => {
  const value = (role || '').trim();
  if (/^admin$/i.test(value)) return 'Admin';
  if (/^partner$/i.test(value)) return 'Partner';
  return 'Family';
};

const normalizeAccessLevel = (level?: string): FieldAccessLevel => {
  const value = (level || '').trim().toLowerCase();
  if (value === 'work' || value === 'help' || value === 'view') return value;
  return 'view';
};

const normalizeModules = (modules?: string[]): FieldModule[] => {
  if (!modules?.length) return [];
  const allowed = new Set<string>(FAMILY_MODULES);
  const seen = new Set<string>();
  const result: FieldModule[] = [];
  for (const raw of modules) {
    const mapped = raw === 'calendar' ? 'chronologio' : raw;
    if (!allowed.has(mapped) || seen.has(mapped)) continue;
    seen.add(mapped);
    result.push(mapped as FieldModule);
  }
  return result;
};

/** Client fallback when a payload omits capabilities. Live API values win when present. */
export const capabilitiesForAccess = (
  role: FieldPersonRole,
  modules: FieldModule[],
  accessLevel: FieldAccessLevel
): FieldCapabilities => {
  const admin = role === 'Admin';
  const has = (module: FieldModule) => admin || modules.includes(module);
  const canWrite = admin || accessLevel === 'help' || accessLevel === 'work';
  const canCreate = admin || accessLevel === 'work';
  return {
    canViewField: true,
    canViewBoundary: true,
    canViewSensitiveIdentity: admin,
    canViewEnvironmentalData: true,
    canViewChronologio: has('chronologio'),
    canCreateRecords: canCreate,
    canViewTasks: has('tasks'),
    canManageTasks: has('tasks') && canWrite,
    canViewPhotos: has('photos'),
    canUploadPhotos: has('photos') && canCreate,
    canViewMoney: has('money'),
    canViewHarvest: has('harvest'),
    canViewDocuments: has('documents'),
    canManageDocuments: has('documents') && canCreate,
    canManageAccess: admin,
    canEditField: admin,
    canArchiveField: admin,
    canRestoreField: false,
    canPermanentlyDelete: false,
    canDeleteField: admin,
  };
};

export const capacitiesForMembership = (member: {
  role: FieldPersonRole;
  accessLevel: FieldAccessLevel;
}): FieldCapacity[] => {
  if (member.role === 'Admin') return ['own', 'work'];
  if (member.accessLevel === 'work') return ['work'];
  if (member.accessLevel === 'help') return ['help'];
  return ['view'];
};

const normalizeMembership = (
  row: Partial<FieldMembership> & { capacities?: string[] },
  fieldId?: string,
  fieldName?: string
): FieldMembership => {
  const role = normalizeRole(row.role);
  const accessLevel = normalizeAccessLevel(row.accessLevel) || (role === 'Admin' ? 'work' : 'view');
  const modules =
    row.modules && row.modules.length > 0
      ? normalizeModules(row.modules)
      : role === 'Admin'
        ? [...FAMILY_MODULES]
        : [...DEFAULT_FAMILY_MODULES];
  const membership = {
    userId: row.userId || '',
    displayName: row.displayName,
    email: row.email,
    phone: row.phone,
    role,
    modules,
    accessLevel,
    status: row.status || 'active',
    inviteId: row.inviteId,
    fieldId,
    fieldName,
    capacities: [] as FieldCapacity[],
  };
  membership.capacities = capacitiesForMembership(membership);
  return membership;
};

const normalizeInvite = (row: Partial<FieldInvite> & { capacities?: string[] }): FieldInvite => {
  const role = normalizeRole(row.role);
  const accessLevel = normalizeAccessLevel(row.accessLevel);
  const modules = normalizeModules(row.modules);
  return {
    id: row.id || '',
    token: row.token || '',
    code: row.code,
    fieldId: row.fieldId || '',
    fieldName: row.fieldName || '',
    invitedBy: row.invitedBy,
    role,
    modules,
    accessLevel,
    shareUrl: row.shareUrl || '',
    whatsAppUrl: row.whatsAppUrl || '',
    mailtoUrl: row.mailtoUrl,
    smsUrl: row.smsUrl,
    displayName: row.displayName,
    email: row.email,
    phone: row.phone,
    status: row.status,
    expiresAt: row.expiresAt,
    acceptedBy: row.acceptedBy,
    invitedByName: row.invitedByName,
    createdAt: row.createdAt,
    emailSent: row.emailSent,
    inviteeHasAccount: row.inviteeHasAccount,
    targetUserId: row.targetUserId,
    notificationQueued: row.notificationQueued,
    capacities: capacitiesForMembership({ role, accessLevel }),
  };
};

const fallbackPeople = (field: Field): FieldMembership[] => {
  const people: FieldMembership[] = [];
  if (field.ownerId) {
    people.push(
      normalizeMembership(
        {
          userId: field.ownerId,
          displayName: 'Owner',
          role: 'Admin',
          modules: [...FAMILY_MODULES],
          accessLevel: 'work',
          status: 'active',
        },
        field.id,
        field.name
      )
    );
  }
  return people;
};

export const fieldPeopleService = {
  getAccessContext: async (): Promise<AccessContext> => {
    try {
      const response = await api.get<AccessContext>('/api/v1/me/access-context');
      const fields = (response.data?.fields || []).map((row) => {
        const role = normalizeRole(row.role);
        const modules = normalizeModules(row.modules);
        const accessLevel = normalizeAccessLevel(row.accessLevel);
        return {
          ...row,
          role,
          modules,
          accessLevel,
          capabilities:
            row.capabilities ?? capabilitiesForAccess(role, modules, accessLevel),
        };
      });
      return {
        fields,
        ownsAnyField: Boolean(response.data?.ownsAnyField) || fields.some((f) => f.role === 'Admin'),
      };
    } catch {
      return { fields: [], ownsAnyField: false };
    }
  },

  getPeople: async (fieldId: string, field?: Field): Promise<FieldMembership[]> => {
    try {
      const response = await api.get<FieldMembership[]>(`/api/v1/fields/${fieldId}/people`);
      return (response.data || []).map((person) =>
        normalizeMembership(person, fieldId, field?.name)
      );
    } catch {
      return field ? fallbackPeople(field) : [];
    }
  },

  createInvite: async (
    fieldId: string,
    payload: {
      role: 'Partner' | 'Family';
      modules: FieldModule[];
      accessLevel: FieldAccessLevel;
      phone?: string;
      email?: string;
      displayName?: string;
    }
  ): Promise<FieldInvite> => {
    const response = await api.post<FieldInvite>(`/api/v1/fields/${fieldId}/people/invites`, payload);
    return normalizeInvite(response.data);
  },

  upsertMembership: async (
    fieldId: string,
    userId: string,
    payload: { role: 'Partner' | 'Family'; modules?: FieldModule[]; accessLevel?: FieldAccessLevel }
  ): Promise<FieldMembership> => {
    const response = await api.put<FieldMembership>(`/api/v1/fields/${fieldId}/people/${userId}`, payload);
    return normalizeMembership(response.data, fieldId);
  },

  updatePerson: async (
    fieldId: string,
    userId: string,
    payload: { modules?: FieldModule[]; accessLevel?: FieldAccessLevel; displayName?: string; phone?: string; email?: string }
  ): Promise<FieldMembership> => {
    const response = await api.patch<FieldMembership>(`/api/v1/fields/${fieldId}/people/${userId}`, payload);
    return normalizeMembership(response.data, fieldId);
  },

  removeMembership: async (fieldId: string, userId: string): Promise<void> => {
    await api.delete(`/api/v1/fields/${fieldId}/people/${userId}`);
  },

  getInvite: async (token: string): Promise<FieldInvite> => {
    const response = await api.get<FieldInvite>(`/api/v1/invites/${token}`);
    return normalizeInvite(response.data);
  },

  getPendingInvites: async (): Promise<FieldInvite[]> => {
    const response = await api.get<FieldInvite[]>('/api/v1/me/invites/pending');
    return (response.data || []).map(normalizeInvite);
  },

  acceptInvite: async (token: string): Promise<FieldMembership> => {
    const response = await api.post<FieldMembership>(`/api/v1/invites/${token}/accept`);
    return normalizeMembership(response.data);
  },

  listInvites: async (fieldId: string): Promise<FieldInvite[]> => {
    const response = await api.get<FieldInvite[]>(`/api/v1/fields/${fieldId}/people/invites`);
    return (response.data || []).map(normalizeInvite);
  },

  resendInvite: async (fieldId: string, inviteId: string): Promise<FieldInvite> => {
    const response = await api.post<FieldInvite>(
      `/api/v1/fields/${fieldId}/people/invites/${inviteId}/resend`
    );
    return normalizeInvite(response.data);
  },

  addAdvisorComment: async (fieldId: string, body: string): Promise<AdvisorComment> => {
    const response = await api.post<AdvisorComment>(`/api/v1/fields/${fieldId}/people/advisor-comments`, {
      body,
    });
    return response.data;
  },
};

export const countSeats = (people: FieldMembership[], role: 'Partner' | 'Family') =>
  people.filter(
    (p) =>
      p.role === role &&
      !/^revoked$/i.test(p.status) &&
      !/^removed$/i.test(p.status)
  ).length;
