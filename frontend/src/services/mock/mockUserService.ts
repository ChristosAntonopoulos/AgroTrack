import { User } from '../userService';
import { simulateDelay } from './mockData';
import { demoStore } from '../demo/demoStore';

export const mockUserService = {
  getUsers: async (role?: string): Promise<User[]> => {
    await simulateDelay();
    demoStore.ensureSeeded();
    const users = demoStore.getUsers();
    if (role) {
      return users.filter(u => u.role === role);
    }
    return [...users];
  },

  getUser: async (id: string): Promise<User> => {
    await simulateDelay();
    demoStore.ensureSeeded();
    const user = demoStore.getUsers().find(u => u.id === id);
    if (!user) {
      throw new Error('User not found');
    }
    return { ...user };
  },
};
