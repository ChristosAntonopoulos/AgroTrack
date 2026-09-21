import api, { API_BASE_URL } from './api';

const toAbsoluteUrl = (url: string) => {
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL.replace(/\/$/, '')}${url}`;
};

export const fileService = {
  uploadImage: async (uri: string, fileName = 'photo.jpg'): Promise<string> =>
    fileService.uploadFile(uri, fileName, 'image/jpeg'),

  uploadFile: async (uri: string, fileName: string, mimeType: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);

    const response = await api.post<{ url: string }>('/api/v1/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return toAbsoluteUrl(response.data.url);
  },
};

export { API_BASE_URL };
