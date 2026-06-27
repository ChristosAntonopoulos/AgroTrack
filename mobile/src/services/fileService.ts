import api, { API_BASE_URL } from './api';

export const fileService = {
  uploadImage: async (uri: string, fileName = 'photo.jpg'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: fileName,
      type: 'image/jpeg',
    } as unknown as Blob);

    const response = await api.post<{ url: string }>('/api/v1/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const url = response.data.url;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL.replace(/\/$/, '')}${url}`;
  },
};

export { API_BASE_URL };
