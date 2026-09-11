import { LoginDto, RegisterDto, AuthResponse, ForgotPasswordDto, ResetPasswordDto, ForgotPasswordResponse } from '../authService';
import { demoAccounts } from '../testUsers';
import { mockUsers } from './mockData';
import { simulateDelay } from './mockData';

const resetTokens = new Map<string, { email: string; expiresAt: number }>();
const passwordOverrides = new Map<string, string>();
const registeredAccounts = new Map<string, { password: string; userId: string; role: string }>();

export const mockAuthService = {
  login: async (data: LoginDto): Promise<AuthResponse> => {
    await simulateDelay();

    const emailKey = data.email.trim().toLowerCase();
    const registered = registeredAccounts.get(emailKey);
    const testUser = demoAccounts.find((u) => u.email === data.email);
    const mockUser = mockUsers.find((u) => u.email === data.email);

    if (!testUser && !mockUser && !registered) {
      console.error('Mock Auth: User not found', data.email);
      throw new Error('Invalid email or password');
    }

    const override = passwordOverrides.get(emailKey);
    if (override) {
      if (data.password !== override) {
        throw new Error('Invalid email or password');
      }
    } else if (registered && data.password !== registered.password) {
      throw new Error('Invalid email or password');
    } else if (testUser && data.password !== testUser.password) {
      console.error('Mock Auth: Password mismatch for test user', data.email);
      throw new Error('Invalid email or password');
    }

    if (!override && !testUser && !registered && mockUser) {
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
    const mockProfile = mockUsers.find((u) => u.email === email);

    return {
      token,
      userId,
      email,
      role,
      expiresAt,
      firstName: mockProfile?.firstName,
      lastName: mockProfile?.lastName,
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
    if (!data.password || data.password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }
    passwordOverrides.set(entry.email, data.password);
    const registered = registeredAccounts.get(entry.email);
    if (registered) {
      registered.password = data.password;
    }
    resetTokens.delete(data.token);
  },
};
