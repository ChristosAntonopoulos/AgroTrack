import type { ExperienceMode } from './types';

export const defaultExperienceModeForRole = (role: string | undefined | null): ExperienceMode => {
  switch (role) {
    case 'Agronomist':
    case 'Administrator':
      return 'full';
    case 'FieldOwner':
    case 'Producer':
    case 'ServiceProvider':
    default:
      return 'everyday';
  }
};
