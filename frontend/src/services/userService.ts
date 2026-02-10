import api from './api';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export const userService = {
  getUsers: async (role?: string): Promise<User[]> => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    
    const query = params.toString();
    const url = query ? `/api/v1/users?${query}` : '/api/v1/users';
    const response = await api.get<User[]>(url);
    return response.data;
  },

  getUser: async (id: string): Promise<User> => {
    const response = await api.get<User>(`/api/v1/users/${id}`);
    return response.data;
  },
};
