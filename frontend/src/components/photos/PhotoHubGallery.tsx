import React from 'react';
import { useTranslation } from 'react-i18next';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import { formatPhotoCardDate } from '../../utils/localeFormatters';
import type { Photo } from '../../services/photoService';

type Props = {
  photos: Photo[];
  /** Opens fullscreen viewer among the current filtered set. */
  onOpenViewer: (photo: Photo, index: number) => void;
};

const PhotoHubGallery: React.FC<Props> = ({ photos, onOpenViewer }) => {
  const { t, i18n } = useTranslation('photos');

  return (
    <div className="photo-gallery" role="list">
      {photos.map((photo, index) => {
        const src = resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url;
        const dateLabel = formatPhotoCardDate(photo.effectiveCapturedAt, i18n.language);
        const fieldLabel =
          photo.fieldName ||
          (photo.fieldId ? photo.fieldId : t('badges.unassigned'));
        const overlayPrimary = [dateLabel, fieldLabel].filter(Boolean).join(' · ');
        const statusLabel = photo.isLinked
          ? t('badges.linkedWith', {
              title: photo.linkedTitle || t(`badges.${photo.ownerType}`, { defaultValue: photo.ownerType }),
            })
          : t('badges.standalone');
        const needsReview =
          photo.fieldAssignment === 'needsReview' || photo.fieldAssignment === 'unassigned';
        const aria = `${overlayPrimary}. ${statusLabel}`;

        return (
          <div
            key={photo.id}
            className={`photo-card${photo.isLinked ? ' is-linked' : ''}${needsReview ? ' needs-review' : ''}`}
            role="listitem"
          >
            <button
              type="button"
              className="photo-card-main"
              onClick={() => onOpenViewer(photo, index)}
              aria-label={aria}
            >
              <img src={src} alt="" loading="lazy" decoding="async" />
              <div className="photo-card-overlay">
                <span className="photo-card-overlay-primary">{overlayPrimary}</span>
                <span className={`photo-card-overlay-status${photo.isLinked ? ' is-linked' : ''}`}>
                  {statusLabel}
                </span>
              </div>
            </button>
            <div className="photo-card-badges">
              {needsReview ? (
                <span className="photo-badge review">
                  {photo.fieldAssignment === 'unassigned'
                    ? t('badges.unassigned')
                    : t('badges.needsReview')}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PhotoHubGallery;
