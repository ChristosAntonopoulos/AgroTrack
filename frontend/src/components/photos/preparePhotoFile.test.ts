import { preparePhotoFile } from './preparePhotoFile';

describe('preparePhotoFile', () => {
  const meta = {
    capturedAt: '2024-09-01T09:30:00.000Z',
    latitude: 37.9,
    longitude: 23.7,
  };

  it('keeps JPEG bytes and reads capture metadata', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'grove.jpg', { type: 'image/jpeg' });
    const prepared = await preparePhotoFile(file, {
      readMeta: async () => meta,
      hash: async () => 'a'.repeat(64),
    });
    expect(prepared.transcoded).toBe(false);
    expect(prepared.file).toBe(file);
    expect(prepared.capturedAt).toBe(meta.capturedAt);
    expect(prepared.latitude).toBe(37.9);
    expect(prepared.sourceHash).toHaveLength(64);
  });

  it('turns HEIC into JPEG without asking the grower to export', async () => {
    const file = new File([new Uint8Array([9, 9])], 'iphone.HEIC', { type: '' });
    const prepared = await preparePhotoFile(file, {
      readMeta: async () => meta,
      convertHeic: async () => new Blob([new Uint8Array([4, 5])], { type: 'image/jpeg' }),
      hash: async () => 'b'.repeat(64),
    });
    expect(prepared.transcoded).toBe(true);
    expect(prepared.file.type).toBe('image/jpeg');
    expect(prepared.file.name).toBe('iphone.jpg');
    expect(prepared.sourceHash).toHaveLength(64);
    expect(prepared.capturedAt).toBe(meta.capturedAt);
  });
});
