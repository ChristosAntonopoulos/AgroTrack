import axios from 'axios';

export function isDeviceOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return !!error && typeof error === 'object' && 'message' in error && (error as { message?: string }).message === 'Network Error';
  }
  return !error.response;
}

export function createTempTaskId(): string {
  return `temp-task-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

export function createTempFieldId(): string {
  return `temp-field-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}
