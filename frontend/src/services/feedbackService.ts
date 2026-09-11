import api from './api';

export type FeedbackSubmitted = {
  id: string;
  createdAt: string;
};

export type SubmitFeedbackPayload = {
  comment: string;
  pageUrl: string;
  screenshot?: File | null;
  photo?: File | null;
};

export const feedbackService = {
  submit: async (payload: SubmitFeedbackPayload): Promise<FeedbackSubmitted> => {
    const form = new FormData();
    if (payload.comment.trim()) form.append('comment', payload.comment.trim());
    if (payload.pageUrl.trim()) form.append('pageUrl', payload.pageUrl.trim());
    if (payload.screenshot) form.append('screenshot', payload.screenshot);
    if (payload.photo) form.append('photo', payload.photo);

    const response = await api.post<FeedbackSubmitted>('/api/v1/feedback', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
