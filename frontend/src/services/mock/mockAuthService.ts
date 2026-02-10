import { LoginDto, RegisterDto, AuthResponse } from '../authService';
import { testUsers } from '../testUsers';
import { mockUsers } from './mockData';
import { simulateDelay } from './mockData';

export const mockAuthService = {
  login: async (data: LoginDto): Promise<AuthResponse> => {
    await simulateDelay();
    
    // Find user by email
    const testUser = testUsers.find(u => u.email === data.email);
    const mockUser = mockUsers.find(u => u.email === data.email);
    
    if (!testUser && !mockUser) {
      console.error('Mock Auth: User not found', data.email);
      throw new Error('Invalid email or password');
    }
    
    // Check password (for test users, accept the password from testUsers config)
    if (testUser && data.password !== testUser.password) {
      console.error('Mock Auth: Password mismatch for test user', data.email);
      throw new Error('Invalid email or password');
    }
    
    // For mock users without test config, accept any password (for development convenience)
    if (!testUser && mockUser) {
      console.log('Mock Auth: Using mock user (any password accepted)', data.email);
    }
    
    // For mock users without test config, accept any password
    const user = testUser || mockUser!;
    let userId: string;
    if (testUser) {
      userId = testUser.userId;
    } else if (mockUser && 'id' in mockUser) {
      userId = mockUser.id;
    } else {
      throw new Error('Invalid user configuration');
    }
    
    // Generate a mock token
    const token = `mock_token_${userId}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    return {
      token,
      userId,
      email: user.email,
      role: user.role,
      expiresAt,
    };
  },

  register: async (data: RegisterDto): Promise<AuthResponse> => {
    await simulateDelay();
    
    // Check if user already exists
    const exists = mockUsers.some(u => u.email === data.email);
    if (exists) {
      throw new Error('User with this email already exists');
    }
    
    // Generate new user ID
    const userId = `user${Date.now()}`;
    const token = `mock_token_${userId}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    return {
      token,
      userId,
      email: data.email,
      role: data.role || 'Producer',
      expiresAt,
    };
  },
};
