import { TFunction } from 'i18next';

const API_MESSAGE_KEYS: Record<string, string> = {
  'Invalid email or password.': 'unauthorized',
  'User with this email already exists.': 'userExists',
  'Field not found.': 'fieldNotFound',
  'Task not found.': 'taskNotFound',
  'Lifecycle not found for this field.': 'lifecycleNotFound',
  'You do not have access to this field.': 'accessDenied',
  'You do not have permission to update this field.': 'permissionDenied',
  'You do not have permission to delete this field.': 'permissionDenied',
  'JWT secret key is not configured.': 'jwtNotConfigured',
  'An error occurred during registration.': 'registrationFailed',
  'An error occurred during login.': 'loginFailed',
  'An error occurred while retrieving fields.': 'retrieveFields',
  'An error occurred while retrieving the field.': 'retrieveField',
  'An error occurred while creating the field.': 'createField',
  'An error occurred while updating the field.': 'updateField',
  'An error occurred while deleting the field.': 'deleteField',
  'An error occurred while retrieving tasks.': 'retrieveTasks',
  'An error occurred while retrieving the lifecycle.': 'retrieveLifecycle',
  'An error occurred while initializing the lifecycle.': 'initLifecycle',
  'An error occurred while progressing the lifecycle.': 'progressLifecycle',
};

export const translateApiError = (t: TFunction, message: string | undefined): string => {
  if (!message) return t('errors:generic');
  const key = API_MESSAGE_KEYS[message];
  if (key) return t(`errors:${key}`);
  return message;
};

export const extractApiErrorMessage = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object') return undefined;
  const payload = data as { message?: string; error?: { message?: string } };
  return payload.error?.message ?? payload.message;
};

export const getApiErrorMessage = (err: unknown, t: TFunction): string => {
  const responseData = (err as { response?: { data?: unknown } })?.response?.data;
  const axiosMsg = extractApiErrorMessage(responseData);
  if (axiosMsg) return translateApiError(t, axiosMsg);
  if (err instanceof Error && err.message) return translateApiError(t, err.message);
  return t('errors:generic');
};
