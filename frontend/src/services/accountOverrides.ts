import type { NotificationDevicePreferences } from './settingsService';

export type AccountOverride = {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  pendingEmail?: string;
  emailCode?: string;
  deleted?: boolean;
  notificationPrefs?: NotificationDevicePreferences;
};

const KEY = 'oleachron_account_overrides_v1';

const load = (): Record<string, AccountOverride> => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, AccountOverride>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const save = (map: Record<string, AccountOverride>) => {
  localStorage.setItem(KEY, JSON.stringify(map));
};

export const accountOverrides = {
  get(userId: string): AccountOverride | undefined {
    return load()[userId];
  },

  findByEmail(email: string): AccountOverride | undefined {
    const key = email.trim().toLowerCase();
    return Object.values(load()).find((row) => row.email?.toLowerCase() === key);
  },

  upsert(userId: string, patch: Partial<AccountOverride>): AccountOverride {
    const map = load();
    const next: AccountOverride = { ...map[userId], ...patch, userId };
    map[userId] = next;
    save(map);
    return next;
  },
};
