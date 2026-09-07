import api from './api';
import type { ExperienceMode, FontScale } from '../experience/types';

export type PreferenceLanguage = 'en' | 'el';

export interface UserExperiencePreferences {
  experienceMode: ExperienceMode;
  experienceModeChosen: boolean;
  fontScale: FontScale;
  largeControls: boolean;
  language: PreferenceLanguage;
}

export interface UpdateUserPreferencesInput {
  experienceMode?: ExperienceMode;
  experienceModeChosen?: boolean;
  fontScale?: FontScale;
  largeControls?: boolean;
  language?: PreferenceLanguage;
}

const normalize = (raw: Partial<UserExperiencePreferences> | null | undefined): UserExperiencePreferences => ({
  experienceMode: raw?.experienceMode === 'full' ? 'full' : 'everyday',
  experienceModeChosen: Boolean(raw?.experienceModeChosen),
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
