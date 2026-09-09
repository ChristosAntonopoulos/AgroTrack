import api from './api';
import { isMockMode } from './serviceFactory';

export type FamilyModule = 'fields' | 'tasks' | 'documents' | 'money' | 'calendar' | 'harvest';
export type FamilyAccessLevel = 'view' | 'help' | 'work';

export const FAMILY_MODULES: FamilyModule[] = [
  'fields',
  'tasks',
  'documents',
  'money',
  'calendar',
  'harvest',
];

export const DEFAULT_FAMILY_MODULES: FamilyModule[] = ['fields', 'tasks', 'calendar'];

export interface FamilyMemberChecklist {
  hasContact: boolean;
  inviteSent: boolean;
  accepted: boolean;
  hasModules: boolean;
  canCallOrMessage: boolean;
}

export interface FamilyInviteShare {
  id: string;
  token: string;
  memberId: string;
  displayName?: string;
  phone?: string;
  email?: string;
  modules: FamilyModule[];
  accessLevel: FamilyAccessLevel;
  status: string;
  expiresAt: string;
  ownerDisplayName?: string;
  shareUrl: string;
  whatsAppUrl: string;
  mailtoUrl: string;
  smsUrl: string;
}

export interface FamilyMember {
  id: string;
  circleId: string;
  displayName: string;
  phone?: string;
  email?: string;
  linkedUserId?: string;
  modules: FamilyModule[];
  accessLevel: FamilyAccessLevel;
  status: string;
  inviteId?: string;
  pendingInvite?: FamilyInviteShare | null;
  checklist: FamilyMemberChecklist;
}

export interface FamilyCircle {
  id: string;
  ownerUserId: string;
  seatsUsed: number;
  seatsMax: number;
  members: FamilyMember[];
}

export interface CreateFamilyInvitePayload {
  displayName: string;
  phone?: string;
  email?: string;
  modules: FamilyModule[];
  accessLevel: FamilyAccessLevel;
}

export interface UpdateFamilyMemberPayload {
  displayName?: string;
  phone?: string;
  email?: string;
  modules?: FamilyModule[];
  accessLevel?: FamilyAccessLevel;
}

export interface FamilyAccessSnapshot {
  ownerUserId: string;
  memberId: string;
  modules: FamilyModule[];
  accessLevel: FamilyAccessLevel;
}

const emptyCircle = (): FamilyCircle => ({
  id: '',
  ownerUserId: '',
  seatsUsed: 0,
  seatsMax: 2,
  members: [],
});

export const familyService = {
  getMine: async (): Promise<FamilyCircle> => {
    if (isMockMode()) return emptyCircle();
    try {
      const response = await api.get<FamilyCircle>('/api/v1/me/family', {
        skipUnauthorizedHandler: true,
      });
      return response.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403 || status === 404) return emptyCircle();
      throw err;
    }
  },

  createInvite: async (payload: CreateFamilyInvitePayload): Promise<FamilyInviteShare> => {
    const response = await api.post<FamilyInviteShare>('/api/v1/me/family/invites', payload);
    return response.data;
  },

  updateMember: async (id: string, payload: UpdateFamilyMemberPayload): Promise<FamilyMember> => {
    const response = await api.patch<FamilyMember>(`/api/v1/me/family/members/${id}`, payload);
    return response.data;
  },

  revokeMember: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/me/family/members/${id}`);
  },

  getInvite: async (token: string): Promise<FamilyInviteShare> => {
    const response = await api.get<FamilyInviteShare>(`/api/v1/family-invites/${token}`, {
      skipUnauthorizedHandler: true,
    });
    return response.data;
  },

  acceptInvite: async (token: string): Promise<FamilyMember> => {
    const response = await api.post<FamilyMember>(`/api/v1/family-invites/${token}/accept`);
    return response.data;
  },

  getMyMemberships: async (): Promise<FamilyAccessSnapshot[]> => {
    if (isMockMode()) return [];
    try {
      const response = await api.get<FamilyAccessSnapshot[]>('/api/v1/me/family/memberships', {
        skipUnauthorizedHandler: true,
      });
      return response.data;
    } catch {
      return [];
    }
  },
};
