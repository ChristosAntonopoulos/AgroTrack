import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import { getPhotoService } from '../../services/serviceFactory';
import type { Photo } from '../../services/photoService';
import PhotoLightbox from '../photos/PhotoLightbox';
import { usePhotoLightbox } from '../photos/usePhotoLightbox';
import { photosPath } from '../../navigation/intents';
import { normalizeLocale } from '../../i18n/config';

type Props = {
  fieldId: string;
};

const FieldPhotosStrip: React.FC<Props> = ({ fieldId }) => {
  const { t, i18n } = useTranslation(['fields', 'photos']);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const lightbox = usePhotoLightbox();
  const locale = normalizeLocale(i18n.language);

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

  if (loading) {
    return (
      <section className="field-photos-strip" aria-label={t('fields:controlRoom.latestPhotos')}>
        <div className="field-photos-strip-head">
          <h2>{t('fields:controlRoom.latestPhotos')}</h2>
        </div>
        <p className="field-photos-empty">{t('fields:card.todayTasksLoading')}</p>
      </section>
    );
  }

  if (photos.length === 0) {
    return (
      <section className="field-photos-strip" aria-label={t('fields:controlRoom.latestPhotos')}>
        <div className="field-photos-strip-head">
          <h2>{t('fields:controlRoom.latestPhotos')}</h2>
          <Link to={photosPath({ fieldId })}>
            {t('photos:openHub', { defaultValue: 'Open Photo Hub' })}
          </Link>
        </div>
        <p className="field-photos-empty">{t('fields:controlRoom.noPhotos')}</p>
      </section>
    );
  }

  return (
    <section className="field-photos-strip" aria-label={t('fields:controlRoom.latestPhotos')}>
      <div className="field-photos-strip-head">
        <div>
          <h2>{t('fields:controlRoom.latestPhotos')}</h2>
          <p className="field-photos-meta">
            {t('fields:controlRoom.photosCount', { count: photos.length })}
          </p>
        </div>
        <Link to={photosPath({ fieldId })}>
          {t('photos:openHub', { defaultValue: 'Open Photo Hub' })}
        </Link>
      </div>
      <div className="field-photos-row">
        {photos.map((photo, index) => {
          const src = resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url;
          const when = photo.createdAt;
          const dateLabel = when
            ? new Date(when).toLocaleDateString(locale === 'el' ? 'el-GR' : locale, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : null;
          return (
            <button
              key={photo.id}
              type="button"
              className={`field-photo-thumb${photo.isLinked ? ' is-linked' : ''}`}
              onClick={() => lightbox.openAt(items, index)}
              aria-label={
                dateLabel
                  ? `${t('photos:viewer.expand')} · ${dateLabel}`
                  : t('photos:viewer.expand')
              }
            >
              <img src={src} alt="" loading="lazy" />
              {dateLabel ? <span className="field-photo-date">{dateLabel}</span> : null}
              {photo.isLinked ? (
                <span className="field-photo-badge">{t(`photos:badges.${photo.ownerType}`)}</span>
              ) : null}
            </button>
          );
        })}
      </div>
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
