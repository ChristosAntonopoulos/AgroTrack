import type { ExperienceMode } from './types';

/**
 * Role-based default for first-run when the user has not chosen a mode yet.
 * Never override a saved choice automatically.
 */
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
