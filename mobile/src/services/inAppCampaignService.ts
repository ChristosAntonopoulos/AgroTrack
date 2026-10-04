import api from './api';

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

export const inAppMessageService = {
  getInbox: async (): Promise<InboxItem[]> => {
    try {
      const response = await api.get<InboxItem[]>('/api/v1/me/inbox');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 404) return [];
      throw error;
    }
  },

  getPendingModals: async (): Promise<InAppMessage[]> => {
    try {
      const response = await api.get<InAppMessage[]>('/api/v1/me/in-app-messages');
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
