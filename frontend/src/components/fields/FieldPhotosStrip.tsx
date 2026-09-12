import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import { getPhotoService } from '../../services/serviceFactory';
import type { Photo } from '../../services/photoService';
import PhotoLightbox from '../photos/PhotoLightbox';
import { usePhotoLightbox } from '../photos/usePhotoLightbox';

type Props = {
  fieldId: string;
};

const FieldPhotosStrip: React.FC<Props> = ({ fieldId }) => {
  const { t } = useTranslation(['fields', 'photos']);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const lightbox = usePhotoLightbox();

  const items = useMemo(
    () =>
      photos.map((photo) => ({
        id: photo.id,
        src: resolvePublicAssetUrl(photo.url) || photo.url,
        thumbnailSrc: resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url,
        alt: photo.fileName || undefined,
      })),
    [photos]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const list = await getPhotoService().query({
          fieldId,
          page: 1,
          pageSize: 8,
        });
        if (!cancelled) setPhotos(list.items);
      } catch {
        if (!cancelled) setPhotos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  if (loading) return null;

  return (
    <section className="field-photos-strip" aria-label={t('fields:controlRoom.latestPhotos')}>
      <div className="field-photos-strip-head">
        <h2>{t('fields:controlRoom.latestPhotos')}</h2>
        <Link to={`/photos?fieldId=${encodeURIComponent(fieldId)}`}>
          {t('photos:openHub', { defaultValue: 'Open Photo Hub' })}
        </Link>
      </div>
      {photos.length === 0 ? (
        <p className="field-photos-empty">{t('fields:controlRoom.noPhotos')}</p>
      ) : (
        <div className="field-photos-row">
          {photos.map((photo, index) => {
            const src = resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url;
            return (
              <button
                key={photo.id}
                type="button"
                className={`field-photo-thumb${photo.isLinked ? ' is-linked' : ''}`}
                onClick={() => lightbox.openAt(items, index)}
                aria-label={t('photos:viewer.expand')}
              >
                <img src={src} alt="" loading="lazy" />
                {photo.isLinked ? (
                  <span className="field-photo-badge">{t(`photos:badges.${photo.ownerType}`)}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
      <PhotoLightbox
        open={lightbox.open}
        items={lightbox.items}
        index={lightbox.index}
        onClose={lightbox.close}
        onIndexChange={lightbox.setIndex}
      />
    </section>
  );
};

export default FieldPhotosStrip;
