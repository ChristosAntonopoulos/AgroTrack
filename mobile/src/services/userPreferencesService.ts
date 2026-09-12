import api from './api';
import type { FontScale } from '../experience/types';

export type PreferenceLanguage = 'en' | 'el';

export interface UserExperiencePreferences {
  fontScale: FontScale;
  largeControls: boolean;
  language: PreferenceLanguage;
}

export interface UpdateUserPreferencesInput {
  fontScale?: FontScale;
  largeControls?: boolean;
  language?: PreferenceLanguage;
}

const normalize = (raw: Partial<UserExperiencePreferences> | null | undefined): UserExperiencePreferences => ({
  fontScale: raw?.fontScale === 'large' || raw?.fontScale === 'xl' ? raw.fontScale : 'default',
  largeControls: Boolean(raw?.largeControls),
  language: raw?.language === 'el' ? 'el' : 'en',
});

export const userPreferencesService = {
  get: async (): Promise<UserExperiencePreferences> => {
    const response = await api.get<Partial<UserExperiencePreferences>>('/api/v1/users/me/preferences');
    return normalize(response.data);
  },

  update: async (input: UpdateUserPreferencesInput): Promise<UserExperiencePreferences> => {
    const response = await api.put<Partial<UserExperiencePreferences>>(
      '/api/v1/users/me/preferences',
      input
    );
    return normalize(response.data);
  },
};
