import api from './api';
import { isMockDataEnabled } from '../config/env';

export type AccountUser = {
  userId: string;
  email: string;
};

export const accountService = {
  async deleteAccount(user: AccountUser, currentPassword: string): Promise<void> {
    if (!currentPassword.trim()) {
      throw new Error('Enter your password.');
    }
    if (isMockDataEnabled()) {
      // Demo accounts cannot be permanently deleted against the API.
      return;
    }
    await api.post('/api/v1/users/me/deletion', { currentPassword });
  },
};
