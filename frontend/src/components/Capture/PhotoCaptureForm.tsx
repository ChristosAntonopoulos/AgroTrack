import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PhotoUploadDropzone from '../photos/PhotoUploadDropzone';
import { getPhotoService } from '../../services/serviceFactory';
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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedFieldName = fields.find((f) => f.id === fieldId)?.name;

  const upload = async (files: File[]) => {
    if (!fieldId) {
      setError(t('capture:errors.fieldRequired'));
      return;
    }
    if (!files.length) {
      setError(t('capture:errors.photoRequired'));
      return;
    }
    setUploading(true);
    setError(null);
    onDirty();
    try {
      const results = await getPhotoService().upload(files);
      const ok = results.filter((r) => !r.failed && !r.duplicateSkipped);
      if (ok.length === 0) {
        setError(t('capture:errors.saveFailed'));
        return;
      }
      const first = ok[0].photo;
      if (first.fieldId !== fieldId) {
        await getPhotoService().confirmField(first.id, fieldId);
      }
      for (const item of ok.slice(1)) {
        if (item.photo.fieldId !== fieldId) {
          await getPhotoService().confirmField(item.photo.id, fieldId).catch(() => undefined);
        }
      }
      onSaved(
        {
          type: 'photo',
          fieldId,
          sourceId: first.id,
          harvestCampaignLink: context.harvestCampaignLink,
        },
        t('capture:photo.saved', { count: ok.length })
      );
    } catch {
      setError(t('capture:errors.saveFailed'));
    } finally {
      setUploading(false);
    }
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
      <PhotoUploadDropzone disabled={uploading} onFiles={(files) => void upload(files)} />
      {error ? <p className="capture-error">{error}</p> : null}
    </div>
  );
};

export default PhotoCaptureForm;
