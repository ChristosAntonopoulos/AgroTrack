import {
  extractApiErrorPayload,
  getApiErrorMessage,
  translateApiError,
} from './translateApiError';

const t = ((key: string) => {
  const map: Record<string, string> = {
    'errors:generic': 'GENERIC',
    'errors:network': 'NETWORK',
    'errors:unauthorized': 'BAD_CREDENTIALS',
    'errors:userExists': 'USER_EXISTS',
    'errors:validation': 'VALIDATION',
    'errors:conflict': 'CONFLICT',
    'errors:notFound': 'NOT_FOUND',
  };
  return map[key] || key;
}) as import('i18next').TFunction;

describe('translateApiError', () => {
  it('reads PascalCase API error payloads', () => {
    const payload = extractApiErrorPayload({
      Success: false,
      Error: { Message: 'Invalid email or password.', Code: 'forbidden' },
    });
    expect(payload.message).toBe('Invalid email or password.');
    expect(payload.code).toBe('forbidden');
  });

  it('translates login forbidden errors instead of axios status text', () => {
    const err = {
      message: 'Request failed with status code 403',
      response: {
        status: 403,
        data: {
          Success: false,
          Error: { Message: 'Invalid email or password.', Code: 'forbidden' },
        },
      },
    };
    expect(getApiErrorMessage(err, t)).toBe('BAD_CREDENTIALS');
  });

  it('falls back to status mapping when body is empty', () => {
    const err = {
      message: 'Request failed with status code 403',
      response: { status: 403, data: '' },
    };
    expect(getApiErrorMessage(err, t)).toBe('BAD_CREDENTIALS');
  });

  it('translates register conflict', () => {
    const err = {
      response: {
        status: 409,
        data: {
          success: false,
          error: { message: 'User with this email already exists.', code: 'conflict' },
        },
      },
    };
    expect(getApiErrorMessage(err, t)).toBe('USER_EXISTS');
  });

  it('never surfaces raw axios status messages', () => {
    expect(translateApiError(t, 'Request failed with status code 403')).toBe('GENERIC');
  });
});
