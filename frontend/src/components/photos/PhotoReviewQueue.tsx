import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import type { Field } from '../../services/fieldService';
import type { PhotoUploadResult } from '../../services/photoService';

type Props = {
  items: PhotoUploadResult[];
  fields: Field[];
  onConfirmField: (photoId: string, fieldId: string) => Promise<void>;
  onUpdateCapturedAt: (photoId: string, capturedAt: string) => Promise<void>;
  onDone: () => void;
};

const PhotoReviewQueue: React.FC<Props> = ({
  items,
  fields,
  onConfirmField,
  onUpdateCapturedAt,
  onDone,
}) => {
  const { t } = useTranslation('photos');
  const [busyId, setBusyId] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <section className="photo-review" aria-label={t('review.title')}>
      <h2>{t('review.title')}</h2>
      {items.map((item) => {
        const photo = item.photo;
        const src = resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url;
        const defaultField =
          photo.fieldId || item.candidates[0]?.fieldId || fields[0]?.id || '';
        return (
          <div key={photo.id} className="photo-review-item">
            <img src={src} alt={photo.fileName || ''} />
            <div>
              {item.duplicateWarning ? <p>{t('review.duplicate')}</p> : null}
              {item.candidates.length > 0 ? (
                <p>
                  {t('review.candidates')}:{' '}
                  {item.candidates.map((c) => c.fieldName).join(', ')}
                </p>
              ) : null}
              <div className="photo-review-actions">
                <label>
                  {t('review.pickField')}
                  <select
                    defaultValue={defaultField}
                    id={`field-${photo.id}`}
                    disabled={busyId === photo.id}
                  >
                    <option value="">{t('review.pickField')}</option>
                    {fields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  size="sm"
                  disabled={busyId === photo.id}
                  onClick={async () => {
                    const select = document.getElementById(
                      `field-${photo.id}`
                    ) as HTMLSelectElement | null;
                    const fieldId = select?.value;
                    if (!fieldId) return;
                    setBusyId(photo.id);
                    try {
                      await onConfirmField(photo.id, fieldId);
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  {t('review.confirmField')}
                </Button>
                <label>
                  {t('review.capturedAt')}
                  <input
                    type="datetime-local"
                    defaultValue={
                      photo.capturedAt
                        ? photo.capturedAt.slice(0, 16)
                        : photo.effectiveCapturedAt.slice(0, 16)
                    }
                    onBlur={async (e) => {
                      if (!e.target.value) return;
                      setBusyId(photo.id);
                      try {
                        await onUpdateCapturedAt(
                          photo.id,
                          new Date(e.target.value).toISOString()
                        );
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        );
      })}
      <Button variant="secondary" onClick={onDone}>
        {t('review.done')}
      </Button>
    </section>
  );
};

export default PhotoReviewQueue;
