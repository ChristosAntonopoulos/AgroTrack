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
  'This invitation code is not valid.': 'inviteInvalid',
  'Invitation codes are not available.': 'inviteUnavailable',
  'This invite is no longer valid.': 'inviteNoLongerValid',
  'This invite has expired.': 'inviteExpired',
  'This family seat is no longer pending.': 'inviteNoLongerValid',
  'This partner seat is no longer pending.': 'inviteNoLongerValid',
  'You cannot accept your own family invite.': 'inviteOwnFamily',
  'You cannot accept your own partner invite.': 'inviteOwnPartner',
  'You are already linked to this family.': 'inviteAlreadyFamily',
  'You are already linked to a family circle.': 'inviteAlreadyFamily',
  'You are already linked as a partner for this grove owner.': 'inviteAlreadyPartner',
  'This reset link is invalid or has expired.': 'resetInvalid',
  'Password must be at least 8 characters.': 'passwordTooShort',
  'Enter your first name.': 'nameRequired',
  'Name must be at most 80 characters.': 'nameTooLong',
  'Enter a valid email address.': 'emailInvalid',
  "That's already your email.": 'emailUnchanged',
  'That email is already in use.': 'emailInUse',
  'Current password is incorrect.': 'passwordIncorrect',
  'New password must be different from the current password.': 'passwordUnchanged',
  'This verification code is invalid or has expired.': 'emailCodeInvalid',
  'This account is closed.': 'accountClosed',
  'Registration cannot assign a privileged role.': 'registrationRoleDenied',
  'An unexpected error occurred.': 'generic',
  'Add a comment, a screenshot, or a photo so we can help.': 'feedbackEmpty',
  'Comment must be at most 4000 characters.': 'feedbackCommentTooLong',
  'Each image must be 6 MB or smaller.': 'feedbackImageTooLarge',
  'File type is not allowed.': 'feedbackFileType',
};

const STATUS_KEYS: Record<number, string> = {
  400: 'validation',
  401: 'unauthorized',
  403: 'unauthorized',
  404: 'notFound',
  409: 'conflict',
  422: 'validation',
  429: 'tooManyRequests',
  500: 'generic',
  502: 'network',
  503: 'network',
};

const isAxiosStatusMessage = (message: string) =>
  /^Request failed with status code \d+$/i.test(message.trim());

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

export const extractApiErrorPayload = (
  data: unknown
): { message?: string; code?: string; fieldErrors?: string[] } => {
  const payload = asRecord(data);
  if (!payload) return {};

  const error = asRecord(payload.error ?? payload.Error);
  const message =
    readString(error?.message) ||
    readString(error?.Message) ||
    readString(payload.message) ||
    readString(payload.Message);

  const code =
    readString(error?.code) || readString(error?.Code) || readString(payload.code) || readString(payload.Code);

  const rawErrors = error?.errors ?? error?.Errors ?? payload.errors ?? payload.Errors;
  const fieldErrors: string[] = [];
  if (rawErrors && typeof rawErrors === 'object') {
    for (const value of Object.values(rawErrors as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          const text = readString(item);
          if (text) fieldErrors.push(text);
        }
      } else {
        const text = readString(value);
        if (text) fieldErrors.push(text);
      }
    }
  }

  return { message, code, fieldErrors: fieldErrors.length ? fieldErrors : undefined };
};

export const extractApiErrorMessage = (data: unknown): string | undefined =>
  extractApiErrorPayload(data).message;

export const translateApiError = (t: TFunction, message: string | undefined): string => {
  if (!message || isAxiosStatusMessage(message)) return t('errors:generic');
  const key = API_MESSAGE_KEYS[message];
  if (key) return t(`errors:${key}`);
  return message;
};

const translateCandidate = (t: TFunction, text: string | undefined): string | null => {
  if (!text || isAxiosStatusMessage(text)) return null;
  const key = API_MESSAGE_KEYS[text];
  return key ? t(`errors:${key}`) : text;
};

export const getApiErrorMessage = (err: unknown, t: TFunction): string => {
  const axiosErr = err as {
    response?: { status?: number; data?: unknown };
    code?: string;
    message?: string;
  };

  if (!axiosErr?.response) {
    if (axiosErr?.code === 'ERR_NETWORK' || axiosErr?.message === 'Network Error') {
      return t('errors:network');
    }
  }

  const status = axiosErr.response?.status;
  const { message, fieldErrors } = extractApiErrorPayload(axiosErr.response?.data);

  for (const candidate of [...(fieldErrors || []), message]) {
    const translated = translateCandidate(t, candidate);
    if (translated) return translated;
  }

  if (status && STATUS_KEYS[status]) {
    return t(`errors:${STATUS_KEYS[status]}`);
  }

  if (axiosErr.message && !isAxiosStatusMessage(axiosErr.message)) {
    return translateApiError(t, axiosErr.message);
  }

  return t('errors:generic');
};
