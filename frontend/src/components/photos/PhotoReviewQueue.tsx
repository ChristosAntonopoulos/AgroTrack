import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import Button from '../Common/Button';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import type { Field } from '../../services/fieldService';
import type { PhotoUploadResult } from '../../services/photoService';

export type PhotoBatchStatus =
  | 'staged'
  | 'converting'
  | 'queued'
  | 'uploading'
  | 'uploaded'
  | 'failed'
  | 'duplicate'
  | 'offline';

export type PhotoBatchItem = {
  localId: string;
  file: File;
  previewUrl: string;
  status: PhotoBatchStatus;
  error?: string | null;
  result?: PhotoUploadResult;
  allowDuplicate?: boolean;
  progress?: number | null;
};

type Props = {
  items: PhotoBatchItem[];
  fields: Field[];
  uploading: boolean;
  progress: { done: number; total: number; percent?: number } | null;
  onRemove: (localId: string) => void;
  onRetry: (localId: string) => void;
  onConfirmField: (photoId: string, fieldId: string) => Promise<void>;
  onUpdateCapturedAt: (photoId: string, capturedAt: string) => Promise<void>;
  onDone: () => void;
  onUploadStaged?: () => void;
  onKeepDuplicate?: (localId: string) => void;
};

const PhotoReviewQueue: React.FC<Props> = ({
  items,
  fields,
  uploading,
  progress,
  onRemove,
  onRetry,
  onDone,
  onUploadStaged,
  onKeepDuplicate,
}) => {
  const { t } = useTranslation('photos');
  const { formatDateTime } = useLocaleFormatters();

  if (items.length === 0) return null;

  const determinate =
    progress?.percent ??
    (progress && progress.total > 0
      ? Math.min(100, Math.round((progress.done / progress.total) * 100))
      : null);
  const stagedCount = items.filter((i) => i.status === 'staged').length;
  const canDismiss =
    !uploading && items.every((i) => i.status !== 'queued' && i.status !== 'uploading' && i.status !== 'staged');

  return (
    <section className="photo-review" aria-label={t('review.title')}>
      <div className="photo-review-header">
        <div>
          <h2>{t('review.title')}</h2>
          <p className="photo-review-lead">
            {uploading ? t('review.uploadingLead') : t('review.lead')}
          </p>
        </div>
        <div className="photo-review-header-actions">
          {stagedCount > 0 ? (
            <Button size="sm" disabled={uploading} onClick={onUploadStaged}>
              {t('review.start')}
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" disabled={!canDismiss} onClick={onDone}>
            {t('review.done')}
          </Button>
        </div>
      </div>

      {uploading || determinate != null ? (
        <div
          className={`photo-review-progress${determinate != null ? ' is-determinate' : ''}`}
          aria-live="polite"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={determinate ?? undefined}
          aria-label={t('uploading')}
        >
          <div className="photo-review-progress-track">
            <div
              className="photo-review-progress-bar"
              style={determinate != null ? { width: `${determinate}%` } : undefined}
            />
          </div>
          {progress ? (
            <span className="photo-review-progress-label">
              {t('review.progress', { done: progress.done, total: progress.total })}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="photo-review-grid">
        {items.map((item) => {
          const photo = item.result?.photo;
          const src =
            (photo
              ? resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url
              : null) || item.previewUrl;
          const fieldName =
            photo?.fieldName ||
            (photo?.fieldId ? fields.find((f) => f.id === photo.fieldId)?.name : null) ||
            null;
          const statusLabel =
            item.status === 'converting'
              ? t('converting')
              : item.status === 'offline'
                ? t('waitingOnline')
                : item.status === 'staged'
              ? t('review.statusQueued')
              : item.status === 'queued'
              ? t('review.statusQueued')
              : item.status === 'uploading'
                ? t('review.statusUploading')
                : item.status === 'failed'
                  ? t('review.statusFailed')
                  : item.status === 'duplicate'
                    ? t('review.duplicateSkipped')
                    : t('review.statusUploaded');
          const waiting =
            item.status === 'queued' || item.status === 'uploading' || item.status === 'converting';
          const canRemove =
            item.status === 'staged' ||
            item.status === 'converting' ||
            item.status === 'queued' ||
            item.status === 'offline' ||
            item.status === 'failed' ||
            item.status === 'duplicate';
          const reason = photo?.assignmentReason;

          return (
            <article
              key={item.localId}
              className={`photo-review-card photo-review-card--${item.status}`}
            >
              <div className="photo-review-card-top">
                <div className="photo-review-thumb-wrap">
                  {src ? <img src={src} alt="" /> : <span className="photo-review-thumb-missing" />}
                  {waiting ? (
                    <span className="photo-review-wait" role="status" aria-label={statusLabel}>
                      <span className="photo-review-wait-ring" />
                    </span>
                  ) : null}
                  {canRemove ? (
                    <button
                      type="button"
                      className="photo-review-remove"
                      aria-label={t('review.remove')}
                      onClick={() => onRemove(item.localId)}
                    >
                      <X size={14} aria-hidden />
                    </button>
                  ) : null}
                </div>
                <div className="photo-review-card-copy">
                  <span className={`photo-review-status is-${item.status}`}>{statusLabel}</span>
                  <p className="photo-review-filename" title={item.file.name}>
                    {item.file.name}
                  </p>
                  {waiting ? (
                    <div
                      className={`photo-review-file-progress${
                        item.status === 'uploading' && item.progress != null ? ' is-determinate' : ''
                      }`}
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={
                        item.status === 'uploading' && item.progress != null ? item.progress : undefined
                      }
                      aria-label={statusLabel}
                    >
                      <span
                        style={
                          item.status === 'uploading' && item.progress != null
                            ? { width: `${item.progress}%` }
                            : undefined
                        }
                      />
                    </div>
                  ) : null}
                  {item.error ? (
                    <p className="photo-review-error" role="alert">
                      {item.error}
                    </p>
                  ) : null}
                  {item.status === 'duplicate' ? (
                    <p className="photo-review-warning" role="status">
                      {t('review.duplicateChoice')}
                    </p>
                  ) : null}
                  {photo && item.status === 'uploaded' && (reason === 'noGps' || !photo.latitude) ? (
                    <p className="photo-review-meta">{t('review.sourceNone')}</p>
                  ) : null}
                  {photo && item.status === 'uploaded' && reason && reason !== 'noGps' && reason !== 'manual' ? (
                    <p className="photo-review-meta">{t('review.sourceGps')}</p>
                  ) : null}
                  {photo && item.status === 'uploaded' && !photo.capturedAt ? (
                    <p className="photo-review-meta">{t('review.dateFallback')}</p>
                  ) : null}
                  {fieldName && item.status !== 'uploaded' ? (
                    <p className="photo-review-meta">
                      {t('detail.field')}: {fieldName}
                    </p>
                  ) : null}
                  {photo?.effectiveCapturedAt && item.status !== 'uploaded' ? (
                    <p className="photo-review-meta">
                      {t('review.capturedAt')}: {formatDateTime(photo.effectiveCapturedAt)}
                    </p>
                  ) : null}
                  {photo?.isLinked ? (
                    <p className="photo-review-meta">
                      {t('detail.linkedRecord')}:{' '}
                      {photo.linkedTitle ||
                        t(`badges.${photo.ownerType}`, { defaultValue: photo.ownerType })}
                    </p>
                  ) : null}

                  {item.status === 'failed' ? (
                    <Button size="sm" variant="secondary" onClick={() => onRetry(item.localId)}>
                      {t('retryUpload')}
                    </Button>
                  ) : null}
                  {item.status === 'duplicate' ? (
                    <div className="photo-detail-actions">
                      <Button size="sm" variant="secondary" onClick={() => onRemove(item.localId)}>
                        {t('review.skipDuplicate')}
                      </Button>
                      <Button size="sm" onClick={() => onKeepDuplicate?.(item.localId)}>
                        {t('review.keepDuplicate')}
                      </Button>
                    </div>
                  ) : null}

                </div>
              </div>

            </article>
          );
        })}
      </div>
    </section>
  );
};

export default PhotoReviewQueue;
