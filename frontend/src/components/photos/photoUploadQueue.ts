import { isDeviceOnline } from '../../utils/networkStatus';
import {
  PhotoUploadRequestError,
  photoService,
  type PhotoUploadResult,
} from '../../services/photoService';
import { classifyPhotoFile, type PhotoFileIssue } from './photoUploadRules';
import { isPhotoDuplicate, type HashCapture } from './photoDuplicates';
import { isHeicFile, preparePhotoFile } from './preparePhotoFile';

export type PhotoJobStatus =
  | 'converting'
  | 'staged'
  | 'queued'
  | 'uploading'
  | 'uploaded'
  | 'failed'
  | 'duplicate'
  | 'offline';

export type PhotoUploadJob = {
  localId: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  file: File;
  previewUrl: string;
  status: PhotoJobStatus;
  error: string | null;
  progress: number;
  uploadId: string | null;
  receivedBytes: number;
  allowDuplicate: boolean;
  contentHash: string | null;
  capturedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  sourceHash: string | null;
  transcoded: boolean;
  fieldId: string | null;
  result?: PhotoUploadResult;
  createdAt: number;
};

export type PhotoJobMessages = {
  heic: string;
  oversize: string;
  empty: string;
  unsupported: string;
  upload: string;
};

type PersistedPhotoJob = Omit<PhotoUploadJob, 'file' | 'previewUrl'>;

export type PhotoJobStore = {
  list: () => Promise<PersistedPhotoJob[]>;
  put: (job: PersistedPhotoJob) => Promise<void>;
  delete: (localId: string) => Promise<void>;
};

type UploadFn = (
  job: PhotoUploadJob,
  onProgress: (received: number, total: number) => void
) => Promise<{ result: PhotoUploadResult; uploadId: string; receivedBytes: number }>;

const DB_NAME = 'oleachron-photo-uploads';
const STORE = 'jobs';

const newLocalId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const previewFor = (blob: Blob) => {
  if (!blob.type.startsWith('image/') || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return '';
  }
  try {
    return URL.createObjectURL(blob);
  } catch {
    return '';
  }
};

const revokePreview = (url: string) => {
  if (url && typeof URL !== 'undefined') URL.revokeObjectURL(url);
};

const toPersisted = (job: PhotoUploadJob): PersistedPhotoJob => {
  const { file: _file, previewUrl: _preview, ...persisted } = job;
  return persisted;
};

const fileFrom = (job: PersistedPhotoJob): File =>
  new File([job.blob], job.name, { type: job.type, lastModified: job.createdAt });

const issueMessage = (issue: PhotoFileIssue, messages: PhotoJobMessages) => {
  if (issue === 'oversize') return messages.oversize;
  if (issue === 'empty') return messages.empty;
  return messages.unsupported;
};

export const memoryPhotoJobStore = (): PhotoJobStore => {
  const map = new Map<string, PersistedPhotoJob>();
  return {
    list: async () => Array.from(map.values()),
    put: async (job) => {
      map.set(job.localId, job);
    },
    delete: async (localId) => {
      map.delete(localId);
    },
  };
};

const idbStore = (): PhotoJobStore => {
  const memory = memoryPhotoJobStore();
  let dbPromise: Promise<IDBDatabase | null> | null = null;

  const open = () => {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'localId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
    return dbPromise;
  };

  const txDone = (tx: IDBTransaction) =>
    new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

  return {
    list: async () => {
      const db = await open();
      if (!db) return memory.list();
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).getAll();
      const rows = await new Promise<PersistedPhotoJob[]>((resolve, reject) => {
        request.onsuccess = () => resolve((request.result as PersistedPhotoJob[]) || []);
        request.onerror = () => reject(request.error);
      });
      return rows;
    },
    put: async (job) => {
      await memory.put(job);
      const db = await open();
      if (!db) return;
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(job);
      await txDone(tx);
    },
    delete: async (localId) => {
      await memory.delete(localId);
      const db = await open();
      if (!db) return;
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(localId);
      await txDone(tx);
    },
  };
};

const defaultUpload: UploadFn = (job, onProgress) =>
  photoService.uploadResumable(job.file, {
    uploadId: job.uploadId,
    receivedBytes: job.receivedBytes,
    allowDuplicates: job.allowDuplicate,
    capturedAt: job.capturedAt,
    latitude: job.latitude,
    longitude: job.longitude,
    sourceHash: job.sourceHash,
    transcoded: job.transcoded,
    onProgress,
  });

