import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../components/Common/PageContainer';
import PageHeader from '../components/Common/PageHeader';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import EmptyState from '../components/Common/EmptyState';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import {
  PhotoDetailDrawer,
  PhotoHubGallery,
  PhotoLightbox,
  PhotoReviewQueue,
  PhotoUploadDropzone,
  usePhotoLightbox,
} from '../components/photos';
import { resolvePublicAssetUrl } from '../config/apiConfig';
import { getFieldService, getPhotoService } from '../services/serviceFactory';
import type { Field } from '../services/fieldService';
import type { Photo, PhotoLinkStatus, PhotoUploadResult } from '../services/photoService';
import '../components/photos/PhotoHub.css';

const PhotoHubPage: React.FC = () => {
  const { t } = useTranslation(['photos', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();
  const fieldId = searchParams.get('fieldId') || '';
  const linkStatus = (searchParams.get('linkStatus') as PhotoLinkStatus) || 'all';
  const assignment = searchParams.get('assignment') || '';
  const photoId = searchParams.get('photoId') || '';

  const [fields, setFields] = useState<Field[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewItems, setReviewItems] = useState<PhotoUploadResult[]>([]);
  const [selected, setSelected] = useState<Photo | null>(null);
  const lightbox = usePhotoLightbox();

  const galleryItems = useMemo(
    () =>
      photos.map((photo) => ({
        id: photo.id,
        src: resolvePublicAssetUrl(photo.url) || photo.url,
        thumbnailSrc: resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url,
        alt: photo.fileName || undefined,
      })),
    [photos]
  );

  const openLightboxAt = useCallback(
    (photo: Photo, index?: number) => {
      const idx = index ?? photos.findIndex((p) => p.id === photo.id);
      lightbox.openAt(galleryItems, idx >= 0 ? idx : 0);
    },
    [galleryItems, lightbox, photos]
  );

  const patch = (next: Record<string, string | null | undefined>) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      Object.entries(next).forEach(([key, value]) => {
        if (value == null || value === '') p.delete(key);
        else p.set(key, value);
      });
      return p;
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fieldList, list] = await Promise.all([
        getFieldService().getFields(),
        getPhotoService().query({
          fieldId: fieldId || undefined,
          linkStatus: linkStatus === 'all' ? undefined : linkStatus,
          fieldAssignment: assignment || undefined,
          page: 1,
          pageSize: 96,
        }),
      ]);
      setFields(fieldList);
      setPhotos(list.items);
      setTotal(list.totalCount);
    } catch {
      setError(t('photos:errors.load'));
    } finally {
      setLoading(false);
    }
  }, [assignment, fieldId, linkStatus, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!photoId) return;
    const fromList = photos.find((p) => p.id === photoId);
    if (fromList) {
      setSelected(fromList);
      return;
    }
    if (loading) return;
    let cancelled = false;
    void getPhotoService()
      .getById(photoId)
      .then((photo) => {
        if (!cancelled) setSelected(photo);
      })
      .catch(() => {
        /* ignore missing deep-link targets */
      });
    return () => {
      cancelled = true;
    };
  }, [loading, photoId, photos]);

  const openPhoto = (photo: Photo) => {
    setSelected(photo);
    patch({ photoId: photo.id });
  };

  const closePhoto = () => {
    setSelected(null);
    patch({ photoId: null });
  };

  const refreshSelected = (photo: Photo) => {
    setSelected(photo);
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? photo : p)));
    setReviewItems((prev) =>
      prev.map((item) =>
        item.photo.id === photo.id ? { ...item, photo } : item
      )
    );
  };

  return (
    <PageContainer>
      <Breadcrumbs />
      <PageHeader title={t('photos:title')} subtitle={t('photos:subtitle')} />

      <div className="photo-hub">
        <PhotoUploadDropzone
          disabled={uploading}
          onFiles={async (files) => {
            setUploading(true);
            setError(null);
            try {
              const results = await getPhotoService().upload(files);
              const needsReview = results.filter(
                (r) =>
                  r.photo.fieldAssignment === 'needsReview' ||
                  r.photo.fieldAssignment === 'unassigned' ||
                  r.duplicateWarning
              );
              setReviewItems((prev) => [...needsReview, ...prev]);
              await load();
            } catch {
              setError(t('photos:errors.upload'));
            } finally {
              setUploading(false);
            }
          }}
        />

        <div className="photo-hub-toolbar">
          <label>
            {t('photos:filters.field')}
            <select
              value={fieldId}
              onChange={(e) => patch({ fieldId: e.target.value || null })}
            >
              <option value="">{t('photos:filters.allFields')}</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('photos:filters.linkStatus')}
            <select
              value={linkStatus}
              onChange={(e) => patch({ linkStatus: e.target.value === 'all' ? null : e.target.value })}
            >
              <option value="all">{t('photos:filters.all')}</option>
              <option value="standalone">{t('photos:filters.standalone')}</option>
              <option value="linked">{t('photos:filters.linked')}</option>
            </select>
          </label>
          <label>
            {t('photos:filters.assignment')}
            <select
              value={assignment}
              onChange={(e) => patch({ assignment: e.target.value || null })}
            >
              <option value="">{t('photos:filters.all')}</option>
              <option value="needsReview">{t('photos:filters.needsReview')}</option>
              <option value="unassigned">{t('photos:filters.unassigned')}</option>
            </select>
          </label>
        </div>

        <PhotoReviewQueue
          items={reviewItems}
          fields={fields}
          onConfirmField={async (id, nextFieldId) => {
            const updated = await getPhotoService().confirmField(id, nextFieldId);
            refreshSelected(updated);
            setReviewItems((prev) =>
              prev.filter(
                (item) =>
                  item.photo.id !== id ||
                  updated.fieldAssignment === 'needsReview' ||
                  updated.fieldAssignment === 'unassigned'
              )
            );
            await load();
          }}
          onUpdateCapturedAt={async (id, capturedAt) => {
            const updated = await getPhotoService().update(id, { capturedAt });
            refreshSelected(updated);
          }}
          onDone={() => setReviewItems([])}
        />

        {error ? <p role="alert">{error}</p> : null}
        {loading ? <LoadingSpinner /> : null}
        {!loading && photos.length === 0 ? (
          <EmptyState title={t('photos:empty')} description={t('photos:emptyHint')} />
        ) : null}
        {!loading && photos.length > 0 ? (
          <>
            <PhotoHubGallery
              photos={photos}
              onSelect={openPhoto}
              onExpand={openLightboxAt}
            />
            <p style={{ opacity: 0.7, fontSize: '0.85rem' }}>
              {photos.length}/{total}
            </p>
          </>
        ) : null}
      </div>

      <PhotoDetailDrawer
        open={!!selected}
        photo={selected}
        fields={fields}
        onClose={closePhoto}
        onExpandFullscreen={(photo) => openLightboxAt(photo)}
        onConfirmField={async (id: string, nextFieldId: string) => {
          const updated = await getPhotoService().confirmField(id, nextFieldId);
          refreshSelected(updated);
          await load();
        }}
        onLink={async (id: string, ownerType: string, ownerId: string) => {
          const updated = await getPhotoService().link(id, ownerType, ownerId);
          refreshSelected(updated);
          await load();
        }}
        onUnlink={async (id: string) => {
          const updated = await getPhotoService().unlink(id);
          refreshSelected(updated);
          await load();
        }}
        onDelete={async (id: string) => {
          await getPhotoService().delete(id);
          closePhoto();
          await load();
        }}
      />
      <PhotoLightbox
        open={lightbox.open}
        items={lightbox.items}
        index={lightbox.index}
        onClose={lightbox.close}
        onIndexChange={lightbox.setIndex}
      />
    </PageContainer>
  );
};

export default PhotoHubPage;
