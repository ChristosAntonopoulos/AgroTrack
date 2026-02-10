export type Theme = 'light' | 'dark' | 'white';

export interface UserPreferences {
  theme: Theme;
  dateFormat: string;
  language: string;
  defaultView: 'dashboard' | 'fields' | 'tasks' | 'calendar';
  emailNotifications: boolean;
  taskAssignmentNotifications: boolean;
  deadlineReminders: boolean;
  lifecycleAlerts: boolean;
  reportNotifications: boolean;
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
};

const STORAGE_KEY = 'olive_lifecycle_preferences';

export const settingsService = {
  getPreferences: (): UserPreferences => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
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
