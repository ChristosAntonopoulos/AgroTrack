import { normalizeLocale } from '../i18n/config';
import type { ExperienceMode, FontScale } from '../experience/types';

/** Stored preference. `system` follows the device; `white` is legacy and normalized to `light`. */
export type Theme = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
export type { ExperienceMode, FontScale };

export type DefaultView = 'dashboard' | 'fields' | 'today' | 'chronologio';

export interface UserPreferences {
  theme: Theme;
  dateFormat: string;
  language: string;
  defaultView: DefaultView | 'tasks' | 'calendar';
  emailNotifications: boolean;
  taskAssignmentNotifications: boolean;
  deadlineReminders: boolean;
  lifecycleAlerts: boolean;
  reportNotifications: boolean;
  experienceMode: ExperienceMode;
  experienceModeChosen: boolean;
  fontScale: FontScale;
  largeControls: boolean;
  everydayIntelligenceOpens: number;
  fullPictureOnrampDismissed: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  dateFormat: 'dd/MM/yyyy',
  language: 'el',
  defaultView: 'today',
  emailNotifications: true,
  taskAssignmentNotifications: true,
  deadlineReminders: true,
  lifecycleAlerts: true,
  reportNotifications: false,
  experienceMode: 'everyday',
  experienceModeChosen: false,
  fontScale: 'default',
  largeControls: false,
  everydayIntelligenceOpens: 0,
  fullPictureOnrampDismissed: false,
};

const STORAGE_KEY = 'olive_lifecycle_preferences';

const normalizeTheme = (raw: unknown): Theme => {
  if (raw === 'dark' || raw === 'light' || raw === 'system') return raw;
  if (raw === 'white') return 'light';
  return DEFAULT_PREFERENCES.theme;
};

const normalizeDefaultView = (raw: unknown): UserPreferences['defaultView'] => {
  if (raw === 'dashboard' || raw === 'calendar') return 'today';
  if (raw === 'fields' || raw === 'today' || raw === 'chronologio' || raw === 'tasks') {
    return raw;
  }
  return DEFAULT_PREFERENCES.defaultView;
};

export const resolveSystemTheme = (): ResolvedTheme => {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

export const resolveTheme = (theme: Theme): ResolvedTheme => {
  if (theme === 'system') return resolveSystemTheme();
  return theme;
};

export const pathForDefaultView = (view: UserPreferences['defaultView']): string => {
  switch (view) {
    case 'fields':
      return '/fields';
    case 'dashboard':
      return '/today';
    case 'chronologio':
      return '/chronologio';
    case 'tasks':
      return '/tasks';
    case 'calendar':
      return '/today';
    case 'today':
    default:
      return '/today';
  }
};

export const settingsService = {
  getPreferences: (): UserPreferences => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } as UserPreferences;
        parsed.language = normalizeLocale(parsed.language);
        parsed.theme = normalizeTheme(parsed.theme);
        parsed.defaultView = normalizeDefaultView(parsed.defaultView);
        if (parsed.experienceMode !== 'everyday' && parsed.experienceMode !== 'full') {
          parsed.experienceMode = 'everyday';
        }
        if (parsed.fontScale !== 'default' && parsed.fontScale !== 'large' && parsed.fontScale !== 'xl') {
          parsed.fontScale = 'default';
        }
        if (
          parsed.dateFormat !== 'dd/MM/yyyy' &&
          parsed.dateFormat !== 'MM/dd/yyyy' &&
          parsed.dateFormat !== 'yyyy-MM-dd' &&
          parsed.dateFormat !== 'medium'
        ) {
          parsed.dateFormat = DEFAULT_PREFERENCES.dateFormat;
        }
        parsed.experienceModeChosen = Boolean(parsed.experienceModeChosen);
        parsed.largeControls = Boolean(parsed.largeControls);
        parsed.everydayIntelligenceOpens = Number(parsed.everydayIntelligenceOpens) || 0;
        parsed.fullPictureOnrampDismissed = Boolean(parsed.fullPictureOnrampDismissed);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
    return { ...DEFAULT_PREFERENCES };
  },

  savePreferences: (preferences: Partial<UserPreferences>): boolean => {
    try {
      const current = settingsService.getPreferences();
      const updated = { ...current, ...preferences };
      if (preferences.theme !== undefined) {
        updated.theme = normalizeTheme(preferences.theme);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch (error) {
      console.error('Error saving preferences:', error);
      return false;
    }
  },

  resetPreferences: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error resetting preferences:', error);
    }
  },
};
