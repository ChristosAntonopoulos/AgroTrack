import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import type { Photo } from '../../services/photoService';
import { linkedRecordLabel, linkedRecordPath } from './photoLinks';

type Props = {
  photos: Photo[];
  /** Opens fullscreen viewer among the current filtered set. */
  onOpenViewer: (photo: Photo, index: number) => void;
  /** Opens the detail drawer (for secondary meta / filename). */
  onOpenDetails?: (photo: Photo) => void;
};

const uploaderLabel = (
  photo: Photo,
  currentUserId: string | undefined,
  youLabel: string
): string | null => {
  if (!photo.uploadedByUserId) return null;
  if (currentUserId && photo.uploadedByUserId === currentUserId) return youLabel;
  return photo.uploadedByUserId.slice(0, 8);
};

const kindDescription = (
  photo: Photo,
  t: (key: string, opts?: Record<string, string>) => string
): string | null => {
  if (photo.kind && photo.kind !== 'general') {
    return t(`kinds.${photo.kind}`, { defaultValue: photo.kind });
  }
  if (photo.assignmentReason) {
    const key = `detail.reasons.${photo.assignmentReason}`;
    const label = t(key, { defaultValue: '' });
    return label || null;
  }
  return null;
};

const PhotoHubGallery: React.FC<Props> = ({ photos, onOpenViewer, onOpenDetails }) => {
  const { t } = useTranslation('photos');
  const { formatDate } = useLocaleFormatters();
  const { user } = useAuth();

  return (
    <div className="photo-gallery" role="list">
      {photos.map((photo, index) => {
        const src = resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url;
        const dateLabel = formatDate(photo.effectiveCapturedAt);
        const fieldLabel =
          photo.fieldName || (photo.fieldId ? photo.fieldId : t('badges.unassigned'));
        const typeLabel = (ownerType: string) =>
          t(`badges.${ownerType}`, { defaultValue: ownerType });
        const linkLabel = photo.isLinked ? linkedRecordLabel(photo, typeLabel) : null;
        const linkHref = photo.isLinked && !photo.linkBroken ? linkedRecordPath(photo) : null;
        const uploader = uploaderLabel(photo, user?.userId, t('badges.you'));
        const description = kindDescription(photo, t);
        const needsReview =
          photo.fieldAssignment === 'needsReview' || photo.fieldAssignment === 'unassigned';
        const aria = [dateLabel, fieldLabel, linkLabel].filter(Boolean).join('. ');

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
            </button>

            <div className="photo-card-meta">
              <span className="photo-card-meta-date">{dateLabel}</span>
              <span className="photo-card-meta-field">{fieldLabel}</span>
              {linkLabel ? (
                linkHref ? (
                  <Link
                    className="photo-card-meta-link"
                    to={linkHref}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {linkLabel}
                  </Link>
                ) : (
                  <span className="photo-card-meta-link is-static">{linkLabel}</span>
                )
              ) : (
                <span className="photo-card-meta-standalone">{t('badges.standalone')}</span>
              )}
              {uploader ? (
                <span className="photo-card-meta-uploader">
                  {t('badges.uploadedBy', { name: uploader })}
                </span>
              ) : null}
              {description ? (
                <span className="photo-card-meta-desc">{description}</span>
              ) : null}
              {photo.fileName ? (
                onOpenDetails ? (
                  <button
                    type="button"
                    className="photo-card-meta-filename"
                    title={photo.fileName}
                    onClick={() => onOpenDetails(photo)}
                  >
                    {photo.fileName}
                  </button>
                ) : (
                  <span className="photo-card-meta-filename" title={photo.fileName}>
                    {photo.fileName}
                  </span>
                )
              ) : null}
            </div>

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
