import api from './api';
import { isMockMode } from './serviceFactory';
import { demoStore } from './demo/demoStore';
import { EntityCache } from '../utils/entityCache';
import { isDeviceOnline, isNetworkError } from '../utils/networkStatus';

export type FieldPersonRole = 'Admin' | 'Partner' | 'Family';
export type FieldAccessLevel = 'view' | 'help' | 'work';
export type FieldModule = 'fields' | 'tasks' | 'documents' | 'money' | 'calendar' | 'harvest';

/** @deprecated Prefer FieldModule — kept for invite/access copy compatibility */
export type FamilyModule = FieldModule;
/** @deprecated Prefer FieldAccessLevel */
export type FamilyAccessLevel = FieldAccessLevel;

export const FIELD_MODULES: FieldModule[] = [
  'fields',
  'tasks',
  'documents',
  'money',
  'calendar',
  'harvest',
];

export const FAMILY_MODULES = FIELD_MODULES;
export const DEFAULT_FIELD_MODULES: FieldModule[] = ['fields', 'tasks', 'calendar'];
export const DEFAULT_FAMILY_MODULES = DEFAULT_FIELD_MODULES;

export const MAX_PARTNER_SEATS = 1;
export const MAX_FAMILY_SEATS = 2;

/** Legacy capacity labels still used by a few UI helpers. */
export type FieldCapacity = 'own' | 'work' | 'advise' | 'help' | 'view';

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
  invitedBy?: string;
  createdAt: string;
}

export interface FieldInvite {
  id: string;
  token: string;
  code?: string;
  fieldId: string;
  fieldName: string;
  invitedBy: string;
  role: FieldPersonRole;
  modules: FieldModule[];
  accessLevel: FieldAccessLevel;
  phone?: string;
  email?: string;
  displayName?: string;
  status: string;
  expiresAt: string;
  shareUrl: string;
  whatsAppUrl: string;
  mailtoUrl?: string;
  smsUrl?: string;
}

export interface AdvisorComment {
  id: string;
  userId: string;
  displayName?: string;
  body: string;
  createdAt: string;
}

export interface PersonWorkStats {
  userId: string;
  displayName?: string;
  role: FieldPersonRole;
  modules: FieldModule[];
  accessLevel: FieldAccessLevel;
  completedTasks: number;
  overdueTasks: number;
  openTasks: number;
  lastActivityAt?: string;
}

export interface FieldPeopleStats {
  fieldId: string;
  people: PersonWorkStats[];
}

export interface FieldAccessSnapshot {
  fieldId: string;
  fieldName: string;
  role: FieldPersonRole;
  modules: FieldModule[];
  accessLevel: FieldAccessLevel;
  adminUserId: string;
}

export interface AccessContext {
  fields: FieldAccessSnapshot[];
  ownsAnyField: boolean;
}

export interface CreateFieldInvitePayload {
  role: 'Partner' | 'Family';
  modules: FieldModule[];
  accessLevel: FieldAccessLevel;
  phone?: string;
  email?: string;
  displayName?: string;
}

export interface UpdateFieldPersonPayload {
  modules?: FieldModule[];
  accessLevel?: FieldAccessLevel;
}

export interface UpsertFieldMembershipPayload {
  role: 'Partner' | 'Family';
  modules?: FieldModule[];
  accessLevel?: FieldAccessLevel;
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
  const allowed = new Set<string>(FIELD_MODULES);
  return modules.filter((m): m is FieldModule => allowed.has(m));
};

const normalizeMembership = (row: Partial<FieldMembership> & { capacities?: string[] }): FieldMembership => {
  const role = normalizeRole(row.role);
  const modules =
    row.modules && row.modules.length > 0
      ? normalizeModules(row.modules)
      : role === 'Admin'
        ? [...FIELD_MODULES]
        : DEFAULT_FIELD_MODULES;
  return {
    userId: row.userId || '',
    displayName: row.displayName,
    email: row.email,
    phone: row.phone,
    role,
    modules,
    accessLevel: normalizeAccessLevel(row.accessLevel) || (role === 'Admin' ? 'work' : 'view'),
    status: row.status || 'active',
    inviteId: row.inviteId,
    invitedBy: row.invitedBy,
    createdAt: row.createdAt || new Date().toISOString(),
  };
};

