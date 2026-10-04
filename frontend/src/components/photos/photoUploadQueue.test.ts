import { createPhotoUploadQueue, memoryPhotoJobStore } from './photoUploadQueue';
import type { PhotoJobMessages, PhotoUploadJob } from './photoUploadQueue';
import type { Photo, PhotoUploadResult } from '../../services/photoService';

const messages: PhotoJobMessages = {
  heic: 'heic',
  oversize: 'oversize',
  empty: 'empty',
  unsupported: 'unsupported',
  upload: 'upload',
};

const hash = 'ab'.repeat(32);
const capturedAt = '2024-06-01T10:00:00.000Z';

const prepare = async (file: File) => ({
  file,
  capturedAt,
  latitude: null,
  longitude: null,
  sourceHash: hash,
  transcoded: false,
});

const photo = (id: string): Photo => ({
  id,
  ownerType: 'field',
  ownerId: '',
  fieldId: '',
  mediaType: 'image',
  url: '/grove.jpg',
  uploadedByUserId: 'u1',
  effectiveCapturedAt: capturedAt,
  fieldAssignment: 'manual',
  kind: 'general',
  isLinked: false,
  createdAt: capturedAt,
  updatedAt: capturedAt,
});

const uploaded = (id = 'p1'): PhotoUploadResult => ({
  photo: photo(id),
  duplicateWarning: false,
  candidates: [],
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const jpeg = () => new File([new Uint8Array([1, 2, 3, 4])], 'grove.jpg', { type: 'image/jpeg' });

describe('photo upload queue', () => {
  it('reports progress and finishes one file at a time', async () => {
    const progress: number[] = [];
    const queue = createPhotoUploadQueue({
      store: memoryPhotoJobStore(),
      online: () => true,
      prepare,
      upload: async (_job, onProgress) => {
        onProgress(2, 4);
        progress.push(2);
        return { result: uploaded(), uploadId: 'sess-1', receivedBytes: 4 };
      },
    });

    await queue.stage([jpeg()], { messages });
    expect(queue.jobs()[0].status).toBe('staged');
    queue.startStaged();
    queue.pump();
    await flush();
    const job = queue.jobs()[0];
    expect(job.status).toBe('uploaded');
    expect(job.progress).toBe(100);
    expect(progress).toEqual([2]);
  });

  it('keeps received bytes when the network drops so the upload can resume', async () => {
    let calls = 0;
    const queue = createPhotoUploadQueue({
      store: memoryPhotoJobStore(),
      online: () => calls === 0,
      prepare,
      upload: async (job, onProgress) => {
        calls += 1;
        if (calls === 1) {
          onProgress(2, 4);
          throw new TypeError('Failed to fetch');
        }
        expect(job.receivedBytes).toBe(2);
        expect(job.uploadId).toBeNull();
        return { result: uploaded(), uploadId: 'sess-2', receivedBytes: 4 };
      },
    });

    await queue.stage([jpeg()], { messages, autoStart: true });
    queue.pump();
    await flush();
    expect(queue.jobs()[0].status).toBe('offline');
    expect(queue.jobs()[0].receivedBytes).toBe(2);

    queue.pump();
    await flush();
    expect(queue.jobs()[0].status).toBe('offline');
  });

  it('skips a photo that matches hash and capture time', async () => {
    let uploads = 0;
    const queue = createPhotoUploadQueue({
      store: memoryPhotoJobStore(),
      online: () => true,
      prepare,
      upload: async () => {
        uploads += 1;
        return { result: uploaded(), uploadId: 'sess', receivedBytes: 4 };
      },
    });

    await queue.stage([jpeg()], {
      messages,
      library: [{ contentHash: hash, capturedAt, createdAt: '2024-06-01T08:00:00.000Z' }],
    });
    expect(queue.jobs().map((job: PhotoUploadJob) => job.status)).toEqual(['duplicate']);
    queue.startStaged();
    queue.pump();
    await flush();
    expect(uploads).toBe(0);
  });

  it('retries a failed file without starting the others again', async () => {
    const sent: string[] = [];
    const queue = createPhotoUploadQueue({
      store: memoryPhotoJobStore(),
      online: () => true,
      prepare: async (file) => ({
        file,
        capturedAt,
        latitude: null,
        longitude: null,
        sourceHash: file.name === 'bad.jpg' ? 'aa'.repeat(32) : 'bb'.repeat(32),
        transcoded: false,
      }),
      upload: async (job) => {
        sent.push(job.name);
        if (job.name === 'bad.jpg' && sent.filter((name) => name === 'bad.jpg').length === 1) {
          throw Object.assign(new Error('no'), { status: 400 });
        }
        return { result: uploaded(job.name), uploadId: job.name, receivedBytes: 4 };
      },
    });

    const bad = new File([new Uint8Array([1])], 'bad.jpg', { type: 'image/jpeg' });
    const good = new File([new Uint8Array([2])], 'good.jpg', { type: 'image/jpeg' });
    await queue.stage([bad, good], { messages, autoStart: true });
    queue.pump();
    await flush();
    await flush();
    const byName = Object.fromEntries(queue.jobs().map((job) => [job.name, job.status]));
    expect(byName['bad.jpg']).toBe('failed');
    expect(byName['good.jpg']).toBe('uploaded');

    await queue.retry(queue.jobs().find((job) => job.name === 'bad.jpg')!.localId, messages);
    queue.pump();
    await flush();
    expect(queue.jobs().find((job) => job.name === 'bad.jpg')?.status).toBe('uploaded');
    expect(sent.filter((name) => name === 'good.jpg')).toEqual(['good.jpg']);
  });
});
