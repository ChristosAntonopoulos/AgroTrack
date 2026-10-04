import api from './api';
import { isMockMode } from './serviceFactory';
import {
  DEFAULT_FAMILY_MODULES,
  FamilyAccessLevel,
  FamilyModule,
} from './familyService';

export type { FamilyModule as PartnerModule, FamilyAccessLevel as PartnerAccessLevel };
export { DEFAULT_FAMILY_MODULES as DEFAULT_PARTNER_MODULES };

export interface OwnerPartnerChecklist {
  hasContact: boolean;
  inviteSent: boolean;
  accepted: boolean;
  hasModules: boolean;
  canCallOrMessage: boolean;
}

export interface OwnerPartnerInviteShare {
  id: string;
  token: string;
  code?: string;
  linkId: string;
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

export interface OwnerPartnerLink {
  id: string;
  displayName: string;
  phone?: string;
  email?: string;
  linkedUserId?: string;
  modules: FamilyModule[];
  accessLevel: FamilyAccessLevel;
  status: string;
  inviteId?: string;
  pendingInvite?: OwnerPartnerInviteShare | null;
  checklist: OwnerPartnerChecklist;
}

export interface OwnerPartnerSeat {
  ownerUserId: string;
  seatsUsed: number;
  seatsMax: number;
  partner?: OwnerPartnerLink | null;
}

export interface CreateOwnerPartnerInvitePayload {
  displayName: string;
  phone?: string;
  email?: string;
  modules: FamilyModule[];
  accessLevel: FamilyAccessLevel;
}

export interface UpdateOwnerPartnerLinkPayload {
  displayName?: string;
  phone?: string;
  email?: string;
  modules?: FamilyModule[];
  accessLevel?: FamilyAccessLevel;
}

export interface OwnerPartnerAccessSnapshot {
  ownerUserId: string;
  linkId: string;
  modules: FamilyModule[];
  accessLevel: FamilyAccessLevel;
}

export interface AccessContext {
  familyMemberships: Array<{
    ownerUserId: string;
    memberId: string;
    modules: FamilyModule[];
    accessLevel: FamilyAccessLevel;
    ownerDisplayName?: string;
  }>;
  partnerMemberships: OwnerPartnerAccessSnapshot[];
}

const emptySeat = (): OwnerPartnerSeat => ({
  ownerUserId: '',
  seatsUsed: 0,
  seatsMax: 1,
  partner: null,
});

export const ownerPartnerService = {
  getMine: async (): Promise<OwnerPartnerSeat> => {
    if (isMockMode()) return emptySeat();
    try {
      const response = await api.get<OwnerPartnerSeat>('/api/v1/me/partner');
      return response.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403 || status === 404) return emptySeat();
      throw err;
    }
  },

  createInvite: async (payload: CreateOwnerPartnerInvitePayload): Promise<OwnerPartnerInviteShare> => {
    const response = await api.post<OwnerPartnerInviteShare>('/api/v1/me/partner/invites', payload);
    return response.data;
  },

  updateLink: async (id: string, payload: UpdateOwnerPartnerLinkPayload): Promise<OwnerPartnerLink> => {
    const response = await api.patch<OwnerPartnerLink>(`/api/v1/me/partner/links/${id}`, payload);
    return response.data;
  },

  revokeLink: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/me/partner/links/${id}`);
  },

  getInvite: async (token: string): Promise<OwnerPartnerInviteShare> => {
    const response = await api.get<OwnerPartnerInviteShare>(`/api/v1/partner-invites/${token}`);
    return response.data;
  },

  acceptInvite: async (token: string): Promise<OwnerPartnerLink> => {
    const response = await api.post<OwnerPartnerLink>(`/api/v1/partner-invites/${token}/accept`);
    return response.data;
  },

  getMyMemberships: async (): Promise<OwnerPartnerAccessSnapshot[]> => {
    if (isMockMode()) return [];
    try {
      const response = await api.get<OwnerPartnerAccessSnapshot[]>('/api/v1/me/partner/memberships');
      return response.data;
    } catch {
      return [];
    }
  },

  getAccessContext: async (): Promise<AccessContext> => {
    if (isMockMode()) return { familyMemberships: [], partnerMemberships: [] };
    try {
      const response = await api.get<AccessContext>('/api/v1/me/access-context');
      return response.data;
    } catch {
      return { familyMemberships: [], partnerMemberships: [] };
    }
  },
};