const normalizeInvite = (row: Partial<FieldInvite> & { capacities?: string[] }): FieldInvite => ({
  id: row.id || '',
  token: row.token || '',
  code: row.code,
  fieldId: row.fieldId || '',
  fieldName: row.fieldName || '',
  invitedBy: row.invitedBy || '',
  role: normalizeRole(row.role),
  modules: normalizeModules(row.modules),
  accessLevel: normalizeAccessLevel(row.accessLevel),
  phone: row.phone,
  email: row.email,
  displayName: row.displayName,
  status: row.status || 'pending',
  expiresAt: row.expiresAt || new Date().toISOString(),
  shareUrl: row.shareUrl || '',
  whatsAppUrl: row.whatsAppUrl || '',
  mailtoUrl: row.mailtoUrl,
  smsUrl: row.smsUrl,
});

const normalizeAccessSnapshot = (row: Partial<FieldAccessSnapshot>): FieldAccessSnapshot => ({
  fieldId: row.fieldId || '',
  fieldName: row.fieldName || '',
  role: normalizeRole(row.role),
  modules: normalizeModules(row.modules),
  accessLevel: normalizeAccessLevel(row.accessLevel),
  adminUserId: row.adminUserId || '',
});

/** Map seat role + access level to legacy capacity labels for older UI helpers. */
export const capacitiesForMembership = (member: FieldMembership): FieldCapacity[] => {
  if (member.role === 'Admin') return ['own', 'work'];
  if (member.accessLevel === 'work') return ['work'];
  if (member.accessLevel === 'help') return ['help'];
  return ['view'];
};

const mockMemberships = (fieldId: string): FieldMembership[] => {
  demoStore.ensureSeeded();
  const field = demoStore.getFields().find((f) => f.id === fieldId);
  if (!field) return [];
  const people: FieldMembership[] = [
    {
      userId: field.ownerId,
      displayName: 'Owner',
      role: 'Admin',
      modules: [...FIELD_MODULES],
      accessLevel: 'work',
      status: 'active',
      createdAt: field.createdAt,
    },
  ];
  (field.assignedProducerIds || []).forEach((id) => {
    people.push({
      userId: id,
      displayName: 'Producer',
      role: 'Partner',
      modules: [...DEFAULT_FIELD_MODULES],
      accessLevel: 'work',
      status: 'active',
      createdAt: field.createdAt,
    });
  });
  return people;
};

