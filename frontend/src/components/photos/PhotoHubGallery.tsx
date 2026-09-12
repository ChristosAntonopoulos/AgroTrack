import React from 'react';
import { useTranslation } from 'react-i18next';
import { Expand, Info } from 'lucide-react';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import type { Photo } from '../../services/photoService';

type Props = {
  photos: Photo[];
  onSelect: (photo: Photo) => void;
  /** Opens shared fullscreen viewer among the current filtered set. */
  onExpand?: (photo: Photo, index: number) => void;
};

const ownerBadgeKey = (photo: Photo) => {
  if (!photo.isLinked || photo.ownerType === 'field') return 'standalone';
  if (photo.ownerType === 'task') return 'task';
  if (photo.ownerType === 'note') return 'note';
  if (photo.ownerType === 'harvest') return 'harvest';
  if (photo.ownerType === 'phenology') return 'phenology';
  return 'standalone';
};

const PhotoHubGallery: React.FC<Props> = ({ photos, onSelect, onExpand }) => {
  const { t } = useTranslation('photos');

  return (
    <div className="photo-gallery" role="list">
      {photos.map((photo, index) => {
        const src = resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url;
        const badge = ownerBadgeKey(photo);
        const needsReview =
          photo.fieldAssignment === 'needsReview' || photo.fieldAssignment === 'unassigned';
        return (
          <div
            key={photo.id}
            className={`photo-card${photo.isLinked ? ' is-linked' : ''}${needsReview ? ' needs-review' : ''}`}
            role="listitem"
          >
            <button
              type="button"
              className="photo-card-main"
              onClick={() => onSelect(photo)}
              aria-label={photo.fileName || t('detail.title')}
            >
              <img src={src} alt="" loading="lazy" decoding="async" />
            </button>
            <div className="photo-card-badges">
              <span className={`photo-badge${photo.isLinked ? ' linked' : ''}`}>
                {t(`badges.${badge}`)}
              </span>
              {needsReview ? (
                <span className="photo-badge review">
                  {photo.fieldAssignment === 'unassigned'
                    ? t('badges.unassigned')
                    : t('badges.needsReview')}
                </span>
              ) : null}
            </div>
            <div className="photo-card-actions">
              {onExpand ? (
                <button
                  type="button"
                  className="photo-card-action"
                  onClick={() => onExpand(photo, index)}
                  aria-label={t('viewer.expand')}
                >
                  <Expand size={14} aria-hidden />
                </button>
              ) : null}
              <button
                type="button"
                className="photo-card-action"
                onClick={() => onSelect(photo)}
                aria-label={t('viewer.openDetails')}
              >
                <Info size={14} aria-hidden />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PhotoHubGallery;
