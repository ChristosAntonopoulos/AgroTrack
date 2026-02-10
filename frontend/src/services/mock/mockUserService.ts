import { User } from '../userService';
import { mockUsers, simulateDelay } from './mockData';

export const mockUserService = {
  getUsers: async (role?: string): Promise<User[]> => {
    await simulateDelay();
    if (role) {
      return mockUsers.filter(u => u.role === role);
    }
    return [...mockUsers];
  },

  getUser: async (id: string): Promise<User> => {
    await simulateDelay();
    const user = mockUsers.find(u => u.id === id);
    if (!user) {
      throw new Error('User not found');
    }
    return { ...user };
  },
};
