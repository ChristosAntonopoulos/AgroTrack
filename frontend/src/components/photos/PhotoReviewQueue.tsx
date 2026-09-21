import React, { useMemo, useState } from 'react';
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
  const [picked, setPicked] = useState<Record<string, string>>({});

  const defaults = useMemo(() => {
    const map: Record<string, string> = {};
    items.forEach((item) => {
      map[item.photo.id] =
        item.photo.fieldId || item.candidates[0]?.fieldId || fields[0]?.id || '';
    });
    return map;
  }, [fields, items]);

  if (items.length === 0) return null;

  const selectedFor = (photoId: string) => picked[photoId] ?? defaults[photoId] ?? '';

  return (
    <section className="photo-review" aria-label={t('review.title')}>
      <div className="photo-review-header">
        <div>
          <h2>{t('review.title')}</h2>
          <p className="photo-review-lead">{t('review.lead')}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onDone}>
          {t('review.done')}
        </Button>
      </div>

      <div className="photo-review-grid">
        {items.map((item) => {
          const photo = item.photo;
          const src = resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url;
          const selected = selectedFor(photo.id);
          const candidateIds = new Set(item.candidates.map((c) => c.fieldId));
          const chipFields =
            item.candidates.length > 0
              ? [
                  ...item.candidates.map((c) => ({
                    id: c.fieldId,
                    name: c.fieldName || fields.find((f) => f.id === c.fieldId)?.name || c.fieldId,
                  })),
                  ...fields
                    .filter((f) => !candidateIds.has(f.id))
                    .map((f) => ({ id: f.id, name: f.name })),
                ]
              : fields.map((f) => ({ id: f.id, name: f.name }));

          return (
            <article key={photo.id} className="photo-review-card">
              <div className="photo-review-card-top">
                <img src={src} alt={photo.fileName || ''} />
                <div className="photo-review-card-copy">
                  {item.duplicateWarning ? (
                    <p className="photo-review-warning">{t('review.duplicate')}</p>
                  ) : null}
                  <span className="photo-review-label">{t('review.pickField')}</span>
                  <div className="photo-review-field-chips" role="group" aria-label={t('review.pickField')}>
                    {chipFields.slice(0, 8).map((field) => (
                      <button
                        key={field.id}
                        type="button"
                        className={`photo-review-field-chip${
                          candidateIds.has(field.id) ? ' is-candidate' : ''
                        }${selected === field.id ? ' is-selected' : ''}`}
                        disabled={busyId === photo.id}
                        onClick={() =>
                          setPicked((prev) => ({ ...prev, [photo.id]: field.id }))
                        }
                      >
                        {field.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="photo-review-actions">
                <Button
                  size="sm"
                  disabled={busyId === photo.id || !selected}
                  loading={busyId === photo.id}
                  onClick={async () => {
                    if (!selected) return;
                    setBusyId(photo.id);
                    try {
                      await onConfirmField(photo.id, selected);
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
                    disabled={busyId === photo.id}
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
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default PhotoReviewQueue;
