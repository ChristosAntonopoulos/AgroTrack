import { normalizeLocale } from '../i18n/config';
import type { ExperienceMode, FontScale } from '../experience/types';

export type Theme = 'light' | 'dark' | 'white';

export type { ExperienceMode, FontScale };

export interface UserPreferences {
  theme: Theme;
  dateFormat: string;
  language: string;
  defaultView: 'dashboard' | 'fields' | 'tasks' | 'calendar' | 'today';
  emailNotifications: boolean;
  taskAssignmentNotifications: boolean;
  deadlineReminders: boolean;
  lifecycleAlerts: boolean;
  reportNotifications: boolean;
  experienceMode: ExperienceMode;
  fontScale: FontScale;
  largeControls: boolean;
  /** True after the user has explicitly chosen Everyday / Full picture (first-run or settings). */
  experienceModeChosen: boolean;
  /** Count of times the user opened field-intelligence peeks while in Everyday (for on-ramp). */
  everydayIntelligenceOpens: number;
  /** True after the Full-picture on-ramp prompt was dismissed. */
  fullPictureOnrampDismissed: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  dateFormat: 'MM/dd/yyyy',
  language: 'en',
  defaultView: 'dashboard',
  emailNotifications: true,
  taskAssignmentNotifications: true,
  deadlineReminders: true,
  lifecycleAlerts: true,
  reportNotifications: false,
  experienceMode: 'everyday',
  fontScale: 'default',
  largeControls: false,
  experienceModeChosen: false,
  everydayIntelligenceOpens: 0,
  fullPictureOnrampDismissed: false,
};

const STORAGE_KEY = 'olive_lifecycle_preferences';

export const settingsService = {
  getPreferences: (): UserPreferences => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
        parsed.language = normalizeLocale(parsed.language);
        if (parsed.experienceMode !== 'everyday' && parsed.experienceMode !== 'full') {
          parsed.experienceMode = 'everyday';
        }
        if (parsed.fontScale !== 'default' && parsed.fontScale !== 'large' && parsed.fontScale !== 'xl') {
          parsed.fontScale = 'default';
        }
        parsed.largeControls = Boolean(parsed.largeControls);
        parsed.experienceModeChosen = Boolean(parsed.experienceModeChosen);
        parsed.everydayIntelligenceOpens = Number(parsed.everydayIntelligenceOpens) || 0;
        parsed.fullPictureOnrampDismissed = Boolean(parsed.fullPictureOnrampDismissed);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
    return { ...DEFAULT_PREFERENCES };
  },

  savePreferences: (preferences: Partial<UserPreferences>): void => {
    try {
      const current = settingsService.getPreferences();
      const updated = { ...current, ...preferences };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving preferences:', error);
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
