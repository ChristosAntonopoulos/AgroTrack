import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, SlidersHorizontal, Trash2, Upload, X } from 'lucide-react';
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
import type { PhotoBatchItem } from '../components/photos/PhotoReviewQueue';
import { PHOTO_ACCEPT, classifyPhotoFile } from '../components/photos/photoUploadRules';
import { daysUntilPurge } from '../components/photos/photoLabels';
import { resolveFieldColor } from '../utils/fieldColors';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import PhotoFrame from '../components/photos/PhotoFrame';
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

const takeFiles = (list: FileList | null | File[]): File[] => {
  if (!list) return [];
  return Array.isArray(list) ? list : Array.from(list);
};

const PhotoHubPage: React.FC = () => {
  const { t } = useTranslation(['photos', 'common']);
  const { formatDate, formatTime } = useLocaleFormatters();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageGuard = useModulePageGuard({ module: 'photos' });
  const fieldId = readFieldId(searchParams);
  const linkStatus = (searchParams.get('linkStatus') as PhotoLinkStatus) || 'all';
  const assignment = searchParams.get('assignment') || '';
  const photoId = searchParams.get('photoId') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const sort = searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const viewingTrash = searchParams.get('view') === 'trash';

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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsEditing, setDetailsEditing] = useState(false);
  const [editPulse, setEditPulse] = useState(0);
  const [trashPhotos, setTrashPhotos] = useState<Photo[]>([]);
  const [trashTotal, setTrashTotal] = useState(0);
  const [undo, setUndo] = useState<{ id: string } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fieldMenuOpen, setFieldMenuOpen] = useState(false);
  const filtersMenuRef = useRef<HTMLDivElement>(null);
  const fieldMenuRef = useRef<HTMLDivElement>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkFieldId, setBulkFieldId] = useState('');
  const lightbox = usePhotoLightbox();
  const stickySentinelRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const hasPhotosRef = useRef(false);
  const openedDeepLinkRef = useRef<string | null>(null);
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
        const timeLabel = formatTime(photo.effectiveCapturedAt);
        return {
          id: photo.id,
          src: resolvePublicAssetUrl(photo.url) || photo.url,
          thumbnailSrc: resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url,
          alt: [dateLabel, timeLabel, fieldLabel].filter(Boolean).join(' · ') || undefined,
          context: t('photos:viewer.context', { field: fieldLabel || t('photos:badges.unassigned'), date: dateLabel }),
        };
      }),
    [fields, formatDate, formatTime, photos, t]
  );

  useEffect(() => {
    if (lightbox.open) lightbox.syncItems(galleryItems);
    // syncItems bails when the visible set is unchanged
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryItems, lightbox.open]);

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
    patch({ fieldId: null, linkStatus: null, assignment: null, from: null, to: null, sort: null });
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
        label:
          linkStatus === 'standalone'
            ? t('photos:filters.standaloneFull')
            : t(`photos:filters.${linkStatus}`),
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
    if (from || to) {
      chips.push({
        key: 'dates',
        label: [from, to].filter(Boolean).join(' – '),
        clear: () => patch({ from: null, to: null }),
      });
    }
    if (sort === 'oldest') {
      chips.push({
        key: 'sort',
        label: t('photos:filters.oldest'),
        clear: () => patch({ sort: null }),
      });
    }
    return chips;
  }, [assignment, fieldId, fields, from, linkStatus, sort, t, to]);

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
            from: from ? `${from}T00:00:00.000Z` : undefined,
            to: to ? `${to}T23:59:59.999Z` : undefined,
            sort,
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
    [assignment, fieldId, from, linkStatus, refreshNeedsReviewCount, sort, t, to]
  );

  useEffect(() => {
    void load(1, false);
  }, [load]);

  useEffect(() => {
    if (!photoId || viewingTrash) return;
    const index = photos.findIndex((p) => p.id === photoId);
    if (index >= 0) {
      setSelected(photos[index]);
      if (openedDeepLinkRef.current !== photoId) {
        openedDeepLinkRef.current = photoId;
        lightbox.openAt(galleryItems, index);
        setDetailsOpen(true);
        setDetailsEditing(false);
      }
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
    // galleryItems/lightbox.openAt are read when a new photoId arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, photoId, photos, viewingTrash]);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getPhotoService().trash(1, PAGE_SIZE);
      setTrashPhotos(list.items);
      setTrashTotal(list.totalCount);
    } catch {
      setError(t('photos:errors.load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!viewingTrash) return;
    void loadTrash();
  }, [loadTrash, viewingTrash]);

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
            const results = await getPhotoService().upload([current.file], {
              allowDuplicates: current.allowDuplicate,
            });
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

  const fileIssueMessage = (issue: ReturnType<typeof classifyPhotoFile>) => {
    if (issue === 'heic') return t('photos:errors.heic');
    if (issue === 'oversize') return t('photos:errors.oversize');
    if (issue === 'empty') return t('photos:errors.emptyFile');
    return t('photos:errors.unsupported');
  };

  const stageFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const nextItems: PhotoBatchItem[] = files.map((file) => {
        const issue = classifyPhotoFile(file);
        return {
          localId: newLocalId(),
          file,
          previewUrl: file.type.startsWith('image/') && !issue ? URL.createObjectURL(file) : '',
          status: issue ? 'failed' : 'staged',
          error: issue ? fileIssueMessage(issue) : null,
        };
      });
      setBatchItemsSync((prev) => [...prev, ...nextItems]);
      setUploadNotice(null);
    },
    [setBatchItemsSync, t]
  );

  const startStagedUpload = () => {
    const staged = batchItemsRef.current.filter((item) => item.status === 'staged');
    if (staged.length === 0) return;
    setBatchItemsSync((prev) =>
      prev.map((item) => (item.status === 'staged' ? { ...item, status: 'queued' as const } : item))
    );
    setUploadProgress({ done: 0, total: staged.length });
    runUploadQueue();
  };

  const keepDuplicate = (localId: string) => {
    setBatchItemsSync((prev) =>
      prev.map((item) =>
        item.localId === localId
          ? { ...item, status: 'queued' as const, allowDuplicate: true, error: null }
          : item
      )
    );
    setUploadProgress((p) => ({ done: p?.done ?? 0, total: (p?.total ?? 0) + 1 }));
    runUploadQueue();
  };

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
  const advancedFilterCount =
    (linkStatus !== 'all' ? 1 : 0) + (assignment ? 1 : 0) + (from || to ? 1 : 0);

  useEffect(() => {
    if (!filtersOpen && !fieldMenuOpen) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filtersOpen && !filtersMenuRef.current?.contains(target)) setFiltersOpen(false);
      if (fieldMenuOpen && !fieldMenuRef.current?.contains(target)) setFieldMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setFiltersOpen(false);
      setFieldMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [fieldMenuOpen, filtersOpen]);
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

  const viewerPhoto = lightbox.open ? photos[lightbox.index] ?? null : null;
  const countLabel =
    hasActiveFilters && total === 0
      ? assignment === 'needsReview' && activeFilterChips.length === 1
        ? t('photos:emptyReview')
        : t('photos:filteredCount', { count: 0 })
      : t('photos:showingCount', { shown: photos.length, total });

  return (
    <PageContainer className="photo-page">
      <Breadcrumbs />
      <PageHeader
        title={viewingTrash ? t('photos:trash.title') : t('photos:title')}
        subtitle={viewingTrash ? t('photos:trash.lead') : t('photos:uploadPromise')}
        actions={
          <div className="photo-hub-header-actions">
            {viewingTrash ? (
              <Button variant="secondary" onClick={() => patch({ view: null })}>
                {t('photos:trash.back')}
              </Button>
            ) : (
              <Button
                variant="secondary"
                icon={<Trash2 size={18} aria-hidden />}
                onClick={() => patch({ view: 'trash', photoId: null })}
              >
                {t('photos:trash.open')}
                {trashTotal > 0 ? ` (${trashTotal})` : ''}
              </Button>
            )}
            <Button
              className="photo-hub-upload-btn"
              icon={<Upload size={18} aria-hidden />}
              loading={uploading}
              onClick={openFilePicker}
            >
              {uploading ? t('photos:uploading') : t('photos:upload')}
            </Button>
            <input
              ref={uploadInputRef}
              type="file"
              accept={PHOTO_ACCEPT}
              multiple
              tabIndex={-1}
              aria-hidden="true"
              className="photo-hidden-input"
              onChange={(e) => {
                stageFiles(takeFiles(e.target.files));
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
          if (!uploading) stageFiles(takeFiles(e.dataTransfer.files));
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
            {!viewingTrash ? (
            <div className="photo-hub-toolbar-row">
              <div className="photo-hub-menu photo-hub-field-menu" ref={fieldMenuRef}>
                <button
                  type="button"
                  className={`photo-hub-field-btn${fieldId ? ' has-field' : ''}${fieldMenuOpen ? ' is-open' : ''}`}
                  aria-expanded={fieldMenuOpen}
                  aria-haspopup="listbox"
                  disabled={refreshing}
                  onClick={() => {
                    setFieldMenuOpen((open) => !open);
                    setFiltersOpen(false);
                  }}
                >
                  <span
                    className={`photo-hub-swatch${fieldId ? '' : ' is-all'}`}
                    style={
                      fieldId
                        ? ({
                            '--swatch': resolveFieldColor(
                              fields.find((field) => field.id === fieldId)?.color,
                              fieldId
                            ),
                          } as React.CSSProperties)
                        : undefined
                    }
                    aria-hidden
                  />
                  <span className="photo-hub-field-btn-label">
                    {fieldId
                      ? friendlyFieldLabel(fields.find((field) => field.id === fieldId)?.name || fieldId)
                      : t('photos:filters.allFields')}
                  </span>
                  <ChevronDown size={16} aria-hidden />
                </button>
                {fieldMenuOpen ? (
                  <div className="photo-hub-popover photo-hub-field-popover" role="listbox" aria-label={t('photos:filters.field')}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={!fieldId}
                      className={`photo-hub-option${!fieldId ? ' is-selected' : ''}`}
                      onClick={() => {
                        patch({ fieldId: null });
                        setFieldMenuOpen(false);
                      }}
                    >
                      <span className="photo-hub-option-main">
                        <span className="photo-hub-swatch is-all" aria-hidden />
                        {t('photos:filters.allFields')}
                      </span>
                      {!fieldId ? <Check size={16} aria-hidden /> : null}
                    </button>
                    {fields.map((field) => {
                      const selected = field.id === fieldId;
                      return (
                        <button
                          key={field.id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`photo-hub-option${selected ? ' is-selected' : ''}`}
                          onClick={() => {
                            patch({ fieldId: field.id });
                            setFieldMenuOpen(false);
                          }}
                        >
                          <span className="photo-hub-option-main">
                            <span
                              className="photo-hub-swatch"
                              style={{ '--swatch': resolveFieldColor(field.color, field.id) } as React.CSSProperties}
                              aria-hidden
                            />
                            {friendlyFieldLabel(field.name)}
                          </span>
                          {selected ? <Check size={16} aria-hidden /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="photo-hub-menu" ref={filtersMenuRef}>
                <button
                  type="button"
                  className={`photo-hub-tool${filtersOpen || advancedFilterCount > 0 ? ' is-active' : ''}`}
                  aria-expanded={filtersOpen}
                  aria-haspopup="dialog"
                  onClick={() => {
                    setFiltersOpen((open) => !open);
                    setFieldMenuOpen(false);
                  }}
                >
                  <SlidersHorizontal size={16} aria-hidden />
                  {t('photos:filters.menu')}
                  {advancedFilterCount > 0 ? (
                    <span className="photo-hub-tool-count">{advancedFilterCount}</span>
                  ) : null}
                </button>
                {filtersOpen ? (
                  <div className="photo-hub-popover" role="dialog" aria-label={t('photos:filters.menu')}>
                    <fieldset className="photo-hub-popover-group">
                      <legend>{t('photos:filters.linkStatus')}</legend>
                      {(
                        [
                          ['all', t('photos:filters.all')],
                          ['standalone', t('photos:filters.standaloneFull')],
                          ['linked', t('photos:filters.linked')],
                        ] as const
                      ).map(([value, label]) => {
                        const selected = linkStatus === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            className={`photo-hub-option${selected ? ' is-selected' : ''}`}
                            aria-pressed={selected}
                            onClick={() => patch({ linkStatus: value === 'all' ? null : value })}
                          >
                            <span>{label}</span>
                            {selected ? <Check size={16} aria-hidden /> : null}
                          </button>
                        );
                      })}
                    </fieldset>
                    <fieldset className="photo-hub-popover-group">
                      <legend>{t('photos:filters.assignment')}</legend>
                      {(
                        [
                          ['', t('photos:filters.all'), ''],
                          ['needsReview', t('photos:filters.needsReview'), t('photos:filters.needsReviewHint')],
                          ['unassigned', t('photos:filters.unassigned'), ''],
                        ] as const
                      ).map(([value, label, hint]) => {
                        const selected = assignment === value;
                        return (
                          <button
                            key={value || 'all-assignment'}
                            type="button"
                            className={`photo-hub-option${selected ? ' is-selected' : ''}`}
                            aria-pressed={selected}
                            onClick={() => patch({ assignment: value || null })}
                          >
                            <span>
                              {label}
                              {hint ? <small>{hint}</small> : null}
                            </span>
                            {selected ? <Check size={16} aria-hidden /> : null}
                          </button>
                        );
                      })}
                    </fieldset>
                    <fieldset className="photo-hub-popover-group">
                      <legend>{t('photos:filters.date')}</legend>
                      <div className="photo-hub-date-row">
                        <label>
                          <span>{t('photos:filters.from')}</span>
                          <input
                            type="date"
                            value={from}
                            onChange={(e) => patch({ from: e.target.value || null })}
                          />
                        </label>
                        <label>
                          <span>{t('photos:filters.to')}</span>
                          <input
                            type="date"
                            value={to}
                            onChange={(e) => patch({ to: e.target.value || null })}
                          />
                        </label>
                      </div>
                    </fieldset>
                  </div>
                ) : null}
              </div>

              <div className="photo-hub-sort" role="group" aria-label={t('photos:filters.sort')}>
                {(
                  [
                    ['newest', t('photos:filters.newest')],
                    ['oldest', t('photos:filters.oldest')],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`photo-hub-sort-btn${sort === value ? ' is-active' : ''}`}
                    aria-pressed={sort === value}
                    onClick={() => patch({ sort: value === 'newest' ? null : 'oldest' })}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className={`photo-hub-tool${selecting ? ' is-active' : ''}`}
                aria-pressed={selecting}
                onClick={() => {
                  setSelecting((value) => !value);
                  setSelectedIds([]);
                }}
              >
                {selecting ? t('photos:select.done') : t('photos:select.toggle')}
              </button>

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
                ) : !loading && !viewingTrash ? (
                  <span className="photo-hub-count">{countLabel}</span>
                ) : null}
              </div>
            </div>
            ) : null}

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
                {showGallery ? (
                <button
                  type="button"
                  className="photo-hub-clear-filters"
                  onClick={clearAllFilters}
                >
                  {t('photos:clearAllFilters')}
                </button>
                ) : null}
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
          onUploadStaged={startStagedUpload}
          onKeepDuplicate={keepDuplicate}
        />

        {!viewingTrash ? <p className="photo-hub-formats">{t('photos:formats')}</p> : null}

        {error ? (
          <p className="photo-hub-alert" role="alert">
            {error}
            <button type="button" className="photo-hub-retry" onClick={() => void load(1, false)}>
              {t('photos:errors.retry')}
            </button>
          </p>
        ) : null}

        {!viewingTrash && showInitialLoading ? (
          <div className="photo-hub-skeleton" aria-busy="true" aria-label={t('photos:loading')}>
            <span className="photo-hub-skeleton-card" />
            <span className="photo-hub-skeleton-card" />
            <span className="photo-hub-skeleton-card" />
            <span className="photo-hub-skeleton-card" />
          </div>
        ) : null}

        {viewingTrash ? (
          <div className="photo-trash">
            <p className="photo-link-hint">{t('photos:trash.linkedNote')}</p>
            {loading ? <LoadingSpinner /> : null}
            {!loading && trashPhotos.length === 0 ? (
              <EmptyState title={t('photos:trash.empty')} />
            ) : null}
            <div className="photo-trash-list">
              {trashPhotos.map((photo) => {
                const days = daysUntilPurge(photo.deletedAt);
                const src = resolvePublicAssetUrl(photo.thumbnailUrl || photo.url) || photo.url;
                return (
                  <article key={photo.id} className="photo-trash-card">
                    <PhotoFrame src={src} alt="" />
                    <div>
                      <strong>{photo.fieldName || photo.fileName || t('photos:detail.title')}</strong>
                      <p>{formatDate(photo.effectiveCapturedAt)}</p>
                      {days != null ? <p>{t('photos:trash.daysLeft', { days })}</p> : null}
                      <div className="photo-detail-actions">
                        <Button
                          size="sm"
                          onClick={async () => {
                            await getPhotoService().restore(photo.id);
                            await loadTrash();
                            await load(1, false);
                          }}
                        >
                          {t('photos:trash.restore')}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            if (!window.confirm(t('photos:trash.purgeConfirm'))) return;
                            await getPhotoService().purge(photo.id);
                            await loadTrash();
                          }}
                        >
                          {t('photos:trash.purge')}
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}

        {!viewingTrash && showEmpty ? (
          <div className="photo-hub-empty-wrap">
            <EmptyState
              title={
                assignment === 'needsReview' && activeFilterChips.length === 1
                  ? t('photos:emptyReview')
                  : hasActiveFilters
                    ? t('photos:filteredCount', { count: 0 })
                    : t('photos:empty')
              }
              description={
                hasActiveFilters
                  ? assignment === 'needsReview' && activeFilterChips.length === 1
                    ? t('photos:filters.needsReviewHint')
                    : filterSummary
                  : t('photos:uploadPromise')
              }
              action={
                hasActiveFilters ? (
                  <Button variant="secondary" onClick={clearAllFilters}>
                    {t('photos:clearFilters')}
                  </Button>
                )                 : (
                  <Button className="photo-hub-upload-btn" onClick={openFilePicker}>
                    {t('photos:upload')}
                  </Button>
                )
              }
            />
            {!hasActiveFilters ? (
              <PhotoUploadDropzone onFiles={stageFiles} disabled={uploading} />
            ) : null}
          </div>
        ) : null}

        {!viewingTrash && showGallery ? (
          <div className={`photo-hub-gallery-wrap${refreshing ? ' is-refreshing' : ''}`}>
            {selecting ? (
              <div className="photo-bulk-bar">
                <span>{t('photos:select.count', { count: selectedIds.length })}</span>
                {bulkFieldId ? <span className="photo-hub-formats">{t('photos:detail.audienceChange')}</span> : null}
                <select
                  value={bulkFieldId}
                  onChange={(e) => setBulkFieldId(e.target.value)}
                  aria-label={t('photos:filters.field')}
                >
                  <option value="">{t('photos:select.assign')}</option>
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={!bulkFieldId || selectedIds.length === 0}
                  onClick={async () => {
                    for (const id of selectedIds) {
                      await getPhotoService().confirmField(id, bulkFieldId);
                    }
                    setSelectedIds([]);
                    setSelecting(false);
                    await load(1, false);
                  }}
                >
                  {t('photos:select.assign')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={selectedIds.length === 0}
                  onClick={async () => {
                    for (const id of selectedIds) {
                      await getPhotoService().delete(id);
                    }
                    setUndo(selectedIds[0] ? { id: selectedIds[0] } : null);
                    setSelectedIds([]);
                    setSelecting(false);
                    await load(1, false);
                    void loadTrash();
                  }}
                >
                  {t('photos:select.trash')}
                </Button>
              </div>
            ) : null}
            <PhotoHubGallery
              photos={photos}
              fields={fields}
              onOpenViewer={(photo, index) => {
                setDetailsEditing(false);
                setDetailsOpen(true);
                setSelected(photo);
                patch({ photoId: photo.id });
                openLightboxAt(photo, index);
              }}
              selectionMode={selecting}
              selectedIds={new Set(selectedIds)}
              onToggleSelected={(id) =>
                setSelectedIds((prev) =>
                  prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
                )
              }
            />
            {hasMore ? (
              <div className="photo-hub-footer">
                <Button
                  className="photo-hub-load-more"
                  variant="secondary"
                  loading={loadingMore}
                  disabled={loadingMore}
                  onClick={() => void load(page + 1, true)}
                >
                  {t('photos:loadMore')}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {undo ? (
        <div className="photo-undo" role="status">
          <span>{t('photos:trash.undo')}</span>
          <button
            type="button"
            onClick={async () => {
              const id = undo.id;
              setUndo(null);
              await getPhotoService().restore(id);
              await load(1, false);
              if (viewingTrash) await loadTrash();
            }}
          >
            {t('photos:trash.undoAction')}
          </button>
          <button type="button" onClick={() => patch({ view: 'trash' })}>
            {t('photos:trash.open')}
          </button>
        </div>
      ) : null}

      <PhotoLightbox
        open={lightbox.open && !viewingTrash}
        items={lightbox.items}
        index={lightbox.index}
        onClose={() => {
          setDetailsOpen(false);
          setDetailsEditing(false);
          lightbox.close();
          closePhoto();
        }}
        onIndexChange={(index) => {
          lightbox.setIndex(index);
          const photo = photos[index];
          if (photo) {
            setSelected(photo);
            if (detailsOpen) patch({ photoId: photo.id });
          }
        }}
        detailsOpen={detailsOpen}
        onCloseDetails={() => {
          setDetailsOpen(false);
          setDetailsEditing(false);
        }}
        onImageActivate={() => {
          const photo = photos[lightbox.index];
          if (!photo) return;
          setSelected(photo);
          setDetailsOpen(true);
          setDetailsEditing(true);
          setEditPulse((n) => n + 1);
          patch({ photoId: photo.id });
        }}
        sidePanel={
          detailsOpen && viewerPhoto ? (
            <PhotoDetailDrawer
              variant="panel"
              open
              photo={viewerPhoto}
              fields={fields}
              startEditing={detailsEditing}
              editPulse={editPulse}
              onClose={() => {
                setDetailsOpen(false);
                setDetailsEditing(false);
              }}
              onConfirmField={async (id: string, nextFieldId: string) => {
                const updated = await getPhotoService().confirmField(id, nextFieldId);
                refreshSelected(updated);
                await load(1, false);
              }}
              onUpdate={async (id, body) => {
                const updated = await getPhotoService().update(id, body);
                refreshSelected(updated);
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
                setUndo({ id });
                setDetailsOpen(false);
                lightbox.close();
                closePhoto();
                await load(1, false);
                void loadTrash();
              }}
            />
          ) : null
        }
        footerAction={
          lightbox.open && viewerPhoto ? (
            <div className="photo-lightbox-footer-stack">
              {!detailsEditing ? (
                <p className="photo-lightbox-edit-hint">{t('photos:viewer.tapToEdit')}</p>
              ) : null}
              <button
                type="button"
                className="photo-lightbox-details"
                aria-pressed={detailsOpen}
                onClick={() => {
                  setSelected(viewerPhoto);
                  if (detailsOpen) {
                    setDetailsOpen(false);
                    setDetailsEditing(false);
                  } else {
                    setDetailsOpen(true);
                    setDetailsEditing(false);
                    patch({ photoId: viewerPhoto.id });
                  }
                }}
              >
                {detailsOpen ? t('photos:viewer.closeDetails') : t('photos:viewer.openDetails')}
              </button>
            </div>
          ) : null
        }
      />
    </PageContainer>
  );
};

export default PhotoHubPage;
