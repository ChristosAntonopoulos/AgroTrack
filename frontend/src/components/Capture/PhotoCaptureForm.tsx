import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera } from 'lucide-react';
import PhotoUploadDropzone from '../photos/PhotoUploadDropzone';
import Button from '../Common/Button';
import { photoUploadQueue, type PhotoJobMessages, type PhotoUploadJob } from '../photos/photoUploadQueue';
import type { CaptureContext, CaptureSavedDetail, CaptureSavedOptions } from '../../capture/types';
import type { Field } from '../../services/fieldService';
import '../photos/PhotoHub.css';

type Props = {
  context: CaptureContext;
  fields: Field[];
  fieldId: string;
  onFieldChange: (id: string) => void;
  fieldLocked: boolean;
  onSaved: (detail: CaptureSavedDetail, message: string, options?: CaptureSavedOptions) => void;
  onDirty: () => void;
};

/**
 * Quick-capture photo step — reuses the Photos hub dropzone + upload API
 * (does not fork PhotoHubPage).
 */
const PhotoCaptureForm: React.FC<Props> = ({
  context,
  fields,
  fieldId,
  onFieldChange,
  fieldLocked,
  onSaved,
  onDirty,
}) => {
  const { t } = useTranslation(['capture', 'photos']);
  const cameraRef = useRef<HTMLInputElement>(null);
  const savedRef = useRef(false);
  const [tracked, setTracked] = useState<string[]>([]);
  const [jobs, setJobs] = useState<PhotoUploadJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const selectedFieldName = fields.find((f) => f.id === fieldId)?.name;
  const queue = photoUploadQueue();

  useEffect(() => queue.subscribe(setJobs), [queue]);

  const messages: PhotoJobMessages = {
    heic: t('photos:errors.heic'),
    oversize: t('photos:errors.oversize'),
    empty: t('photos:errors.emptyFile'),
    unsupported: t('photos:errors.unsupported'),
    upload: t('photos:errors.upload'),
  };

  const mine = jobs.filter((job) => tracked.includes(job.localId));
  const uploading = mine.some((job) => job.status === 'uploading' || job.status === 'converting' || job.status === 'queued');
  const progress = mine.length
    ? {
        done: mine.filter((job) => job.status === 'uploaded' || job.status === 'failed' || job.status === 'duplicate').length,
        total: mine.length,
      }
    : null;

  useEffect(() => {
    if (!tracked.length || savedRef.current) return;
    const selected = jobs.filter((job) => tracked.includes(job.localId));
    if (selected.length < tracked.length) return;
    const pending = selected.some((job) =>
      job.status === 'converting' ||
      job.status === 'staged' ||
      job.status === 'queued' ||
      job.status === 'uploading' ||
      job.status === 'offline'
    );
    if (pending) {
      if (selected.some((job) => job.status === 'offline')) {
        setError(t('photos:offlineQueued'));
      }
      return;
    }
    const ok = selected.filter((job) => job.status === 'uploaded' && job.result?.photo.id);
    if (!ok.length) {
      setError(selected.find((job) => job.error)?.error || t('capture:errors.saveFailed'));
      return;
    }
    savedRef.current = true;
    const first = ok[0].result!.photo;
    onSaved(
      {
        type: 'photo',
        fieldId,
        sourceId: first.id,
        harvestCampaignLink: context.harvestCampaignLink,
      },
      t('capture:photo.saved', { count: ok.length }),
      {
        reopen: {
          fieldId: fieldId || context.fieldId,
          occurredAt: context.occurredAt,
          sourcePage: context.sourcePage,
          harvestId: context.harvestId,
          taskId: context.taskId,
          harvestCampaignLink: context.harvestCampaignLink,
        },
      }
    );
  }, [context, fieldId, jobs, onSaved, t, tracked]);

  const upload = (files: File[]) => {
    if (!fieldId) {
      setError(t('capture:errors.fieldRequired'));
      return;
    }
    if (!files.length) {
      setError(t('capture:errors.photoRequired'));
      return;
    }
    setError(null);
    savedRef.current = false;
    onDirty();
    void queue
      .stage(files, { fieldId, autoStart: true, messages })
      .then((ids) => {
        setTracked(ids);
        queue.pump();
      });
  };

  return (
    <div className="capture-form capture-photo-form">
      <label className="capture-label">
        {t('capture:fieldLabel')}
        {fieldLocked ? (
          <div className="capture-field-locked">{selectedFieldName || fieldId}</div>
        ) : (
          <select
            value={fieldId}
            onChange={(e) => onFieldChange(e.target.value)}
            aria-label={t('capture:fieldPrompt')}
          >
            <option value="">{t('capture:fieldPrompt')}</option>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}
      </label>
      {context.harvestCampaignLink ? (
        <p className="capture-hint">{t('capture:photo.harvestHint')}</p>
      ) : null}
      <div className="capture-photo-actions">
        <Button
          type="button"
          variant="secondary"
          icon={<Camera size={18} aria-hidden />}
          disabled={uploading}
          onClick={() => cameraRef.current?.click()}
        >
          {t('photos:takePhoto')}
        </Button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          tabIndex={-1}
          aria-hidden="true"
          className="photo-hidden-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) upload([file]);
          }}
        />
      </div>
      <PhotoUploadDropzone disabled={uploading} progress={progress} onFiles={upload} />
      {error ? <p className="capture-error">{error}</p> : null}
    </div>
  );
};

export default PhotoCaptureForm;
