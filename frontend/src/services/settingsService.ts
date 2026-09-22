import { normalizeLocale } from '../i18n/config';
import type { FontScale } from '../experience/types';

/** Stored preference. `system` follows the device; `white` is legacy and normalized to `light`. */
export type Theme = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
export type { FontScale };

export type DefaultView = 'fields' | 'chronologio';

export interface NotificationDevicePreferences {
  taskAssignment: boolean;
  approval: boolean;
  harvest: boolean;
  financial: boolean;
  satelliteWeather: boolean;
  marketingSystem: boolean;
}

export interface UserPreferences {
  theme: Theme;
  dateFormat: string;
  language: string;
  defaultView: DefaultView | 'tasks';
  /** @deprecated Prefer notificationPrefs.taskAssignment */
  emailNotifications: boolean;
  /** @deprecated Prefer notificationPrefs.taskAssignment */
  taskAssignmentNotifications: boolean;
  /** @deprecated Prefer notificationPrefs.approval */
  deadlineReminders: boolean;
  /** @deprecated Prefer notificationPrefs.harvest */
  lifecycleAlerts: boolean;
  /** @deprecated Prefer notificationPrefs.marketingSystem */
  reportNotifications: boolean;
  notificationPrefs: NotificationDevicePreferences;
  fontScale: FontScale;
  largeControls: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationDevicePreferences = {
  taskAssignment: true,
  approval: true,
  harvest: true,
  financial: true,
  satelliteWeather: true,
  marketingSystem: false,
};

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  dateFormat: 'dd/MM/yyyy',
  language: 'el',
  defaultView: 'chronologio',
  emailNotifications: true,
  taskAssignmentNotifications: true,
  deadlineReminders: true,
  lifecycleAlerts: true,
  reportNotifications: false,
  notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
  fontScale: 'default',
  largeControls: false,
};

const STORAGE_KEY = 'olive_lifecycle_preferences';

const normalizeTheme = (raw: unknown): Theme => {
  if (raw === 'dark' || raw === 'light' || raw === 'system') return raw;
  if (raw === 'white') return 'light';
  return DEFAULT_PREFERENCES.theme;
};

const normalizeDefaultView = (raw: unknown): UserPreferences['defaultView'] => {
  if (raw === 'dashboard' || raw === 'calendar' || raw === 'today') return 'chronologio';
  if (raw === 'fields' || raw === 'chronologio' || raw === 'tasks') {
    return raw;
  }
  return DEFAULT_PREFERENCES.defaultView;
};

const normalizeNotificationPrefs = (
  parsed: Partial<UserPreferences> & Record<string, unknown>
): NotificationDevicePreferences => {
  const raw = (parsed.notificationPrefs || {}) as Partial<NotificationDevicePreferences>;
  return {
    taskAssignment:
      raw.taskAssignment ??
      (typeof parsed.taskAssignmentNotifications === 'boolean'
        ? parsed.taskAssignmentNotifications
        : DEFAULT_NOTIFICATION_PREFS.taskAssignment),
    approval:
      raw.approval ??
      (typeof parsed.deadlineReminders === 'boolean'
        ? parsed.deadlineReminders
        : DEFAULT_NOTIFICATION_PREFS.approval),
    harvest:
      raw.harvest ??
      (typeof parsed.lifecycleAlerts === 'boolean'
        ? parsed.lifecycleAlerts
        : DEFAULT_NOTIFICATION_PREFS.harvest),
    financial: raw.financial ?? DEFAULT_NOTIFICATION_PREFS.financial,
    satelliteWeather: raw.satelliteWeather ?? DEFAULT_NOTIFICATION_PREFS.satelliteWeather,
    marketingSystem:
      raw.marketingSystem ??
      (typeof parsed.reportNotifications === 'boolean'
        ? parsed.reportNotifications
        : DEFAULT_NOTIFICATION_PREFS.marketingSystem),
  };
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
    case 'tasks':
      return '/tasks';
    case 'chronologio':
    default:
      return '/chronologio';
  }
};

export const settingsService = {
  getPreferences: (): UserPreferences => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } as UserPreferences &
          Record<string, unknown>;
        parsed.language = normalizeLocale(parsed.language);
        parsed.theme = normalizeTheme(parsed.theme);
        parsed.defaultView = normalizeDefaultView(parsed.defaultView);
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
        parsed.largeControls = Boolean(parsed.largeControls);
        parsed.notificationPrefs = normalizeNotificationPrefs(parsed);
        // Drop retired experience-mode keys from the in-memory shape.
        const {
          experienceMode: _em,
          experienceModeChosen: _emc,
          everydayIntelligenceOpens: _eio,
          fullPictureOnrampDismissed: _fpo,
          ...clean
        } = parsed as UserPreferences & {
          experienceMode?: unknown;
          experienceModeChosen?: unknown;
          everydayIntelligenceOpens?: unknown;
          fullPictureOnrampDismissed?: unknown;
        };
        return clean;
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
    return { ...DEFAULT_PREFERENCES, notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS } };
  },

  savePreferences: (preferences: Partial<UserPreferences>): boolean => {
    try {
      const current = settingsService.getPreferences();
      const updated = { ...current, ...preferences };
      if (preferences.theme !== undefined) {
        updated.theme = normalizeTheme(preferences.theme);
      }
      if (preferences.notificationPrefs) {
        updated.notificationPrefs = {
          ...current.notificationPrefs,
          ...preferences.notificationPrefs,
        };
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
