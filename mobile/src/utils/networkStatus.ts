import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';

export async function isDeviceOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected ?? true;
}

export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  return !error.response;
}

export function createTempTaskId(): string {
  return `temp-task-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

export function createTempNoteId(): string {
  return `temp-note-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}