export const fieldPeopleService = {
  getAccessContext: async (): Promise<AccessContext> => {
    if (isMockMode()) return { fields: [], ownsAnyField: false };
    try {
      const response = await api.get<AccessContext>('/api/v1/me/access-context', {
        skipUnauthorizedHandler: true,
      });
      const fields = (response.data?.fields || []).map(normalizeAccessSnapshot);
      return {
        fields,
        ownsAnyField:
          Boolean(response.data?.ownsAnyField) ||
          fields.some((f) => f.role === 'Admin'),
      };
    } catch {
      return { fields: [], ownsAnyField: false };
    }
  },

  getPeople: async (fieldId: string): Promise<FieldMembership[]> => {
    if (isMockMode()) return mockMemberships(fieldId);

    if (!isDeviceOnline()) {
      const cached = EntityCache.getPeople(fieldId);
      if (cached) return cached.data.map(normalizeMembership);
      throw new Error('No cached people available offline');
    }

    try {
      const response = await api.get<FieldMembership[]>(`/api/v1/fields/${fieldId}/people`, {
        skipUnauthorizedHandler: true,
      });
      const people = (response.data || []).map(normalizeMembership);
      EntityCache.setPeople(fieldId, people);
      return people;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 404) {
        return (EntityCache.getPeople(fieldId)?.data || []).map(normalizeMembership);
      }
      if (isNetworkError(err)) {
        const cached = EntityCache.getPeople(fieldId);
        if (cached) return cached.data.map(normalizeMembership);
      }
      throw err;
    }
  },

  upsertMembership: async (
    fieldId: string,
    userId: string,
    payload: UpsertFieldMembershipPayload
  ): Promise<FieldMembership> => {
    if (isMockMode()) {
      return {
        userId,
        role: payload.role,
        modules: payload.modules || [...DEFAULT_FIELD_MODULES],
        accessLevel: payload.accessLevel || 'work',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
    }
    const response = await api.put<FieldMembership>(`/api/v1/fields/${fieldId}/people/${userId}`, {
      role: payload.role,
      modules: payload.modules,
      accessLevel: payload.accessLevel,
    });
    return normalizeMembership(response.data);
  },

  updatePerson: async (
    fieldId: string,
    userId: string,
    payload: UpdateFieldPersonPayload
  ): Promise<FieldMembership> => {
    if (isMockMode()) {
      return {
        userId,
        role: 'Family',
        modules: payload.modules || [...DEFAULT_FIELD_MODULES],
        accessLevel: payload.accessLevel || 'view',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
    }
    const response = await api.patch<FieldMembership>(
      `/api/v1/fields/${fieldId}/people/${userId}`,
      payload
    );
    return normalizeMembership(response.data);
  },

  removeMembership: async (fieldId: string, userId: string): Promise<void> => {
    if (isMockMode()) return;
    await api.delete(`/api/v1/fields/${fieldId}/people/${userId}`);
  },

  createInvite: async (fieldId: string, payload: CreateFieldInvitePayload): Promise<FieldInvite> => {
    if (isMockMode()) {
      const token = Math.random().toString(36).slice(2, 10);
      const shareUrl = `${window.location.origin}/invite/${token}`;
      return {
        id: token,
        token,
        fieldId,
        fieldName: 'Field',
        invitedBy: 'demo',
        role: payload.role,
        modules: payload.modules,
        accessLevel: payload.accessLevel,
        phone: payload.phone,
        email: payload.email,
        displayName: payload.displayName,
        status: 'pending',
        expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
        shareUrl,
        whatsAppUrl: `https://wa.me/?text=${encodeURIComponent(`Join this field: ${shareUrl}`)}`,
      };
    }
    const response = await api.post<FieldInvite>(`/api/v1/fields/${fieldId}/people/invites`, payload);
    return normalizeInvite(response.data);
  },

  getInvite: async (token: string): Promise<FieldInvite> => {
    const response = await api.get<FieldInvite>(`/api/v1/invites/${token}`);
    return normalizeInvite(response.data);
  },

  acceptInvite: async (token: string): Promise<FieldMembership> => {
    const response = await api.post<FieldMembership>(`/api/v1/invites/${token}/accept`);
    return normalizeMembership(response.data);
  },

  getStats: async (fieldId: string): Promise<FieldPeopleStats> => {
    if (isMockMode()) {
      return {
        fieldId,
        people: mockMemberships(fieldId).map((m) => ({
          userId: m.userId,
          displayName: m.displayName,
          role: m.role,
          modules: m.modules,
          accessLevel: m.accessLevel,
          completedTasks: 0,
          overdueTasks: 0,
          openTasks: 0,
        })),
      };
    }
    const response = await api.get<FieldPeopleStats>(`/api/v1/fields/${fieldId}/people/stats`);
    return {
      fieldId: response.data.fieldId,
      people: (response.data.people || []).map((p) => ({
        ...p,
        role: normalizeRole(p.role),
        modules: normalizeModules(p.modules),
        accessLevel: normalizeAccessLevel(p.accessLevel),
      })),
    };
  },

  addAdvisorComment: async (fieldId: string, body: string): Promise<AdvisorComment> => {
    if (isMockMode()) {
      return {
        id: Math.random().toString(36).slice(2),
        userId: 'demo',
        body,
        createdAt: new Date().toISOString(),
      };
    }
    const response = await api.post<AdvisorComment>(`/api/v1/fields/${fieldId}/people/advisor-comments`, {
      body,
    });
    return response.data;
  },
};

export const hasCapacity = (
  memberships: FieldMembership[] | undefined,
  userId: string | undefined,
  capacity: FieldCapacity
): boolean => {
  if (!memberships || !userId) return false;
  return memberships.some(
    (m) =>
      m.userId === userId &&
      m.status === 'active' &&
      capacitiesForMembership(m).includes(capacity)
  );
};

export const countSeats = (people: FieldMembership[], role: 'Partner' | 'Family') =>
  people.filter(
    (p) =>
      p.role === role &&
      !/^revoked$/i.test(p.status) &&
      !/^removed$/i.test(p.status)
  ).length;
