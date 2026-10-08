import { LoginDto, RegisterDto, AuthResponse, ForgotPasswordDto, ResetPasswordDto, ForgotPasswordResponse } from '../authService';
import { demoAccounts } from '../testUsers';
import { accountOverrides } from '../accountOverrides';
import { mockUsers } from './mockData';
import { simulateDelay } from './mockData';

const resetTokens = new Map<string, { email: string; expiresAt: number }>();
const passwordOverrides = new Map<string, string>();
const registeredAccounts = new Map<string, { password: string; userId: string; role: string }>();

const retiredEmail = (userId: string, emailKey: string) => {
  const override = accountOverrides.get(userId);
  if (!override) return false;
  if (override.deleted) return true;
  return Boolean(override.email && override.email.toLowerCase() !== emailKey);
};

export const mockAuthService = {
  passwordMatches(userId: string, email: string, password: string): boolean {
    const emailKey = email.trim().toLowerCase();
    const override = accountOverrides.get(userId);
    if (override?.password) return password === override.password;
    const legacy =
      passwordOverrides.get(emailKey) ||
      (override?.email ? passwordOverrides.get(override.email.toLowerCase()) : undefined);
    if (legacy) return password === legacy;
    const registered = registeredAccounts.get(emailKey);
    if (registered?.userId === userId) return password === registered.password;
    const testUser = demoAccounts.find((u) => u.userId === userId);
    if (testUser) return password === testUser.password;
    return mockUsers.some((u) => u.id === userId);
  },

  setPassword(userId: string, email: string, password: string): void {
    const emailKey = email.trim().toLowerCase();
    accountOverrides.upsert(userId, { password, email: accountOverrides.get(userId)?.email || emailKey });
    passwordOverrides.set(emailKey, password);
    const current = accountOverrides.get(userId)?.email;
    if (current) passwordOverrides.set(current.toLowerCase(), password);
    const registered = registeredAccounts.get(emailKey);
    if (registered) registered.password = password;
  },

  login: async (data: LoginDto): Promise<AuthResponse> => {
    await simulateDelay();

    const emailKey = data.email.trim().toLowerCase();
    const renamed = accountOverrides.findByEmail(emailKey);
    if (renamed?.deleted) {
      throw new Error('Invalid email or password.');
    }

    const registeredDirect = registeredAccounts.get(emailKey);
    const registered = registeredDirect && !retiredEmail(registeredDirect.userId, emailKey)
      ? registeredDirect
      : renamed
        ? [...registeredAccounts.values()].find((row) => row.userId === renamed.userId)
        : undefined;
    const testUserRaw = demoAccounts.find((u) => u.email.toLowerCase() === emailKey)
      || (renamed ? demoAccounts.find((u) => u.userId === renamed.userId) : undefined);
    const testUser = testUserRaw && !retiredEmail(testUserRaw.userId, emailKey) ? testUserRaw : undefined;
    const mockUserRaw = mockUsers.find((u) => u.email.toLowerCase() === emailKey)
      || (renamed ? mockUsers.find((u) => u.id === renamed.userId) : undefined);
    const mockUser = mockUserRaw && !retiredEmail(mockUserRaw.id, emailKey) ? mockUserRaw : undefined;

    if (!testUser && !mockUser && !registered) {
      console.error('Mock Auth: User not found', data.email);
      throw new Error('Invalid email or password');
    }

    const candidateId = testUser?.userId || registered?.userId || mockUser?.id || renamed?.userId;
    const profilePassword = candidateId ? accountOverrides.get(candidateId)?.password : undefined;
    const override = passwordOverrides.get(emailKey);
    if (profilePassword) {
      if (data.password !== profilePassword) {
        throw new Error('Invalid email or password');
      }
    } else if (override) {
      if (data.password !== override) {
        throw new Error('Invalid email or password');
      }
    } else if (registered && data.password !== registered.password) {
      throw new Error('Invalid email or password');
    } else if (testUser && data.password !== testUser.password) {
      console.error('Mock Auth: Password mismatch for test user', data.email);
      throw new Error('Invalid email or password');
    }

    if (!profilePassword && !override && !testUser && !registered && mockUser) {
      console.log('Mock Auth: Using mock user (any password accepted)', data.email);
    }

    let userId: string;
    let role: string;
    let email = data.email;
    if (testUser) {
      userId = testUser.userId;
      role = testUser.role;
      email = testUser.email;
    } else if (registered) {
      userId = registered.userId;
      role = registered.role;
    } else if (mockUser && 'id' in mockUser) {
      userId = mockUser.id;
      role = mockUser.role;
      email = mockUser.email;
    } else {
      throw new Error('Invalid user configuration');
    }

    const token = `mock_token_${userId}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const profile = accountOverrides.get(userId);
    const mockProfile = mockUsers.find((u) => u.id === userId) || mockUsers.find((u) => u.email === email);

    return {
      token,
      userId,
      email: profile?.email || email,
      role,
      expiresAt,
      firstName: profile?.firstName ?? mockProfile?.firstName,
      lastName: profile?.lastName ?? mockProfile?.lastName,
      preferences: profile?.notificationPrefs
        ? { notifications: profile.notificationPrefs }
        : undefined,
    };
  },

  register: async (data: RegisterDto): Promise<AuthResponse> => {
    await simulateDelay();

    const emailKey = data.email.trim().toLowerCase();
    const exists =
      mockUsers.some((u) => u.email.toLowerCase() === emailKey) ||
      demoAccounts.some((u) => u.email.toLowerCase() === emailKey) ||
      registeredAccounts.has(emailKey);
    if (exists) {
      throw new Error('User with this email already exists');
    }

    const userId = `user${Date.now()}`;
    const role = data.role || 'FieldOwner';
    registeredAccounts.set(emailKey, { password: data.password, userId, role });
    const token = `mock_token_${userId}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return {
      token,
      userId,
      email: emailKey,
      role,
      expiresAt,
      firstName: data.firstName,
      lastName: data.lastName,
    };
  },

  forgotPassword: async (data: ForgotPasswordDto): Promise<ForgotPasswordResponse> => {
    await simulateDelay();
    const email = data.email.trim().toLowerCase();
    const known =
      demoAccounts.some((u) => u.email.toLowerCase() === email) ||
      mockUsers.some((u) => u.email.toLowerCase() === email) ||
      registeredAccounts.has(email);
    const token = `mock-reset-${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    if (known) {
      resetTokens.set(token, { email, expiresAt: Date.now() + 60 * 60 * 1000 });
      return { sent: true, devResetToken: token };
    }
    return { sent: true };
  },

  resetPassword: async (data: ResetPasswordDto): Promise<void> => {
    await simulateDelay();
    const entry = resetTokens.get(data.token);
    if (!entry || entry.expiresAt < Date.now()) {
      throw new Error('This reset link is invalid or has expired.');
    }
    if (!data.password || data.password.length < 8
      || !/[A-Z]/.test(data.password)
      || !/[a-z]/.test(data.password)
      || !/[0-9]/.test(data.password)) {
      throw new Error('Password must be at least 8 characters and include upper and lower case letters and a number.');
    }
    passwordOverrides.set(entry.email, data.password);
    const renamed = accountOverrides.findByEmail(entry.email);
    const demo = demoAccounts.find((u) => u.email.toLowerCase() === entry.email);
    const resetUserId = renamed?.userId || demo?.userId;
    if (resetUserId) {
      accountOverrides.upsert(resetUserId, { password: data.password });
    }
    const registered = registeredAccounts.get(entry.email);
    if (registered) {
      registered.password = data.password;
    }
    resetTokens.delete(data.token);
  },
};
