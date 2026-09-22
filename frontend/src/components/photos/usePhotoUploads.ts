import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Photo } from '../../services/photoService';
import type { PhotoBatchItem } from './PhotoReviewQueue';
import { photoUploadQueue, type PhotoUploadJob } from './photoUploadQueue';

const toBatchItem = (job: PhotoUploadJob): PhotoBatchItem => ({
  localId: job.localId,
  file: job.file,
  previewUrl: job.previewUrl,
  status:
    job.status === 'offline'
      ? 'offline'
      : job.status === 'converting'
        ? 'converting'
        : job.status,
  error: job.error,
  result: job.result,
  allowDuplicate: job.allowDuplicate,
  progress: job.status === 'uploading' ? job.progress : null,
});

export const usePhotoUploads = (library: Photo[]) => {
  const { t } = useTranslation('photos');
  const queue = photoUploadQueue();
  const [jobs, setJobs] = useState<PhotoUploadJob[]>(() => queue.jobs());
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => queue.subscribe(setJobs), [queue]);

  const messages = useMemo(
    () => ({
      heic: t('errors.heic'),
      oversize: t('errors.oversize'),
      empty: t('errors.emptyFile'),
      unsupported: t('errors.unsupported'),
      upload: t('errors.upload'),
    }),
    [t]
  );

  const stageFiles = useCallback(
    async (files: File[], options?: { fieldId?: string | null; autoStart?: boolean }) => {
      if (files.length === 0) return [] as string[];
      setNotice(null);
      const ids = await queue.stage(files, {
        library: library.map((photo) => ({
          contentHash: photo.contentHash,
          // Only EXIF capture times — never the upload-time effectiveCapturedAt fallback.
          capturedAt: photo.capturedAt,
          createdAt: photo.createdAt,
        })),
        fieldId: options?.fieldId,
        autoStart: options?.autoStart,
        messages,
      });
      if (options?.autoStart) queue.pump();
      return ids;
    },
    [library, messages, queue]
  );

  const waitForJob = useCallback(
    (localId: string) =>
      new Promise<'uploaded' | 'failed' | 'duplicate' | 'removed'>((resolve) => {
        const settle = (status: PhotoUploadJob['status'] | 'removed') => {
          if (status === 'uploaded') resolve('uploaded');
          else if (status === 'duplicate') resolve('duplicate');
          else if (status === 'failed') resolve('failed');
          else if (status === 'removed') resolve('removed');
        };
        const current = queue.jobs().find((job) => job.localId === localId);
        if (!current) {
          settle('removed');
          return;
        }
        if (
          current.status === 'uploaded' ||
          current.status === 'failed' ||
          current.status === 'duplicate'
        ) {
          settle(current.status);
          return;
        }
        const unsub = queue.subscribe((jobs) => {
          const job = jobs.find((item) => item.localId === localId);
          if (!job) {
            unsub();
            settle('removed');
            return;
          }
          if (
            job.status === 'uploaded' ||
            job.status === 'failed' ||
            job.status === 'duplicate'
          ) {
            unsub();
            settle(job.status);
          }
        });
      }),
    [queue]
  );

  const startStaged = useCallback(() => {
    queue.startStaged();
    queue.pump();
  }, [queue]);

  const retry = useCallback(
    (localId: string) => {
      void queue.retry(localId, messages).then(() => queue.pump());
    },
    [messages, queue]
  );

  const uploading = jobs.some((job) => job.status === 'uploading' || job.status === 'converting');
  const waitingOffline = jobs.some((job) => job.status === 'offline');
  const wave = jobs.filter((job) => job.status !== 'staged' && job.status !== 'converting');
  const finished = wave.filter(
    (job) => job.status === 'uploaded' || job.status === 'failed' || job.status === 'duplicate'
  ).length;
  const current = jobs.find((job) => job.status === 'uploading');
  const active = jobs.some(
    (job) => job.status === 'queued' || job.status === 'uploading' || job.status === 'offline'
  );
  const wasActive = useRef(false);

  useEffect(() => {
    if (wasActive.current && !active) {
      const uploaded = jobs.filter((job) => job.status === 'uploaded').length;
      const duplicates = jobs.filter((job) => job.status === 'duplicate').length;
      const failed = jobs.filter((job) => job.status === 'failed').length;
      const review = jobs.filter(
        (job) =>
          job.status === 'uploaded' &&
          job.result &&
          (job.result.photo.fieldAssignment === 'needsReview' ||
            job.result.photo.fieldAssignment === 'unassigned' ||
            job.result.duplicateWarning)
      ).length;
      if (failed > 0 || duplicates > 0 || review > 0) {
        setNotice(t('uploadSummary', { added: uploaded, review, duplicates, failed }));
      } else if (uploaded > 0) {
        setNotice(t('uploadSuccess', { count: uploaded }));
      }
    }
    wasActive.current = active;
  }, [active, jobs, t]);

  const fraction = wave.length
    ? (finished + (current ? current.progress / 100 : 0)) / wave.length
    : 0;
  const progress =
    wave.length > 0 && (active || finished > 0)
      ? {
          done: finished,
          total: wave.length,
          percent: Math.min(100, Math.round(fraction * 100)),
        }
      : null;

  return {
    items: jobs.map(toBatchItem),
    uploading,
    waitingOffline,
    progress,
    notice,
    dismissNotice: () => setNotice(null),
    stageFiles,
    waitForJob,
    startStaged,
    retry,
    remove: queue.remove,
    keepDuplicate: (localId: string) => {
      queue.keepDuplicate(localId);
      queue.pump();
    },
    clear: queue.clearFinished,
    patchPhoto: (photo: Photo) => queue.patchPhoto(photo.id, photo),
    onConfirmed: (photoId: string, updated: Photo) => {
      queue.patchPhoto(photoId, updated);
      const still =
        updated.fieldAssignment === 'needsReview' || updated.fieldAssignment === 'unassigned';
      queue.dismissConfirmed(photoId, still);
    },
  };
};
