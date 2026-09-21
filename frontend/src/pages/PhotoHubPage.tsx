import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Upload, X } from 'lucide-react';
import PageContainer from '../components/Common/PageContainer';
import PageHeader from '../components/Common/PageHeader';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import EmptyState from '../components/Common/EmptyState';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import Button from '../components/Common/Button';
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
import { readFieldId } from '../navigation/intents';
import { useModulePageGuard } from '../hooks/useModulePageGuard';
import { formatPhotoCardDate } from '../utils/localeFormatters';
import type { Field } from '../services/fieldService';
import type { Photo, PhotoLinkStatus, PhotoUploadResult } from '../services/photoService';
import '../components/photos/PhotoHub.css';

const PAGE_SIZE = 96;

const PhotoHubPage: React.FC = () => {
  const { t, i18n } = useTranslation(['photos', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();
  const pageGuard = useModulePageGuard({ module: 'photos' });
  const fieldId = readFieldId(searchParams);
  const linkStatus = (searchParams.get('linkStatus') as PhotoLinkStatus) || 'all';
  const assignment = searchParams.get('assignment') || '';
  const photoId = searchParams.get('photoId') || '';

  const [fields, setFields] = useState<Field[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewItems, setReviewItems] = useState<PhotoUploadResult[]>([]);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [failedFiles, setFailedFiles] = useState<File[]>([]);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [toolbarStuck, setToolbarStuck] = useState(false);
  const lightbox = usePhotoLightbox();
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const stickySentinelRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const hasPhotosRef = useRef(false);

  const galleryItems = useMemo(
    () =>
      photos.map((photo) => {
        const fieldLabel =
          photo.fieldName || fields.find((f) => f.id === photo.fieldId)?.name || photo.fieldId;
        const dateLabel = formatPhotoCardDate(photo.effectiveCapturedAt, i18n.language);
        return {
          id: photo.id,
          src: resolvePublicAssetUrl(photo.url) || photo.url,
          thumbnailSrc: resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url,
          alt: [dateLabel, fieldLabel].filter(Boolean).join(' · ') || undefined,
        };
      }),
    [fields, i18n.language, photos]
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

  const clearAllFilters = () => {
    patch({ fieldId: null, linkStatus: null, assignment: null });
  };

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    if (fieldId) {
      const name = fields.find((f) => f.id === fieldId)?.name || fieldId;
      chips.push({
        key: 'field',
        label: `${t('photos:filters.field')}: ${name}`,
        clear: () => patch({ fieldId: null }),
      });
    }
    if (linkStatus !== 'all') {
      chips.push({
        key: 'link',
        label: t(`photos:filters.${linkStatus}`),
        clear: () => patch({ linkStatus: null }),
      });
    }
    if (assignment) {
      chips.push({
        key: 'assignment',
        label: t(`photos:filters.${assignment}`),
        clear: () => patch({ assignment: null }),
      });
    }
    return chips;
  }, [assignment, fieldId, fields, linkStatus, t]);

  const filterSummary = activeFilterChips.map((c) => c.label).join(' + ');

  const refreshNeedsReviewCount = useCallback(async () => {
    try {
      const list = await getPhotoService().query({
        fieldAssignment: 'needsReview',
        page: 1,
        pageSize: 1,
      });
      setNeedsReviewCount(list.totalCount);
    } catch {
      /* badge is optional chrome */
    }
  }, []);

  const load = useCallback(
    async (nextPage = 1, append = false) => {
      if (append) setLoadingMore(true);
      else if (hasPhotosRef.current) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [fieldList, list] = await Promise.all([
          getFieldService().getFields(),
          getPhotoService().query({
            fieldId: fieldId || undefined,
            linkStatus: linkStatus === 'all' ? undefined : linkStatus,
            fieldAssignment: assignment || undefined,
            page: nextPage,
            pageSize: PAGE_SIZE,
          }),
        ]);
        setFields(fieldList);
        setPhotos((prev) => (append ? [...prev, ...list.items] : list.items));
        setTotal(list.totalCount);
        setPage(nextPage);
        hasPhotosRef.current = list.items.length > 0 || append;
        void refreshNeedsReviewCount();
      } catch {
        setError(t('photos:errors.load'));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [assignment, fieldId, linkStatus, refreshNeedsReviewCount, t]
  );

  useEffect(() => {
    void load(1, false);
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

  useEffect(() => {
    const node = stickySentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setToolbarStuck(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const openPhotoDetails = (photo: Photo) => {
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
      prev.map((item) => (item.photo.id === photo.id ? { ...item, photo } : item))
    );
  };

  const takeFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const images = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (images.length) void uploadFiles(images);
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    setError(null);
    setUploadNotice(null);
    setFailedFiles([]);
    try {
      const results = await getPhotoService().upload(files);
      const added = results.filter((r) => !r.failed && !r.duplicateSkipped).length;
      const duplicates = results.filter((r) => r.duplicateSkipped).length;
      const failed = results.filter((r) => r.failed).length;
      const needsReview = results.filter(
        (r) =>
          !r.failed &&
          !r.duplicateSkipped &&
          (r.photo.fieldAssignment === 'needsReview' ||
            r.photo.fieldAssignment === 'unassigned' ||
            r.duplicateWarning)
      );
      setReviewItems((prev) => [...needsReview, ...prev]);
      if (failed > 0 || duplicates > 0 || needsReview.length > 0) {
        setUploadNotice(
          t('photos:uploadSummary', {
            added,
            review: needsReview.length,
            duplicates,
            failed,
          })
        );
      } else {
        setUploadNotice(t('photos:uploadSuccess', { count: added }));
      }
      if (failed > 0) {
        setFailedFiles(files);
      }
      await load(1, false);
    } catch {
      setError(t('photos:errors.upload'));
      setFailedFiles(files);
    } finally {
      setUploading(false);
    }
  };

  const scrollToUpload = () => {
    dropzoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    uploadInputRef.current?.click();
  };

  const hasMore = photos.length < total;
  const hasActiveFilters = activeFilterChips.length > 0;
  const showInitialLoading = loading && photos.length === 0;
  const showEmpty = !loading && !refreshing && photos.length === 0;
  const showGallery = photos.length > 0;

  if (pageGuard.loading) {
    return (
      <PageContainer>
        <Breadcrumbs />
        <LoadingSpinner />
      </PageContainer>
    );
  }
  if (!pageGuard.allowed) {
    return <Navigate to="/access-denied?module=photos" replace />;
  }

  return (
    <PageContainer>
      <Breadcrumbs />
      <PageHeader
        title={t('photos:title')}
        subtitle={t('photos:subtitle')}
        actions={
          <div className="photo-hub-header-actions">
            <button
              type="button"
              className="photo-hub-cta"
              disabled={uploading}
              onClick={scrollToUpload}
            >
              <Upload size={18} aria-hidden />
              {uploading ? t('photos:uploading') : t('photos:upload')}
            </button>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              disabled={uploading}
              className="photo-hidden-input"
              onChange={(e) => {
                takeFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>
        }
      />

      <div className="photo-hub">
        <div ref={dropzoneRef} className="photo-hub-drop-wrap">
          <PhotoUploadDropzone disabled={uploading} onFiles={uploadFiles} />
        </div>

        <div ref={stickySentinelRef} className="photo-hub-sticky-sentinel" aria-hidden />
        <div className={`photo-hub-sticky${toolbarStuck ? ' is-stuck' : ''}`}>
          <div className="photo-hub-toolbar">
            <div className="photo-hub-toolbar-row">
              <label className="photo-sr-only" htmlFor="photo-hub-field">
                {t('photos:filters.field')}
              </label>
              <select
                id="photo-hub-field"
                className="photo-hub-field-select"
                value={fieldId}
                disabled={refreshing}
                onChange={(e) => patch({ fieldId: e.target.value || null })}
              >
                <option value="">{t('photos:filters.allFields')}</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>

              <div
                className="photo-hub-segment"
                role="group"
                aria-label={t('photos:filters.linkStatus')}
              >
                {(
                  [
                    ['all', t('photos:filters.all')],
                    ['standalone', t('photos:filters.standalone')],
                    ['linked', t('photos:filters.linked')],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`photo-hub-segment-btn${linkStatus === value ? ' is-active' : ''}`}
                    aria-pressed={linkStatus === value}
                    disabled={refreshing}
                    onClick={() => patch({ linkStatus: value === 'all' ? null : value })}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div
                className="photo-hub-segment"
                role="group"
                aria-label={t('photos:filters.assignment')}
              >
                {(
                  [
                    ['', t('photos:filters.all')],
                    ['needsReview', t('photos:filters.needsReview')],
                    ['unassigned', t('photos:filters.unassigned')],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value || 'all-assignment'}
                    type="button"
                    className={`photo-hub-segment-btn${assignment === value ? ' is-active' : ''}`}
                    aria-pressed={assignment === value}
                    disabled={refreshing}
                    onClick={() => patch({ assignment: value || null })}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="photo-hub-toolbar-meta">
                {needsReviewCount > 0 && assignment !== 'needsReview' ? (
                  <button
                    type="button"
                    className="photo-hub-review-jump"
                    onClick={() => patch({ assignment: 'needsReview' })}
                  >
                    {t('photos:filters.needsReview')}
                    <span className="photo-hub-review-count">{needsReviewCount}</span>
                  </button>
                ) : null}
                {refreshing ? (
                  <span className="photo-hub-count">{t('photos:refreshing')}</span>
                ) : !loading ? (
                  <span className="photo-hub-count">
                    {t('photos:showingCount', { shown: photos.length, total })}
                  </span>
                ) : null}
              </div>
            </div>

            {activeFilterChips.length > 0 ? (
              <div className="photo-hub-active-filters" aria-label={t('photos:filters.active')}>
                {activeFilterChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className="photo-hub-filter-chip"
                    onClick={chip.clear}
                  >
                    <span>{chip.label}</span>
                    <X size={14} aria-hidden />
                  </button>
                ))}
                <button
                  type="button"
                  className="photo-hub-clear-filters"
                  onClick={clearAllFilters}
                >
                  {t('photos:clearAllFilters')}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {uploadNotice ? (
          <div className="photo-hub-success" role="status">
            <span>{uploadNotice}</span>
            {failedFiles.length > 0 ? (
              <button
                type="button"
                className="photo-hub-success-dismiss"
                onClick={() => void uploadFiles(failedFiles)}
              >
                {t('photos:retryUpload')}
              </button>
            ) : null}
            <button
              type="button"
              className="photo-hub-success-dismiss"
              onClick={() => setUploadNotice(null)}
            >
              {t('photos:dismissNotice')}
            </button>
          </div>
        ) : null}

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
            await load(1, false);
          }}
          onUpdateCapturedAt={async (id, capturedAt) => {
            const updated = await getPhotoService().update(id, { capturedAt });
            refreshSelected(updated);
          }}
          onDone={() => setReviewItems([])}
        />

        {error ? (
          <p className="photo-hub-alert" role="alert">
            {error}
            <button type="button" className="photo-hub-retry" onClick={() => void load(1, false)}>
              {t('photos:errors.retry')}
            </button>
          </p>
        ) : null}

        {showInitialLoading ? (
          <div className="photo-hub-loading">
            <LoadingSpinner />
            <span>{t('photos:loading')}</span>
          </div>
        ) : null}

        {showEmpty ? (
          <div className="photo-hub-empty-wrap">
            <EmptyState
              title={
                hasActiveFilters
                  ? t('photos:emptyFiltered', { filters: filterSummary })
                  : t('photos:empty')
              }
              description={hasActiveFilters ? undefined : t('photos:emptyAttachHint')}
              action={
                hasActiveFilters ? (
                  <Button variant="secondary" onClick={clearAllFilters}>
                    {t('photos:clearFilters')}
                  </Button>
                ) : (
                  <Button onClick={scrollToUpload}>{t('photos:upload')}</Button>
                )
              }
            />
          </div>
        ) : null}

        {showGallery ? (
          <div className={`photo-hub-gallery-wrap${refreshing ? ' is-refreshing' : ''}`}>
            <PhotoHubGallery photos={photos} onOpenViewer={openLightboxAt} />
            <div className="photo-hub-footer">
              <span className="photo-hub-count">
                {t('photos:showingCount', { shown: photos.length, total })}
              </span>
              {hasMore ? (
                <Button
                  className="photo-hub-load-more"
                  variant="secondary"
                  loading={loadingMore}
                  disabled={loadingMore}
                  onClick={() => void load(page + 1, true)}
                >
                  {t('photos:loadMore')}
                </Button>
              ) : null}
            </div>
          </div>
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
          await load(1, false);
        }}
        onLink={async (id: string, ownerType: string, ownerId: string) => {
          const updated = await getPhotoService().link(id, ownerType, ownerId);
          refreshSelected(updated);
          await load(1, false);
        }}
        onUnlink={async (id: string) => {
          const updated = await getPhotoService().unlink(id);
          refreshSelected(updated);
          await load(1, false);
        }}
        onDelete={async (id: string) => {
          await getPhotoService().delete(id);
          closePhoto();
          await load(1, false);
        }}
      />
      <PhotoLightbox
        open={lightbox.open}
        items={lightbox.items}
        index={lightbox.index}
        onClose={lightbox.close}
        onIndexChange={lightbox.setIndex}
        footerAction={
          lightbox.open && photos[lightbox.index] ? (
            <button
              type="button"
              className="photo-lightbox-details"
              onClick={() => {
                const photo = photos[lightbox.index];
                if (!photo) return;
                lightbox.close();
                openPhotoDetails(photo);
              }}
            >
              {t('photos:viewer.openDetails')}
            </button>
          ) : null
        }
      />
    </PageContainer>
  );
};

export default PhotoHubPage;
