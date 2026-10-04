import api from './api';

export type SubmitFeedbackPayload = {
  comment: string;
  pageUrl?: string;
  screenshotUri?: string | null;
  photoUri?: string | null;
};

const appendImage = (form: FormData, field: string, uri: string, fileName: string) => {
  form.append(field, {
    uri,
    name: fileName,
    type: 'image/jpeg',
  } as unknown as Blob);
};

export const feedbackService = {
  submit: async (payload: SubmitFeedbackPayload): Promise<void> => {
    const form = new FormData();
    if (payload.comment.trim()) form.append('comment', payload.comment.trim());
    form.append('pageUrl', payload.pageUrl || 'mobile');
    if (payload.screenshotUri) appendImage(form, 'screenshot', payload.screenshotUri, 'screenshot.jpg');
    if (payload.photoUri) appendImage(form, 'photo', payload.photoUri, 'photo.jpg');

    await api.post('/api/v1/feedback', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
};
