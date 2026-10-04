import api from './api';
import { LANDING_SUPPORT_EMAIL } from '../config/landingConfig';
import { isMockDataEnabled } from '../config/apiConfig';
import { demoStore } from './demo/demoStore';
import { accountOverrides } from './accountOverrides';
import { mockAuthService } from './mock/mockAuthService';
import {
  DEFAULT_NOTIFICATION_PREFS,
  NotificationDevicePreferences,
  settingsService,
} from './settingsService';

export type AccountUser = {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

export type EmailChangeResult = {
  sent: boolean;
  pendingEmail: string;
  devCode?: string | null;
};

export type AccountExport = {
  exportedAt: string;
  profile: Record<string, unknown>;
  preferences: unknown;
  fields: unknown[];
  notifications: unknown[];
  support: { email: string; purpose: string };
};

const normalizePrefs = (raw: Partial<NotificationDevicePreferences> | undefined | null): NotificationDevicePreferences => ({
  taskAssignment: raw?.taskAssignment ?? DEFAULT_NOTIFICATION_PREFS.taskAssignment,
  approval: raw?.approval ?? DEFAULT_NOTIFICATION_PREFS.approval,
  harvest: raw?.harvest ?? DEFAULT_NOTIFICATION_PREFS.harvest,
  financial: raw?.financial ?? DEFAULT_NOTIFICATION_PREFS.financial,
  satelliteWeather: raw?.satelliteWeather ?? DEFAULT_NOTIFICATION_PREFS.satelliteWeather,
  marketingSystem: raw?.marketingSystem ?? DEFAULT_NOTIFICATION_PREFS.marketingSystem,
});

const sixDigitCode = () => String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const accountService = {
  async loadNotificationPrefs(userId: string): Promise<NotificationDevicePreferences | null> {
    const local = accountOverrides.get(userId)?.notificationPrefs;
    if (isMockDataEnabled()) {
      return local ? normalizePrefs(local) : null;
    }
    try {
      const response = await api.get<{ notifications?: Partial<NotificationDevicePreferences> }>(
        '/api/v1/users/me/preferences'
      );
      if (!response.data?.notifications) return local ? normalizePrefs(local) : null;
      const prefs = normalizePrefs(response.data.notifications);
      accountOverrides.upsert(userId, { notificationPrefs: prefs });
      return prefs;
    } catch {
      return local ? normalizePrefs(local) : null;
    }
  },

  async saveNotificationPrefs(userId: string, prefs: NotificationDevicePreferences): Promise<boolean> {
    const normalized = normalizePrefs(prefs);
    accountOverrides.upsert(userId, { notificationPrefs: normalized });
    if (isMockDataEnabled()) return true;
    try {
      await api.put('/api/v1/users/me/preferences', { notifications: normalized });
      return true;
    } catch {
      return false;
    }
  },

  pendingEmail(userId: string): string | undefined {
    return accountOverrides.get(userId)?.pendingEmail;
  },

  async refreshPendingEmail(userId: string): Promise<string | undefined> {
    if (isMockDataEnabled()) return accountOverrides.get(userId)?.pendingEmail;
    try {
      const response = await api.get<{ pendingEmail?: string | null }>(`/api/v1/users/${userId}`);
      return response.data?.pendingEmail || undefined;
    } catch {
      return accountOverrides.get(userId)?.pendingEmail;
    }
  },

  async updateProfile(user: AccountUser, firstName: string, lastName: string): Promise<AccountUser> {
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first) throw new Error('Enter your first name.');
    if (isMockDataEnabled()) {
      accountOverrides.upsert(user.userId, { firstName: first, lastName: last, email: user.email });
      return { ...user, firstName: first, lastName: last };
    }
    const response = await api.put<AccountUser & { id?: string }>('/api/v1/users/me', {
      firstName: first,
      lastName: last,
    });
    return {
      ...user,
      firstName: response.data.firstName,
      lastName: response.data.lastName,
      email: response.data.email || user.email,
    };
  },

  async changePassword(user: AccountUser, currentPassword: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) throw new Error('Password must be at least 8 characters.');
    if (isMockDataEnabled()) {
      if (!mockAuthService.passwordMatches(user.userId, user.email, currentPassword)) {
        throw new Error('Current password is incorrect.');
      }
      if (currentPassword === newPassword) {
        throw new Error('New password must be different from the current password.');
      }
      mockAuthService.setPassword(user.userId, user.email, newPassword);
      return;
    }
    await api.post('/api/v1/users/me/password', { currentPassword, newPassword });
  },

  async requestEmailChange(user: AccountUser, newEmail: string, currentPassword: string): Promise<EmailChangeResult> {
    const email = newEmail.trim().toLowerCase();
    if (!isEmail(email)) throw new Error('Enter a valid email address.');
    if (email === user.email.trim().toLowerCase()) throw new Error("That's already your email.");
    if (isMockDataEnabled()) {
      if (!mockAuthService.passwordMatches(user.userId, user.email, currentPassword)) {
        throw new Error('Current password is incorrect.');
      }
      const taken =
        accountOverrides.findByEmail(email) ||
        demoStore.getUsers().some((row) => row.email.toLowerCase() === email && row.id !== user.userId);
      if (taken && accountOverrides.findByEmail(email)?.userId !== user.userId) {
        throw new Error('That email is already in use.');
      }
      const code = sixDigitCode();
      accountOverrides.upsert(user.userId, { email: user.email, pendingEmail: email, emailCode: code });
      return { sent: true, pendingEmail: email, devCode: code };
    }
    const response = await api.post<EmailChangeResult>('/api/v1/users/me/email', {
      newEmail: email,
      currentPassword,
    });
    accountOverrides.upsert(user.userId, { pendingEmail: response.data.pendingEmail });
    return response.data;
  },

  async confirmEmailChange(user: AccountUser, code: string): Promise<AccountUser> {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      throw new Error('This verification code is invalid or has expired.');
    }
    if (isMockDataEnabled()) {
      const row = accountOverrides.get(user.userId);
      if (!row?.pendingEmail || row.emailCode !== trimmed) {
        throw new Error('This verification code is invalid or has expired.');
      }
      accountOverrides.upsert(user.userId, {
        email: row.pendingEmail,
        pendingEmail: undefined,
        emailCode: undefined,
      });
      return { ...user, email: row.pendingEmail };
    }
    const response = await api.post<{ email: string; firstName?: string; lastName?: string }>(
      '/api/v1/users/me/email/confirm',
      { code: trimmed }
    );
    accountOverrides.upsert(user.userId, { email: response.data.email, pendingEmail: undefined });
    return { ...user, email: response.data.email };
  },

  async exportData(user: AccountUser): Promise<AccountExport> {
    if (isMockDataEnabled()) {
      const override = accountOverrides.get(user.userId);
      const fields = demoStore.getFields().map((field) => ({
        id: field.id,
        name: field.name,
        locationText: field.locationText,
        areaHectares: field.area,
        variety: field.variety,
        status: field.status,
      }));
      return {
        exportedAt: new Date().toISOString(),
        profile: {
          id: user.userId,
          email: override?.email || user.email,
          firstName: override?.firstName || user.firstName,
          lastName: override?.lastName || user.lastName,
          role: user.role,
        },
        preferences: settingsService.getPreferences(),
        fields,
        notifications: demoStore
          .getEvents()
          .filter((event) => event.type === 'task_assigned' || event.type === 'task_approved' || event.type === 'task_rejected')
          .slice(0, 50)
          .map((event) => ({
            id: event.id,
            type: event.type,
            title: event.message,
            message: event.message,
            createdAt: event.timestamp,
          })),
        support: {
          email: LANDING_SUPPORT_EMAIL,
          purpose:
            'Request a correction, a complete archive (including photos and money records), or written confirmation that grove data was deleted.',
        },
      };
    }
    const response = await api.get<AccountExport>('/api/v1/users/me/export');
    return response.data;
  },

  async deleteAccount(user: AccountUser, currentPassword: string): Promise<void> {
    if (isMockDataEnabled()) {
      if (!mockAuthService.passwordMatches(user.userId, user.email, currentPassword)) {
        throw new Error('Current password is incorrect.');
      }
      accountOverrides.upsert(user.userId, {
        deleted: true,
        email: `deleted.${user.userId}@deleted.oleachron.invalid`,
        firstName: undefined,
        lastName: undefined,
        pendingEmail: undefined,
        emailCode: undefined,
      });
      return;
    }
    await api.post('/api/v1/users/me/deletion', { currentPassword });
  },
};

export const downloadAccountExport = (data: AccountExport) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const day = data.exportedAt.slice(0, 10);
  link.href = url;
  link.download = `oleachron-export-${day}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const supportMailto = (user: AccountUser) => {
  const subject = encodeURIComponent('The Olive Lot account request');
  const body = encodeURIComponent(
    `Please help with my The Olive Lot account.\n\nRequest: correction / full export / deletion confirmation\nUser ID: ${user.userId}\nEmail: ${user.email}\n`
  );
  return `mailto:${LANDING_SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
};
