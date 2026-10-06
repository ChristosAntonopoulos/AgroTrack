import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import { getPhotoService } from '../../services/serviceFactory';
import type { Photo } from '../../services/photoService';
import PhotoLightbox from '../photos/PhotoLightbox';
import PhotoFrame from '../photos/PhotoFrame';
import { usePhotoLightbox } from '../photos/usePhotoLightbox';
import { photosPath } from '../../navigation/intents';
import { normalizeLocale } from '../../i18n/config';

export type FieldPhotoPreview = {
  id: string;
  url?: string;
  thumbnailUrl?: string;
  capturedAt?: string;
};

type Props = {
  fieldId: string;
  /** Canonical overview preview — preferred over a second photo query. */
  photos?: FieldPhotoPreview[] | null;
};

const resolveSrc = (photo: FieldPhotoPreview | Photo) => {
  const thumb =
    ('thumbnailUrl' in photo ? photo.thumbnailUrl : undefined) || photo.url || '';
  return resolvePublicAssetUrl(thumb) || thumb;
};

const resolveFull = (photo: FieldPhotoPreview | Photo) => {
  const full = photo.url || ('thumbnailUrl' in photo ? photo.thumbnailUrl : undefined) || '';
  return resolvePublicAssetUrl(full) || full;
};

const FieldPhotosStrip: React.FC<Props> = ({ fieldId, photos: overviewPhotos }) => {
  const { t, i18n } = useTranslation(['fields', 'photos']);
  const [fallbackPhotos, setFallbackPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(overviewPhotos == null);
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set());
  const lightbox = usePhotoLightbox();
  const locale = normalizeLocale(i18n.language);

  const useOverview = overviewPhotos != null;
  const photos: Array<FieldPhotoPreview | Photo> = useOverview
    ? overviewPhotos
    : fallbackPhotos;

  useEffect(() => {
    if (useOverview) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const list = await getPhotoService().query({
          fieldId,
          page: 1,
          pageSize: 6,
        });
        if (!cancelled) setFallbackPhotos(list.items);
      } catch {
        if (!cancelled) setFallbackPhotos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [fieldId, useOverview]);

  const visible = useMemo(
    () => photos.filter((photo) => !failedIds.has(photo.id) && resolveSrc(photo)),
    [photos, failedIds]
  );

  const items = useMemo(
    () =>
      visible.map((photo) => ({
        id: photo.id,
        src: resolveFull(photo),
        thumbnailSrc: resolveSrc(photo),
        alt: ('fileName' in photo && photo.fileName) || undefined,
      })),
    [visible]
  );

  const markFailed = (id: string) => {
    setFailedIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  };

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

  if (visible.length === 0) {
    return (
      <section className="field-photos-strip" aria-label={t('fields:controlRoom.latestPhotos')}>
        <div className="field-photos-strip-head">
          <h2>{t('fields:controlRoom.latestPhotos')}</h2>
          <Link to={photosPath({ fieldId })}>
            {t('photos:openHub', { defaultValue: 'Open photos' })}
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
            {t('fields:controlRoom.photosEvidenceHint')}
          </p>
        </div>
        <Link to={photosPath({ fieldId })}>
          {t('photos:openHub', { defaultValue: 'Open photos' })}
        </Link>
      </div>
      <div className="field-photos-row">
        {visible.map((photo, index) => {
          const src = resolveSrc(photo);
          const when =
            ('capturedAt' in photo && photo.capturedAt) ||
            ('createdAt' in photo && photo.createdAt) ||
            undefined;
          const dateLabel = when
            ? new Date(when).toLocaleDateString(locale === 'el' ? 'el-GR' : locale, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : null;
          const linked =
            'isLinked' in photo && photo.isLinked && !('linkBroken' in photo && photo.linkBroken);
          const brokenLink = 'linkBroken' in photo && Boolean(photo.linkBroken);
          const activateLabel = dateLabel
            ? `${t('photos:viewer.expand')} · ${dateLabel}`
            : t('photos:viewer.expand');
          return (
            <div
              key={photo.id}
              className={`field-photo-thumb${linked ? ' is-linked' : ''}${brokenLink ? ' is-broken-link' : ''}`}
            >
              <PhotoFrame
                src={src}
                alt=""
                className="field-photo-frame"
                onActivate={() => lightbox.openAt(items, index)}
                activateLabel={activateLabel}
                onRemove={() => markFailed(photo.id)}
              />
              {dateLabel ? <span className="field-photo-date">{dateLabel}</span> : null}
              {brokenLink ? (
                <span className="field-photo-badge is-warn">{t('photos:detail.linkBroken')}</span>
              ) : linked && 'ownerType' in photo && photo.ownerType ? (
                <span className="field-photo-badge">{t(`photos:badges.${photo.ownerType}`)}</span>
              ) : null}
            </div>
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
