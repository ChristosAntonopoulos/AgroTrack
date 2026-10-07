import api from './api';

export type AdminOverviewKpis = {
  totalUsers: number;
  newUsers24h: number;
  newUsers7d: number;
  activeUsers24h: number;
  activeUsers7d: number;
  activeUsers30d: number;
  unseenFeedback: number;
  errors24h: number;
  unacknowledgedErrors: number;
};

export type AdminUserListItem = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  createdAt: string;
  lastLoginAt?: string | null;
  lastSeenAt?: string | null;
  isDeleted: boolean;
};

export type AdminUserDetail = AdminUserListItem & {
  pendingEmail?: string | null;
  experienceMode: string;
  language: string;
};

export type AdminUserPage = {
  items: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminFeedbackAttention = {
  id: string;
  userEmail?: string | null;
  userName?: string | null;
  commentExcerpt: string;
  seenAt?: string | null;
  createdAt: string;
};

export type AdminErrorListItem = {
  id: string;
  occurredAt: string;
  method: string;
  path: string;
  statusCode: number;
  errorCode: string;
  exceptionType: string;
  messageExcerpt: string;
  userId?: string | null;
  acknowledgedAt?: string | null;
};

export type AdminErrorDetail = AdminErrorListItem & {
  message: string;
  stackTrace?: string | null;
  requestId?: string | null;
};

export type AdminErrorPage = {
  items: AdminErrorListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminOverview = {
  kpis: AdminOverviewKpis;
  healthStatus: string;
  newestUsers: AdminUserListItem[];
  recentFeedback: AdminFeedbackAttention[];
  recentErrors: AdminErrorListItem[];
};

export const adminOpsService = {
  overview: async (): Promise<AdminOverview> => {
    const response = await api.get<AdminOverview>('/api/v1/admin/overview');
    return response.data;
  },

  listUsers: async (params: {
    search?: string;
    role?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
  } = {}): Promise<AdminUserPage> => {
    const response = await api.get<AdminUserPage>('/api/v1/admin/users', { params });
    return response.data;
  },

  getUser: async (id: string): Promise<AdminUserDetail> => {
    const response = await api.get<AdminUserDetail>(`/api/v1/admin/users/${id}`);
    return response.data;
  },

  listErrors: async (params: {
    page?: number;
    pageSize?: number;
    since?: string;
    pathPrefix?: string;
    statusCode?: number;
    unacknowledgedOnly?: boolean;
  } = {}): Promise<AdminErrorPage> => {
    const response = await api.get<AdminErrorPage>('/api/v1/admin/errors', { params });
    return response.data;
  },

  getError: async (id: string): Promise<AdminErrorDetail> => {
    const response = await api.get<AdminErrorDetail>(`/api/v1/admin/errors/${id}`);
    return response.data;
  },

  acknowledgeError: async (id: string): Promise<void> => {
    await api.post(`/api/v1/admin/errors/${id}/ack`);
  },
};
