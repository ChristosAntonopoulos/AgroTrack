import api from './api';
import { Field } from './fieldService';

export type FieldCapacity = 'own' | 'work' | 'advise' | 'help' | 'view';

export interface FieldMembership {
  userId: string;
  displayName?: string;
  email?: string;
  capacities: FieldCapacity[];
  status: string;
  fieldId?: string;
  fieldName?: string;
}

export interface FieldInvite {
  id: string;
  token: string;
  fieldId: string;
  fieldName: string;
  capacities?: FieldCapacity[];
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

const fallbackPeople = (field: Field): FieldMembership[] => {
  const people: FieldMembership[] = [];
  if (field.ownerId) {
    people.push({
      userId: field.ownerId,
      displayName: 'Owner',
      capacities: ['own', 'work'],
      status: 'active',
      fieldId: field.id,
      fieldName: field.name,
    });
  }
  (field.assignedProducerIds || []).forEach((id) => {
    people.push({
      userId: id,
      displayName: 'Producer',
      capacities: ['work'],
      status: 'active',
      fieldId: field.id,
      fieldName: field.name,
    });
  });
  return people;
};

export const fieldPeopleService = {
  getPeople: async (fieldId: string, field?: Field): Promise<FieldMembership[]> => {
    try {
      const response = await api.get<FieldMembership[]>(`/api/v1/fields/${fieldId}/people`);
      return response.data.map((person) => ({
        ...person,
        fieldId,
        fieldName: field?.name,
      }));
    } catch {
      return field ? fallbackPeople(field) : [];
    }
  },

  createInvite: async (
    fieldId: string,
    payload: { capacities: FieldCapacity[]; phone?: string; email?: string; displayName?: string }
  ): Promise<FieldInvite> => {
    const response = await api.post<FieldInvite>(`/api/v1/fields/${fieldId}/people/invites`, payload);
    return response.data;
  },

  upsertMembership: async (fieldId: string, userId: string, capacities: FieldCapacity[]): Promise<FieldMembership> => {
    const response = await api.put<FieldMembership>(`/api/v1/fields/${fieldId}/people/${userId}`, { capacities });
    return response.data;
  },

  removeMembership: async (fieldId: string, userId: string): Promise<void> => {
    await api.delete(`/api/v1/fields/${fieldId}/people/${userId}`);
  },

  getInvite: async (token: string): Promise<FieldInvite> => {
    const response = await api.get<FieldInvite>(`/api/v1/invites/${token}`);
    return response.data;
  },

  acceptInvite: async (token: string): Promise<FieldMembership> => {
    const response = await api.post<FieldMembership>(`/api/v1/invites/${token}/accept`);
    return response.data;
  },

  addAdvisorComment: async (fieldId: string, body: string): Promise<AdvisorComment> => {
    const response = await api.post<AdvisorComment>(`/api/v1/fields/${fieldId}/people/advisor-comments`, {
      body,
    });
    return response.data;
  },
};
