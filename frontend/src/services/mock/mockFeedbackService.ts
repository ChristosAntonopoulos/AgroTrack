import type { FeedbackSubmitted, SubmitFeedbackPayload } from '../feedbackService';

export const mockFeedbackService = {
  submit: async (_payload: SubmitFeedbackPayload): Promise<FeedbackSubmitted> => {
    await new Promise((resolve) => window.setTimeout(resolve, 280));
    return { id: `mock-fb-${Date.now()}`, createdAt: new Date().toISOString() };
  },
};
