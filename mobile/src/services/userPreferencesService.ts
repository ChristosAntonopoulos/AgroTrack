import api from './api';
import type { FontScale } from '../experience/types';

export type PreferenceLanguage = 'en' | 'el' | 'it';

/** Same device inbox switches as the web settings page. */
export interface NotificationDevicePreferences {
  taskAssignment: boolean;
  approval: boolean;
  harvest: boolean;
  financial: boolean;
  satelliteWeather: boolean;
  marketingSystem: boolean;
}

export const NOTIFICATION_PREF_KEYS: Array<keyof NotificationDevicePreferences> = [
  'taskAssignment',
  'approval',
  'harvest',
  'financial',
  'satelliteWeather',
  'marketingSystem',
];

export const DEFAULT_NOTIFICATION_PREFS: NotificationDevicePreferences = {
  taskAssignment: true,
  approval: true,
  harvest: true,
  financial: true,
  satelliteWeather: true,
  marketingSystem: true,
};

export const normalizeNotificationPrefs = (
  raw: Partial<NotificationDevicePreferences> | null | undefined
): NotificationDevicePreferences => ({
  taskAssignment: raw?.taskAssignment ?? DEFAULT_NOTIFICATION_PREFS.taskAssignment,
  approval: raw?.approval ?? DEFAULT_NOTIFICATION_PREFS.approval,
  harvest: raw?.harvest ?? DEFAULT_NOTIFICATION_PREFS.harvest,
  financial: raw?.financial ?? DEFAULT_NOTIFICATION_PREFS.financial,
  satelliteWeather: raw?.satelliteWeather ?? DEFAULT_NOTIFICATION_PREFS.satelliteWeather,
  marketingSystem: raw?.marketingSystem ?? DEFAULT_NOTIFICATION_PREFS.marketingSystem,
});

export interface UserExperiencePreferences {
  fontScale: FontScale;
  largeControls: boolean;
  language: PreferenceLanguage;
  notifications: NotificationDevicePreferences;
}

export interface UpdateUserPreferencesInput {
  fontScale?: FontScale;
  largeControls?: boolean;
  language?: PreferenceLanguage;
  notifications?: NotificationDevicePreferences;
}

const normalize = (raw: Partial<UserExperiencePreferences> | null | undefined): UserExperiencePreferences => ({
  fontScale: raw?.fontScale === 'large' || raw?.fontScale === 'xl' ? raw.fontScale : 'default',
  largeControls: Boolean(raw?.largeControls),
  language: raw?.language === 'el' ? 'el' : raw?.language === 'it' ? 'it' : 'en',
  notifications: normalizeNotificationPrefs(raw?.notifications),
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
