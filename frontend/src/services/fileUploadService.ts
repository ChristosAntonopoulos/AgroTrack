import { getApiBaseUrl } from '../config/apiConfig';
import { extractApiErrorMessage } from '../utils/translateApiError';

export const fileUploadService = {
  uploadFile: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = getApiBaseUrl() || window.location.origin;
    const token = localStorage.getItem('token');

    const response = await fetch(`${baseUrl}/api/v1/files/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(extractApiErrorMessage(body) || 'Upload failed');
    }

    const data = (await response.json()) as { url: string };
    const url = data.url.startsWith('http') ? data.url : `${baseUrl}${data.url}`;
    return url;
  },
};
