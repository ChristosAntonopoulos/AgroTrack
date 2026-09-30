import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const TOKEN_KEY = '@Oleachron/expoPushToken';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const resolveProjectId = (): string | undefined =>
  Constants.expoConfig?.extra?.eas?.projectId ??
  (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

const normalizeInviteToken = (data: Record<string, unknown> | undefined): string | null => {
  if (!data) return null;
  if (typeof data.token === 'string' && data.token.trim()) return data.token.trim();
  if (typeof data.path === 'string') {
    const match = data.path.match(/\/invite\/([^/?#]+)/);
    if (match?.[1]) return match[1];
  }
  return null;
};

export const pushNotificationService = {
  /** Request permission (if needed) and register the Expo token with the API. */
  registerForUser: async (): Promise<string | null> => {
    try {
      const existing = await Notifications.getPermissionsAsync();
      let status = existing.status;
      if (status !== 'granted') {
        const asked = await Notifications.requestPermissionsAsync();
        status = asked.status;
      }
      if (status !== 'granted') {
        return null;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const projectId = resolveProjectId();
      const push = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      const expoPushToken = push.data;
      if (!expoPushToken) return null;

      await api.post('/api/v1/me/push-tokens', {
        expoPushToken,
        platform: Platform.OS,
      });
      await AsyncStorage.setItem(TOKEN_KEY, expoPushToken);
      return expoPushToken;
    } catch (error) {
      if (__DEV__) {
        console.warn('Push registration skipped:', error);
      }
      return null;
    }
  },

  /** Clear local + server tokens on logout. */
  clearForUser: async (): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem(TOKEN_KEY);
      if (stored) {
        await api
          .delete('/api/v1/me/push-tokens', { data: { expoPushToken: stored } })
          .catch(() => undefined);
      } else {
        await api.delete('/api/v1/me/push-tokens').catch(() => undefined);
      }
    } catch {
      /* ignore logout cleanup failures */
    } finally {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  },

  extractInviteTokenFromNotificationData: normalizeInviteToken,
};
