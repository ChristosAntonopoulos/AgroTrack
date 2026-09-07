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
};
