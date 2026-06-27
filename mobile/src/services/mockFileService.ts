/** Mock uploads return the local URI (no backend round-trip). */
export const mockFileService = {
  uploadImage: async (uri: string, _fileName = 'photo.jpg'): Promise<string> => uri,
};
