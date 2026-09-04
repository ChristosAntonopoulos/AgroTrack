import api from './api';
import { isMockMode } from './serviceFactory';
import { demoStore } from './demo/demoStore';
import { EntityCache } from '../utils/entityCache';
import { isDeviceOnline, isNetworkError } from '../utils/networkStatus';

export type FieldCapacity = 'own' | 'work' | 'advise' | 'help' | 'view';

export interface FieldMembership {
  userId: string;
  displayName?: string;
  email?: string;
  capacities: FieldCapacity[];
  status: string;
  invitedBy?: string;
  createdAt: string;
}

export interface FieldInvite {
  id: string;
  token: string;
  fieldId: string;
  fieldName: string;
  invitedBy: string;
  capacities: FieldCapacity[];
  phone?: string;
  email?: string;
  displayName?: string;
  status: string;
  expiresAt: string;
  shareUrl: string;
  whatsAppUrl: string;
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
  capacities: FieldCapacity[];
  completedTasks: number;
  overdueTasks: number;
  openTasks: number;
  lastActivityAt?: string;
}

export interface FieldPeopleStats {
  fieldId: string;
  people: PersonWorkStats[];
}

const mockMemberships = (fieldId: string): FieldMembership[] => {
  demoStore.ensureSeeded();
  const field = demoStore.getFields().find((f) => f.id === fieldId);
  if (!field) return [];
  const people: FieldMembership[] = [
    {
      userId: field.ownerId,
      displayName: 'Owner',
      capacities: ['own', 'work'],
      status: 'active',
      createdAt: field.createdAt,
    },
  ];
  (field.assignedProducerIds || []).forEach((id) => {
    people.push({
      userId: id,
      displayName: 'Producer',
      capacities: ['work'],
      status: 'active',
      createdAt: field.createdAt,
    });
  });
  return people;
};

export const fieldPeopleService = {
  getPeople: async (fieldId: string): Promise<FieldMembership[]> => {
    if (isMockMode()) return mockMemberships(fieldId);

    if (!isDeviceOnline()) {
      const cached = EntityCache.getPeople(fieldId);
      if (cached) return cached.data;
      throw new Error('No cached people available offline');
    }

    try {
      const response = await api.get<FieldMembership[]>(`/api/v1/fields/${fieldId}/people`);
      EntityCache.setPeople(fieldId, response.data);
      return response.data;
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        const cached = EntityCache.getPeople(fieldId);
        if (cached) return cached.data;
      }
      throw err;
    }
  },

  upsertMembership: async (
    fieldId: string,
    userId: string,
    capacities: FieldCapacity[]
  ): Promise<FieldMembership> => {
    if (isMockMode()) {
      return {
        userId,
        capacities,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
    }
    const response = await api.put<FieldMembership>(`/api/v1/fields/${fieldId}/people/${userId}`, {
      capacities,
    });
    return response.data;
  },

  removeMembership: async (fieldId: string, userId: string): Promise<void> => {
    if (isMockMode()) return;
    await api.delete(`/api/v1/fields/${fieldId}/people/${userId}`);
  },

  createInvite: async (
    fieldId: string,
    payload: { capacities: FieldCapacity[]; phone?: string; email?: string; displayName?: string }
  ): Promise<FieldInvite> => {
    if (isMockMode()) {
      const token = Math.random().toString(36).slice(2, 10);
      const shareUrl = `${window.location.origin}/invite/${token}`;
      return {
        id: token,
        token,
        fieldId,
        fieldName: 'Field',
        invitedBy: 'demo',
        capacities: payload.capacities,
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
    return response.data;
  },

  getInvite: async (token: string): Promise<FieldInvite> => {
    const response = await api.get<FieldInvite>(`/api/v1/invites/${token}`);
    return response.data;
  },

  acceptInvite: async (token: string): Promise<FieldMembership> => {
    const response = await api.post<FieldMembership>(`/api/v1/invites/${token}/accept`);
    return response.data;
  },

  getStats: async (fieldId: string): Promise<FieldPeopleStats> => {
    if (isMockMode()) {
      return {
        fieldId,
        people: mockMemberships(fieldId).map((m) => ({
          userId: m.userId,
          displayName: m.displayName,
          capacities: m.capacities,
          completedTasks: 0,
          overdueTasks: 0,
          openTasks: 0,
        })),
      };
    }
    const response = await api.get<FieldPeopleStats>(`/api/v1/fields/${fieldId}/people/stats`);
    return response.data;
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
    (m) => m.userId === userId && m.status === 'active' && m.capacities.includes(capacity)
  );
};
