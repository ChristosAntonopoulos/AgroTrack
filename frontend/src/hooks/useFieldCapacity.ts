import { useMemo } from 'react';
import type { Field } from '../services/fieldService';
import { hasCapacity, type FieldCapacity, type FieldMembership } from '../services/fieldPeopleService';
import { useAuth } from '../context/AuthContext';

export const useFieldCapacity = (field: Field | null | undefined, memberships?: FieldMembership[]) => {
  const { user } = useAuth();
  const userId = user?.userId;
  const list = memberships || field?.memberships || [];

  return useMemo(() => {
    const can = (capacity: FieldCapacity) => {
      if (list.length > 0) return hasCapacity(list, userId, capacity);
      if (!field || !userId) return false;
      if (capacity === 'own') return field.ownerId === userId || user?.role === 'FieldOwner';
      if (capacity === 'work') {
        return (
          user?.role === 'Producer' ||
          (field.assignedProducerIds || []).includes(userId) ||
          field.ownerId === userId
        );
      }
      if (capacity === 'advise') return user?.role === 'Agronomist';
      if (capacity === 'help') return (field.assignedProducerIds || []).includes(userId);
      return field.ownerId === userId || (field.assignedProducerIds || []).includes(userId);
    };

    return {
      canOwn: can('own'),
      canWork: can('work') || can('help'),
      canAdvise: can('advise') || can('own'),
      canHelp: can('help') || can('work'),
      canView: true,
      can,
    };
  }, [field, list, userId, user?.role]);
};