const pauseForLater = (error: unknown) => {
  if (!isDeviceOnline()) return true;
  if (error instanceof PhotoUploadRequestError) {
    return error.status == null || error.status >= 500;
  }
  return error instanceof TypeError;
};

export type PhotoUploadQueue = {
  jobs: () => PhotoUploadJob[];
  subscribe: (listener: (jobs: PhotoUploadJob[]) => void) => () => void;
  hydrate: () => Promise<void>;
  stage: (
    files: File[],
    options: {
      library?: HashCapture[];
      fieldId?: string | null;
      autoStart?: boolean;
      messages: PhotoJobMessages;
    }
  ) => Promise<string[]>;
  startStaged: () => void;
  retry: (localId: string, messages: PhotoJobMessages) => Promise<void>;
  remove: (localId: string) => void;
  keepDuplicate: (localId: string) => void;
  clearFinished: () => void;
  patchPhoto: (photoId: string, photo: PhotoUploadResult['photo']) => void;
  dismissConfirmed: (photoId: string, stillNeedsReview: boolean) => void;
  pump: () => void;
  markOffline: () => void;
};

export const createPhotoUploadQueue = (deps?: {
  store?: PhotoJobStore;
  upload?: UploadFn;
  online?: () => boolean;
  prepare?: typeof preparePhotoFile;
  confirmField?: (photoId: string, fieldId: string) => Promise<PhotoUploadResult['photo']>;
}): PhotoUploadQueue => {
  const store = deps?.store ?? idbStore();
  const upload = deps?.upload ?? defaultUpload;
  const online = deps?.online ?? isDeviceOnline;
  const prepare = deps?.prepare ?? preparePhotoFile;
  const confirmField =
    deps?.confirmField ?? ((photoId, fieldId) => photoService.confirmField(photoId, fieldId));
  let jobs: PhotoUploadJob[] = [];
  const listeners = new Set<(next: PhotoUploadJob[]) => void>();
  let pumpPromise: Promise<void> | null = null;
  let pumpAgain = false;
  let hydratePromise: Promise<void> | null = null;

  const emit = () => {
    const snapshot = jobs.slice();
    listeners.forEach((listener) => listener(snapshot));
  };

  const persist = (job: PhotoUploadJob) => {
    void store.put(toPersisted(job)).catch(() => undefined);
  };

  const replace = (localId: string, patch: Partial<PhotoUploadJob>) => {
    jobs = jobs.map((job) => (job.localId === localId ? { ...job, ...patch } : job));
    const next = jobs.find((job) => job.localId === localId);
    if (next) persist(next);
    emit();
    return next;
  };

  const activate = (job: PhotoUploadJob): PhotoUploadJob => {
    if (!online()) return { ...job, status: 'offline' };
    return { ...job, status: 'queued', error: null };
  };

  const queue = {
    jobs: () => jobs.slice(),
    subscribe: (listener) => {
      listener(jobs.slice());
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    hydrate: () => {
      if (hydratePromise) return hydratePromise;
      hydratePromise = (async () => {
        try {
          const stored = await store.list();
          const restored = stored.map((job) => {
            const file = fileFrom(job);
            let status = job.status;
            if (status === 'uploading' || status === 'converting') status = 'queued';
            if (status === 'offline' && online()) status = 'queued';
            return {
              ...job,
              status,
              file,
              blob: file,
              previewUrl: previewFor(file),
            };
          });
          const known = new Set(jobs.map((job) => job.localId));
          jobs = [...jobs, ...restored.filter((job) => !known.has(job.localId))];
          emit();
        } catch {
          hydratePromise = null;
        }
      })();
      return hydratePromise;
    },
    stage: async (files, options) => {
      const ids: string[] = [];
      for (const file of files) {
        const localId = newLocalId();
        ids.push(localId);
        const issue = classifyPhotoFile(file);
        const base: PhotoUploadJob = {
          localId,
          name: file.name,
          type: file.type,
          size: file.size,
          blob: file,
          file,
          previewUrl: issue ? '' : previewFor(file),
          status: issue ? 'failed' : isHeicFile(file) ? 'converting' : 'staged',
          error: issue ? issueMessage(issue, options.messages) : null,
          progress: 0,
          uploadId: null,
          receivedBytes: 0,
          allowDuplicate: false,
          contentHash: null,
          capturedAt: null,
          latitude: null,
          longitude: null,
          sourceHash: null,
          transcoded: false,
          fieldId: options.fieldId ?? null,
          createdAt: Date.now(),
        };
        jobs = [...jobs, base];
        persist(base);
        emit();
        if (issue) continue;

        try {
          const prepared = await prepare(file);
          const library = [
            ...(options.library ?? []),
            ...jobs
              .filter((job) => job.localId !== localId && job.contentHash)
              .map((job) => ({ contentHash: job.contentHash, capturedAt: job.capturedAt })),
          ];
          const duplicate = library.some((existing) =>
            isPhotoDuplicate(
              { contentHash: prepared.sourceHash, capturedAt: prepared.capturedAt },
              existing
            )
          );
          const current = jobs.find((job) => job.localId === localId);
          if (current?.previewUrl && current.previewUrl !== base.previewUrl) {
            revokePreview(current.previewUrl);
          }
          const status: PhotoJobStatus = duplicate
            ? 'duplicate'
            : options.autoStart
              ? online()
                ? 'queued'
                : 'offline'
              : 'staged';
          replace(localId, {
            name: prepared.file.name,
            type: prepared.file.type,
            size: prepared.file.size,
            blob: prepared.file,
            file: prepared.file,
            previewUrl: previewFor(prepared.file),
            contentHash: prepared.sourceHash,
            capturedAt: prepared.capturedAt,
            latitude: prepared.latitude,
            longitude: prepared.longitude,
            sourceHash: prepared.sourceHash,
            transcoded: prepared.transcoded,
            status,
            error: null,
          });
        } catch {
          const current = jobs.find((job) => job.localId === localId);
          if (current?.previewUrl) revokePreview(current.previewUrl);
          replace(localId, {
            status: 'failed',
            error: options.messages.heic,
            previewUrl: '',
          });
        }
      }
      return ids;
    },
    startStaged: () => {
      jobs = jobs.map((job) => (job.status === 'staged' ? activate(job) : job));
      jobs.filter((job) => job.status === 'queued' || job.status === 'offline').forEach(persist);
      emit();
    },
    retry: async (localId, messages) => {
      const job = jobs.find((item) => item.localId === localId);
      if (!job || job.status === 'uploading') return;
      if (isHeicFile(job.file) && !job.transcoded) {
        replace(localId, { status: 'converting', error: null });
        try {
          const prepared = await prepare(job.file);
          replace(localId, activate({
            ...job,
            name: prepared.file.name,
            type: prepared.file.type,
            size: prepared.file.size,
            blob: prepared.file,
            file: prepared.file,
            capturedAt: prepared.capturedAt,
            latitude: prepared.latitude,
            longitude: prepared.longitude,
            sourceHash: prepared.sourceHash,
            contentHash: prepared.sourceHash,
            transcoded: prepared.transcoded,
            status: 'queued',
            error: null,
          }));
        } catch {
          replace(localId, { status: 'failed', error: messages.heic });
        }
        return;
      }
      replace(localId, { ...activate(job), result: undefined, progress: job.receivedBytes && job.size
        ? Math.round((job.receivedBytes / job.size) * 100)
        : 0 });
    },
    remove: (localId) => {
      const target = jobs.find((job) => job.localId === localId);
      if (!target || target.status === 'uploading') return;
      if (target.previewUrl) revokePreview(target.previewUrl);
      jobs = jobs.filter((job) => job.localId !== localId);
      void store.delete(localId).catch(() => undefined);
      emit();
    },
    keepDuplicate: (localId) => {
      const job = jobs.find((item) => item.localId === localId);
      if (!job) return;
      replace(localId, { ...activate(job), allowDuplicate: true, error: null, result: undefined });
    },
    clearFinished: () => {
      const finished = jobs.filter(
        (job) => job.status === 'uploaded' || job.status === 'failed' || job.status === 'duplicate'
      );
      finished.forEach((job) => {
        if (job.previewUrl) revokePreview(job.previewUrl);
        void store.delete(job.localId).catch(() => undefined);
      });
      const drop = new Set(finished.map((job) => job.localId));
      jobs = jobs.filter((job) => !drop.has(job.localId));
      emit();
    },
    patchPhoto: (photoId, photo) => {
      jobs = jobs.map((job) =>
        job.result?.photo.id === photoId && job.result
          ? { ...job, result: { ...job.result, photo } }
          : job
      );
      const match = jobs.find((job) => job.result?.photo.id === photoId);
      if (match) persist(match);
      emit();
    },
    dismissConfirmed: (photoId, stillNeedsReview) => {
      if (stillNeedsReview) return;
      const match = jobs.find((job) => job.result?.photo.id === photoId);
      if (!match) return;
      if (match.previewUrl) revokePreview(match.previewUrl);
      jobs = jobs.filter((job) => job.localId !== match.localId);
      void store.delete(match.localId).catch(() => undefined);
      emit();
    },
    markOffline: () => {
      jobs = jobs.map((job) => (job.status === 'queued' ? { ...job, status: 'offline' } : job));
      jobs.filter((job) => job.status === 'offline').forEach(persist);
      emit();
    },
    pump: () => {
      if (online()) {
        let changed = false;
        jobs = jobs.map((job) => {
          if (job.status !== 'offline') return job;
          changed = true;
          return { ...job, status: 'queued' as const };
        });
        if (changed) {
          jobs.filter((job) => job.status === 'queued').forEach(persist);
          emit();
        }
      }
      if (pumpPromise) {
        pumpAgain = true;
        return;
      }
      pumpPromise = (async () => {
        try {
          for (;;) {
            if (!online()) {
              jobs = jobs.map((job) => (job.status === 'queued' ? { ...job, status: 'offline' } : job));
              jobs.filter((job) => job.status === 'offline').forEach(persist);
              emit();
              return;
            }
            const next = jobs.find((job) => job.status === 'queued');
            if (!next) {
              if (!pumpAgain) return;
              pumpAgain = false;
              continue;
            }
            pumpAgain = false;
            replace(next.localId, { status: 'uploading', error: null });
            try {
              const uploaded = await upload(jobs.find((job) => job.localId === next.localId) || next, (received, total) => {
                replace(next.localId, {
                  status: 'uploading',
                  receivedBytes: received,
                  progress: total > 0 ? Math.round((received / total) * 100) : 0,
                });
              });
              let result = uploaded.result;
              const fieldId = next.fieldId;
              if (
                fieldId &&
                result.photo?.id &&
                !result.failed &&
                !result.duplicateSkipped &&
                result.photo.fieldId !== fieldId
              ) {
                try {
                  const photo = await confirmField(result.photo.id, fieldId);
                  result = { ...result, photo };
                } catch {
                  /* The photo is stored; field confirmation can still happen in review. */
                }
              }
              const status: PhotoJobStatus = result.failed
                ? 'failed'
                : result.duplicateSkipped
                  ? 'duplicate'
                  : 'uploaded';
              replace(next.localId, {
                status,
                result,
                error: result.failed ? result.error || null : null,
                uploadId: uploaded.uploadId,
                receivedBytes: uploaded.receivedBytes,
                progress: 100,
              });
            } catch (error) {
              const current = jobs.find((job) => job.localId === next.localId);
              const received =
                error instanceof PhotoUploadRequestError && error.receivedBytes != null
                  ? error.receivedBytes
                  : current?.receivedBytes ?? next.receivedBytes;
              if (pauseForLater(error)) {
                replace(next.localId, {
                  status: 'offline',
                  receivedBytes: received,
                  progress: next.size ? Math.round((received / next.size) * 100) : 0,
                  error: null,
                });
                return;
              }
              replace(next.localId, {
                status: 'failed',
                receivedBytes: received,
                error: error instanceof Error ? error.message : null,
              });
            }
          }
        } finally {
          pumpPromise = null;
          if (pumpAgain) {
            pumpAgain = false;
            queueMicrotask(() => queue.pump());
          }
        }
      })();
    },
  };
  return queue;
};

let singleton: PhotoUploadQueue | null = null;

export const photoUploadQueue = () => {
  if (!singleton) singleton = createPhotoUploadQueue();
  return singleton;
};

export const shouldPausePhotoUpload = pauseForLater;
