import api from './api';

export type LocalizedText = { en: string; el: string };

export type CampaignPlacements = { inbox: boolean; modal: boolean };

export type CampaignAudience = { roles: string[] };

export type CampaignOption = {
  id: string;
  label: LocalizedText;
};

export type CampaignQuestion = {
  id: string;
  type: 'yes_no' | 'single' | 'multi' | 'short_text' | string;
  prompt: LocalizedText;
  required: boolean;
  options: CampaignOption[];
};

export type CampaignPayload = {
  ctaLabelEn?: string | null;
  ctaLabelEl?: string | null;
  ctaUrl?: string | null;
  showResultsAfterVote: boolean;
  questions: CampaignQuestion[];
};

export type InAppCampaign = {
  id: string;
  kind: 'announcement' | 'questionnaire' | 'poll' | string;
  status: 'draft' | 'published' | 'archived' | string;
  title: LocalizedText;
  body: LocalizedText;
  placements: CampaignPlacements;
  priority: 'critical' | 'high' | 'medium' | 'low' | string;
  audience: CampaignAudience;
  startsAt?: string | null;
  endsAt?: string | null;
  modalDismissible: boolean;
  publishedAt?: string | null;
  payload: CampaignPayload;
  createdAt: string;
  updatedAt: string;
};

export type UpsertInAppCampaign = {
  kind: string;
  title: LocalizedText;
  body: LocalizedText;
  placements: CampaignPlacements;
  priority: string;
  audience: CampaignAudience;
  startsAt?: string | null;
  endsAt?: string | null;
  modalDismissible: boolean;
  payload: CampaignPayload;
};

export type InboxItem = {
  id: string;
  source: 'transactional' | 'campaign' | string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  campaignId?: string | null;
  campaignKind?: string | null;
  isRead: boolean;
  isCompleted: boolean;
  createdAt: string;
};

export type InAppMessageOption = { id: string; label: string };

export type InAppMessageQuestion = {
  id: string;
  type: string;
  prompt: string;
  required: boolean;
  options: InAppMessageOption[];
  selectedOptionIds?: string[] | null;
  textValue?: string | null;
};

export type PollResultOption = {
  optionId: string;
  label: string;
  count: number;
};

export type InAppMessage = {
  id: string;
  kind: string;
  priority: string;
  title: string;
  body: string;
  modalDismissible: boolean;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  showResultsAfterVote: boolean;
  questions: InAppMessageQuestion[];
  engagementStatus: string;
  hasResponded: boolean;
  pollResults?: PollResultOption[] | null;
};

export type RespondAnswer = {
  questionId: string;
  optionIds?: string[];
  textValue?: string;
};

export type CampaignResponses = {
  campaignId: string;
  deliveredCount: number;
  seenCount: number;
  dismissedCount: number;
  completedCount: number;
  questionTallies: Array<{
    questionId: string;
    prompt: string;
    type: string;
    options: Array<{ optionId: string; label: string; count: number }>;
    textAnswerCount: number;
  }>;
  recentAnswers: Array<{
    userDisplayName: string;
    userRole?: string | null;
    questionId: string;
    optionIds: string[];
    textValue?: string | null;
    submittedAt: string;
  }>;
};

export const inAppMessageService = {
  getInbox: async (): Promise<InboxItem[]> => {
    try {
      const response = await api.get<InboxItem[]>('/api/v1/me/inbox', {
        skipUnauthorizedHandler: true,
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 404) return [];
      throw error;
    }
  },

  getPendingModals: async (): Promise<InAppMessage[]> => {
    try {
      const response = await api.get<InAppMessage[]>('/api/v1/me/in-app-messages', {
        skipUnauthorizedHandler: true,
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 404) return [];
      throw error;
    }
  },

  getMessage: async (id: string): Promise<InAppMessage> => {
    const response = await api.get<InAppMessage>(`/api/v1/me/in-app-messages/${id}`);
    return response.data;
  },

  markSeen: async (id: string): Promise<void> => {
    await api.post(`/api/v1/me/in-app-messages/${id}/seen`);
  },

  dismiss: async (id: string): Promise<void> => {
    await api.post(`/api/v1/me/in-app-messages/${id}/dismiss`);
  },

  respond: async (id: string, answers: RespondAnswer[]): Promise<InAppMessage> => {
    const response = await api.post<InAppMessage>(`/api/v1/me/in-app-messages/${id}/respond`, {
      answers,
    });
    return response.data;
  },
};

export const adminCampaignService = {
  list: async (): Promise<InAppCampaign[]> => {
    const response = await api.get<InAppCampaign[]>('/api/v1/admin/campaigns');
    return Array.isArray(response.data) ? response.data : [];
  },

  get: async (id: string): Promise<InAppCampaign> => {
    const response = await api.get<InAppCampaign>(`/api/v1/admin/campaigns/${id}`);
    return response.data;
  },

  create: async (payload: UpsertInAppCampaign): Promise<InAppCampaign> => {
    const response = await api.post<InAppCampaign>('/api/v1/admin/campaigns', payload);
    return response.data;
  },

  update: async (id: string, payload: UpsertInAppCampaign): Promise<InAppCampaign> => {
    const response = await api.put<InAppCampaign>(`/api/v1/admin/campaigns/${id}`, payload);
    return response.data;
  },

  publish: async (id: string): Promise<InAppCampaign> => {
    const response = await api.post<InAppCampaign>(`/api/v1/admin/campaigns/${id}/publish`);
    return response.data;
  },

  archive: async (id: string): Promise<InAppCampaign> => {
    const response = await api.post<InAppCampaign>(`/api/v1/admin/campaigns/${id}/archive`);
    return response.data;
  },

  getResponses: async (id: string): Promise<CampaignResponses> => {
    const response = await api.get<CampaignResponses>(`/api/v1/admin/campaigns/${id}/responses`);
    return response.data;
  },
};

export type AdminFeedbackListItem = {
  id: string;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  role: string;
  commentExcerpt: string;
  pageUrl?: string | null;
  hasScreenshot: boolean;
  hasPhoto: boolean;
  seenAt?: string | null;
  createdAt: string;
};

export type AdminFeedbackDetail = {
  id: string;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  role: string;
  comment: string;
  pageUrl?: string | null;
  userAgent?: string | null;
  screenshotUrl?: string | null;
  photoUrl?: string | null;
  seenAt?: string | null;
  createdAt: string;
};

export type AdminFeedbackPage = {
  items: AdminFeedbackListItem[];
  total: number;
  unseenCount: number;
  page: number;
  pageSize: number;
};

export const adminFeedbackService = {
  list: async (page = 1, pageSize = 30): Promise<AdminFeedbackPage> => {
    const response = await api.get<AdminFeedbackPage>('/api/v1/admin/feedback', {
      params: { page, pageSize },
    });
    return response.data;
  },

  get: async (id: string): Promise<AdminFeedbackDetail> => {
    const response = await api.get<AdminFeedbackDetail>(`/api/v1/admin/feedback/${id}`);
    return response.data;
  },

  markSeen: async (id: string): Promise<void> => {
    await api.post(`/api/v1/admin/feedback/${id}/seen`);
  },
};
