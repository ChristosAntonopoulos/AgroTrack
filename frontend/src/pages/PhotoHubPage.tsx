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
  usePhotoLightbox,
} from '../components/photos';
import type { PhotoBatchItem } from '../components/photos/PhotoReviewQueue';
import { resolvePublicAssetUrl } from '../config/apiConfig';
import { getFieldService, getPhotoService } from '../services/serviceFactory';
import { readFieldId } from '../navigation/intents';
import { useModulePageGuard } from '../hooks/useModulePageGuard';
import { useLocaleFormatters } from '../hooks/useLocaleFormatters';
import type { Field } from '../services/fieldService';
import type { Photo, PhotoLinkStatus } from '../services/photoService';
import '../components/photos/PhotoHub.css';

const PAGE_SIZE = 96;

const newLocalId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const takeImageFiles = (list: FileList | null | File[]): File[] => {
  if (!list) return [];
  const arr = Array.isArray(list) ? list : Array.from(list);
  return arr.filter((f) => f.type.startsWith('image/'));
};

const PhotoHubPage: React.FC = () => {
  const { t } = useTranslation(['photos', 'common']);
  const { formatDate } = useLocaleFormatters();
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
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [batchItems, setBatchItems] = useState<PhotoBatchItem[]>([]);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [toolbarStuck, setToolbarStuck] = useState(false);
  const [dragging, setDragging] = useState(false);
  const lightbox = usePhotoLightbox();
  const stickySentinelRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const hasPhotosRef = useRef(false);
  const uploadQueueRef = useRef<Promise<void>>(Promise.resolve());
  const batchItemsRef = useRef<PhotoBatchItem[]>([]);
  const dragDepthRef = useRef(0);

  const setBatchItemsSync = useCallback(
    (updater: PhotoBatchItem[] | ((prev: PhotoBatchItem[]) => PhotoBatchItem[])) => {
      const prev = batchItemsRef.current;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      batchItemsRef.current = next;
      setBatchItems(next);
    },
    []
  );

  const galleryItems = useMemo(
    () =>
      photos.map((photo) => {
        const fieldLabel =
          photo.fieldName || fields.find((f) => f.id === photo.fieldId)?.name || photo.fieldId;
        const dateLabel = formatDate(photo.effectiveCapturedAt);
        return {
          id: photo.id,
          src: resolvePublicAssetUrl(photo.url) || photo.url,
          thumbnailSrc: resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url,
          alt: [dateLabel, fieldLabel].filter(Boolean).join(' · ') || undefined,
        };
      }),
    [fields, formatDate, photos]
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

  useEffect(() => {
    return () => {
      batchItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke remaining previews on unmount only
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
    setBatchItemsSync((prev) =>
      prev.map((item) =>
        item.result?.photo.id === photo.id
          ? { ...item, result: item.result ? { ...item.result, photo } : item.result }
          : item
      )
    );
  };

  const openFilePicker = () => {
    uploadInputRef.current?.click();
  };

  const runUploadQueue = useCallback(() => {
    uploadQueueRef.current = uploadQueueRef.current.then(async () => {
      setUploading(true);
      setError(null);
      try {
        for (;;) {
          const current = batchItemsRef.current.find((i) => i.status === 'queued');
          if (!current) break;

          setBatchItemsSync((prev) =>
            prev.map((i) =>
              i.localId === current.localId ? { ...i, status: 'uploading' as const } : i
            )
          );

          try {
            const results = await getPhotoService().upload([current.file]);
            const result = results[0];
            setBatchItemsSync((prev) =>
              prev.map((i) => {
                if (i.localId !== current.localId) return i;
                if (!result) {
                  return { ...i, status: 'failed', error: t('photos:errors.upload') };
                }
                if (result.failed) {
                  return {
                    ...i,
                    status: 'failed',
                    error: result.error || t('photos:errors.upload'),
                    result,
                  };
                }
                if (result.duplicateSkipped) {
                  return { ...i, status: 'duplicate', result };
                }
                return { ...i, status: 'uploaded', result };
              })
            );
          } catch {
            setBatchItemsSync((prev) =>
              prev.map((i) =>
                i.localId === current.localId
                  ? { ...i, status: 'failed', error: t('photos:errors.upload') }
                  : i
              )
            );
          }

          setUploadProgress((p) => {
            const total = Math.max(p?.total ?? 1, 1);
            const done = Math.min(total, (p?.done ?? 0) + 1);
            return { done, total };
          });
        }

        await load(1, false);

        const snapshot = batchItemsRef.current;
        const uploaded = snapshot.filter((i) => i.status === 'uploaded').length;
        const duplicates = snapshot.filter((i) => i.status === 'duplicate').length;
        const failed = snapshot.filter((i) => i.status === 'failed').length;
        const review = snapshot.filter(
          (i) =>
            i.status === 'uploaded' &&
            i.result &&
            (i.result.photo.fieldAssignment === 'needsReview' ||
              i.result.photo.fieldAssignment === 'unassigned' ||
              i.result.duplicateWarning)
        ).length;
        if (failed > 0 || duplicates > 0 || review > 0) {
          setUploadNotice(
            t('photos:uploadSummary', {
              added: uploaded,
              review,
              duplicates,
              failed,
            })
          );
        } else if (uploaded > 0) {
          setUploadNotice(t('photos:uploadSuccess', { count: uploaded }));
        }
      } finally {
        setUploading(false);
        setUploadProgress(null);
      }
    });
  }, [load, setBatchItemsSync, t]);

  const stageFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const nextItems: PhotoBatchItem[] = files.map((file) => ({
        localId: newLocalId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'queued',
      }));
      setBatchItemsSync((prev) => [...prev, ...nextItems]);
      setUploadNotice(null);
      setUploadProgress((p) => ({
        done: p?.done ?? 0,
        total: (p?.total ?? 0) + nextItems.length,
      }));
      runUploadQueue();
    },
    [runUploadQueue, setBatchItemsSync]
  );

  const removeBatchItem = (localId: string) => {
    setBatchItemsSync((prev) => {
      const target = prev.find((i) => i.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.localId !== localId);
    });
    setUploadProgress((p) => (p ? { done: p.done, total: Math.max(0, p.total - 1) } : p));
  };

  const retryBatchItem = (localId: string) => {
    setBatchItemsSync((prev) =>
      prev.map((i) =>
        i.localId === localId
          ? { ...i, status: 'queued', error: null, result: undefined }
          : i
      )
    );
    setUploadProgress((p) => ({
      done: p?.done ?? 0,
      total: (p?.total ?? 0) + 1,
    }));
    runUploadQueue();
  };

  const clearBatch = () => {
    setBatchItemsSync((prev) => {
      prev.forEach((i) => URL.revokeObjectURL(i.previewUrl));
      return [];
    });
    setUploadProgress(null);
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
              onClick={openFilePicker}
            >
              <Upload size={18} aria-hidden />
              {uploading ? t('photos:uploading') : t('photos:upload')}
            </button>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="photo-hidden-input"
              onChange={(e) => {
                stageFiles(takeImageFiles(e.target.files));
                e.target.value = '';
              }}
            />
          </div>
        }
      />

      <div
        className={`photo-hub${dragging ? ' is-dragging' : ''}`}
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepthRef.current += 1;
          if (!uploading) setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepthRef.current = 0;
          setDragging(false);
          if (!uploading) stageFiles(takeImageFiles(e.dataTransfer.files));
        }}
      >
        {dragging ? (
          <div className="photo-hub-drop-overlay" aria-hidden>
            <span>{t('photos:dropActive')}</span>
          </div>
        ) : null}

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
          items={batchItems}
          fields={fields}
          uploading={uploading}
          progress={uploadProgress}
          onRemove={removeBatchItem}
          onRetry={retryBatchItem}
          onConfirmField={async (id, nextFieldId) => {
            const updated = await getPhotoService().confirmField(id, nextFieldId);
            refreshSelected(updated);
            setBatchItemsSync((prev) =>
              prev.filter(
                (item) =>
                  item.result?.photo.id !== id ||
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
          onDone={clearBatch}
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
          <div className="photo-hub-skeleton" aria-busy="true" aria-label={t('photos:loading')}>
            <span className="photo-hub-skeleton-card" />
            <span className="photo-hub-skeleton-card" />
            <span className="photo-hub-skeleton-card" />
            <span className="photo-hub-skeleton-card" />
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
                  <Button onClick={openFilePicker}>{t('photos:upload')}</Button>
                )
              }
            />
          </div>
        ) : null}

        {showGallery ? (
          <div className={`photo-hub-gallery-wrap${refreshing ? ' is-refreshing' : ''}`}>
            <PhotoHubGallery
              photos={photos}
              onOpenViewer={openLightboxAt}
              onOpenDetails={openPhotoDetails}
            />
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
