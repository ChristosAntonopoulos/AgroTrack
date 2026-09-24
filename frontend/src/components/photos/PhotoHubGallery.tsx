import React from 'react';
import { useTranslation } from 'react-i18next';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import type { Field } from '../../services/fieldService';
import type { Photo } from '../../services/photoService';
import { resolveFieldColor } from '../../utils/fieldColors';
import PhotoFrame from './PhotoFrame';
import { linkedRecordLabel } from './photoLinks';

type Props = {
  photos: Photo[];
  fields?: Field[];
  onOpenViewer: (photo: Photo, index: number) => void;
  onRemove?: (photo: Photo) => void;
  onReplace?: (photo: Photo, file: File) => void;
  onReport?: (photo: Photo) => void;
  selectionMode?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelected?: (photoId: string) => void;
};

const PhotoHubGallery: React.FC<Props> = ({
  photos,
  fields,
  onOpenViewer,
  onRemove,
  onReplace,
  onReport,
  selectionMode = false,
  selectedIds,
  onToggleSelected,
}) => {
  const { t } = useTranslation('photos');
  const { formatDate, formatTime } = useLocaleFormatters();

  return (
    <div className="photo-gallery" role="list">
      {photos.map((photo, index) => {
        const src = resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url;
        const dateLabel = formatDate(photo.effectiveCapturedAt);
        const timeLabel = formatTime(photo.effectiveCapturedAt);
        const fieldLabel =
          photo.fieldName || (photo.fieldId ? photo.fieldId : t('badges.unassigned'));
        const fieldColor = photo.fieldId
          ? resolveFieldColor(fields?.find((field) => field.id === photo.fieldId)?.color, photo.fieldId)
          : null;
        const typeLabel = (ownerType: string) =>
          t(`badges.${ownerType}`, { defaultValue: ownerType });
        const linkLabel = photo.isLinked ? linkedRecordLabel(photo, typeLabel) : null;
        const needsReview =
          photo.fieldAssignment === 'needsReview' || photo.fieldAssignment === 'unassigned';
        const selected = selectedIds?.has(photo.id) ?? false;
        const aria = t('card.aria', {
          index: index + 1,
          total: photos.length,
          field: fieldLabel,
          date: dateLabel,
          time: timeLabel,
        });
        return (
          <div
            key={photo.id}
            className={`photo-card${photo.isLinked ? ' is-linked' : ''}${needsReview ? ' needs-review' : ''}${selected ? ' is-selected' : ''}`}
            role="listitem"
            data-photo-id={photo.id}
          >
            <div className="photo-card-media">
              <PhotoFrame
                src={src}
                alt=""
                onActivate={
                  selectionMode
                    ? () => onToggleSelected?.(photo.id)
                    : () => onOpenViewer(photo, index)
                }
                activateLabel={aria}
                onRemove={onRemove && photo.canTrash !== false ? () => onRemove(photo) : undefined}
                onReplace={onReplace ? (file) => onReplace(photo, file) : undefined}
                onReport={onReport ? () => onReport(photo) : undefined}
              />
              {needsReview ? (
                <span className="photo-badge review">
                  {photo.fieldAssignment === 'unassigned'
                    ? t('badges.unassigned')
                    : t('badges.needsReview')}
                </span>
              ) : null}
              {selectionMode ? (
                <label className="photo-card-check">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleSelected?.(photo.id)}
                    aria-label={aria}
                  />
                </label>
              ) : null}
            </div>

            <div className="photo-card-meta">
              <span className="photo-card-meta-field">
                {fieldColor ? (
                  <span
                    className="photo-hub-swatch"
                    style={{ '--swatch': fieldColor } as React.CSSProperties}
                    aria-hidden
                  />
                ) : null}
                {fieldLabel}
              </span>
              <span className="photo-card-meta-date">
                {dateLabel}
                <span className="photo-card-meta-time"> · {timeLabel}</span>
              </span>
              {linkLabel ? (
                <span className="photo-card-meta-link is-static">{linkLabel}</span>
              ) : null}
              {photo.fileName ? (
                <span className="photo-card-meta-filename" title={photo.fileName}>
                  {photo.fileName}
                </span>
              ) : null}
              {!photo.latitude || !photo.fieldId || photo.fieldAssignment === 'unassigned' || photo.fieldAssignment === 'needsReview' ? (
                <span className="photo-card-needs-info">{t('card.needsInfo')}</span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PhotoHubGallery;
