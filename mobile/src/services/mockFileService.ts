export const mockFileService = {
  uploadImage: async (uri: string, _fileName = 'photo.jpg'): Promise<string> => uri,
  uploadFile: async (uri: string, _fileName: string, _mimeType: string): Promise<string> => uri,
};
