import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';
import PhotoLocationMap from './PhotoLocationMap';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import {
  chronologioPath,
  harvestPath,
  taskPeekPath,
} from '../../navigation/intents';
import {
  getFieldWorkService,
  getHarvestService,
  getNoteService,
} from '../../services/serviceFactory';
import type { FieldPhenologyObservation } from '../../services/fieldWorkService';
import type { Field } from '../../services/fieldService';
import type { Photo } from '../../services/photoService';
import { notePreviewTitle } from '../../services/noteService';

type LinkTarget = { id: string; label: string };

export type PhotoDetailDrawerProps = {
  photo: Photo | null;
  fields: Field[];
  open: boolean;
  onClose: () => void;
  onConfirmField: (photoId: string, fieldId: string) => Promise<void>;
  onLink: (photoId: string, ownerType: string, ownerId: string) => Promise<void>;
  onUnlink: (photoId: string) => Promise<void>;
  onDelete: (photoId: string) => Promise<void>;
  onExpandFullscreen?: (photo: Photo) => void;
};

const linkedRecordPath = (photo: Photo): string | null => {
  if (!photo.isLinked || !photo.ownerId) return null;
  switch (photo.ownerType) {
    case 'task':
      return taskPeekPath(photo.ownerId);
    case 'harvest':
      return harvestPath({ fieldId: photo.fieldId || undefined, harvestId: photo.ownerId });
    case 'note':
      return chronologioPath({
        fieldId: photo.fieldId || undefined,
        entry: `Note:${photo.ownerId}`,
      });
    case 'phenology':
      return chronologioPath({
        fieldId: photo.fieldId || undefined,
        entry: `Phenology:${photo.ownerId}`,
      });
    default:
      return null;
  }
};

const PhotoDetailDrawer: React.FC<PhotoDetailDrawerProps> = ({
  photo,
  fields,
  open,
  onClose,
  onConfirmField,
  onLink,
  onUnlink,
  onDelete,
  onExpandFullscreen,
}) => {
  const { t } = useTranslation('photos');
  const { formatDateTime, formatDate } = useLocaleFormatters();
  const [ownerType, setOwnerType] = useState('task');
  const [ownerId, setOwnerId] = useState('');
  const [targets, setTargets] = useState<LinkTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [targetsError, setTargetsError] = useState(false);
  const [targetsRetry, setTargetsRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmFieldId, setConfirmFieldId] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const fieldId = photo?.fieldId || '';

  useEffect(() => {
    setOwnerId('');
    setMenuOpen(false);
  }, [ownerType, photo?.id]);

  useEffect(() => {
    setConfirmFieldId('');
  }, [photo?.id]);

  useEffect(() => {
    if (!open || !fieldId || !photo) {
      setTargets([]);
      setTargetsError(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingTargets(true);
      setTargetsError(false);
      try {
        let next: LinkTarget[] = [];
        const fieldWork = getFieldWorkService();
        if (ownerType === 'task') {
          const tasks = await fieldWork.listFieldTasks({ fieldId });
          next = tasks.map((task) => ({
            id: task.id,
            label: `${task.title} · ${task.statusLabel || task.status}`,
          }));
        } else if (ownerType === 'note') {
          const notes = await getNoteService().getNotes({ fieldId, limit: 40 });
          next = notes.map((note) => ({
            id: note.id,
            label: notePreviewTitle(note.body) || note.id,
          }));
        } else if (ownerType === 'harvest') {
          const harvests = await getHarvestService().listByField(fieldId);
          next = harvests.map((h) => ({
            id: h.id,
            label: `${formatDate(h.harvestDate)} · ${h.oliveKg} kg`,
          }));
        } else if (ownerType === 'phenology') {
          const observations: FieldPhenologyObservation[] =
            await fieldWork.listPhenologyObservations(fieldId);
          next = observations.map((o) => ({
            id: o.id,
            label: `${o.stageLabel || o.stageCode} · ${formatDate(o.observedOn)}`,
          }));
        }
        if (!cancelled) setTargets(next);
      } catch {
        if (!cancelled) {
          setTargets([]);
          setTargetsError(true);
        }
      } finally {
        if (!cancelled) setLoadingTargets(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [fieldId, formatDate, open, ownerType, photo, targetsRetry]);

  const drawerTitle = useMemo(() => {
    if (!photo) return t('detail.title');
    const field =
      photo.fieldName || fields.find((f) => f.id === photo.fieldId)?.name || photo.fieldId;
    if (field) return field;
    return t('detail.title');
  }, [fields, photo, t]);

  if (!photo) return null;

  const src = resolvePublicAssetUrl(photo.url) || photo.url;
  const fieldName =
    photo.fieldName || fields.find((f) => f.id === photo.fieldId)?.name || photo.fieldId || '—';
  const needsField = !photo.fieldId;
  const recordHref = linkedRecordPath(photo);
  const reasonKey = photo.assignmentReason
    ? `detail.reasons.${photo.assignmentReason}`
    : null;
  const reasonLabel = reasonKey
    ? t(reasonKey, { defaultValue: photo.assignmentReason || '' })
    : null;

  return (
    <RightDrawer open={open} onClose={onClose} title={drawerTitle} size="md">
      <div className="photo-detail-body">
        {onExpandFullscreen ? (
          <button
            type="button"
            className="photo-detail-hero"
            onClick={() => onExpandFullscreen(photo)}
            aria-label={t('viewer.expand')}
          >
            <img src={src} alt={drawerTitle} />
            <span className="photo-detail-hero-hint">{t('viewer.expand')}</span>
          </button>
        ) : (
          <img src={src} alt={drawerTitle} />
        )}

        <section className="photo-detail-section" aria-label={t('detail.metaSection')}>
          <div className="photo-detail-section-head">
            <h3 className="photo-detail-section-title">{t('detail.metaSection')}</h3>
            {photo.canTrash !== false ? (
              <div className="photo-detail-overflow">
                <button
                  type="button"
                  className="photo-detail-overflow-btn"
                  aria-label={t('detail.moreActions')}
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <MoreHorizontal size={18} aria-hidden />
                </button>
                {menuOpen ? (
                  <div className="photo-detail-overflow-menu" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      className="photo-detail-overflow-item is-danger"
                      disabled={busy}
                      onClick={async () => {
                        if (!window.confirm(t('detail.deleteConfirm'))) return;
                        setBusy(true);
                        setMenuOpen(false);
                        try {
                          await onDelete(photo.id);
                          onClose();
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {t('detail.delete')}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <dl className="photo-detail-meta">
            <dt>{t('detail.field')}</dt>
            <dd>{fieldName}</dd>
            <dt>{t('detail.captured')}</dt>
            <dd>{formatDateTime(photo.effectiveCapturedAt)}</dd>
            <dt>{t('detail.uploaded')}</dt>
            <dd>{formatDateTime(photo.createdAt)}</dd>
            <dt>{t('detail.location')}</dt>
            <dd>
              {photo.latitude != null && photo.longitude != null
                ? `${photo.latitude.toFixed(5)}, ${photo.longitude.toFixed(5)}`
                : t('detail.noGps')}
            </dd>
            {reasonLabel ? (
              <>
                <dt>{t('detail.assignmentReason')}</dt>
                <dd>{reasonLabel}</dd>
              </>
            ) : null}
          </dl>
        </section>

        {photo.isLinked ? (
          <section className="photo-detail-section" aria-label={t('detail.linkedRecord')}>
            <h3 className="photo-detail-section-title">{t('detail.linkedRecord')}</h3>
            <div className={`photo-linked-card${photo.linkBroken ? ' is-broken' : ''}`}>
              <div className="photo-linked-card-type">
                {t(`badges.${photo.ownerType}`, { defaultValue: photo.ownerType })}
              </div>
              <strong className="photo-linked-card-title">
                {photo.linkedTitle || t('detail.linkedAs')}
              </strong>
              <div className="photo-linked-card-meta">
                {photo.linkedOccurredAt ? formatDate(photo.linkedOccurredAt) : null}
                {photo.linkedStatus ? ` · ${photo.linkedStatus}` : null}
              </div>
              {photo.linkBroken ? (
                <p className="photo-linked-card-warn">{t('detail.linkBroken')}</p>
              ) : null}
              {recordHref && !photo.linkBroken ? (
                <Link className="photo-linked-card-open" to={recordHref} onClick={onClose}>
                  {t('detail.openRecord')}
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}

        {photo.latitude != null && photo.longitude != null ? (
          <section className="photo-detail-section" aria-label={t('detail.mapSection')}>
            <h3 className="photo-detail-section-title">{t('detail.mapSection')}</h3>
            <PhotoLocationMap latitude={photo.latitude} longitude={photo.longitude} />
          </section>
        ) : null}

        {needsField ? (
          <section className="photo-detail-section" aria-label={t('detail.fieldSection')}>
            <h3 className="photo-detail-section-title">{t('detail.fieldSection')}</h3>
            <div className="photo-detail-field-chips" role="group">
              {fields.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`photo-review-field-chip${
                    confirmFieldId === f.id ? ' is-selected' : ''
                  }`}
                  disabled={busy}
                  onClick={() => setConfirmFieldId(f.id)}
                >
                  {f.name}
                </button>
              ))}
            </div>
            <div className="photo-detail-actions">
              <Button
                size="sm"
                disabled={busy || !confirmFieldId}
                loading={busy}
                onClick={async () => {
                  if (!confirmFieldId) return;
                  setBusy(true);
                  try {
                    await onConfirmField(photo.id, confirmFieldId);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t('review.confirmField')}
              </Button>
            </div>
          </section>
        ) : null}

        <section className="photo-detail-section" aria-label={t('detail.link')}>
          <h3 className="photo-detail-section-title">{t('detail.link')}</h3>
          <p className="photo-link-hint">{t('detail.linkMoves')}</p>
          <div className="photo-link-form">
            <label>
              {t('detail.ownerType')}
              <select value={ownerType} onChange={(e) => setOwnerType(e.target.value)}>
                <option value="task">{t('badges.task')}</option>
                <option value="note">{t('badges.note')}</option>
                <option value="harvest">{t('badges.harvest')}</option>
                <option value="phenology">{t('badges.phenology')}</option>
              </select>
            </label>
            <label>
              {t('detail.pickRecord')}
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                disabled={loadingTargets || !photo.fieldId || targetsError}
              >
                <option value="">
                  {loadingTargets ? t('detail.loadingRecords') : t('detail.pickRecord')}
                </option>
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.label}
                  </option>
                ))}
              </select>
            </label>
            {targetsError ? (
              <div className="photo-link-error">
                <p>{t('detail.recordsError')}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={loadingTargets}
                  onClick={() => setTargetsRetry((n) => n + 1)}
                >
                  {t('detail.retryRecords')}
                </Button>
              </div>
            ) : null}
            {!loadingTargets && !targetsError && photo.fieldId && targets.length === 0 ? (
              <p className="photo-link-empty">{t('detail.noRecords')}</p>
            ) : null}
            <div className="photo-detail-actions">
              <Button
                disabled={busy || !ownerId.trim() || !photo.fieldId}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onLink(photo.id, ownerType, ownerId.trim());
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t('detail.saveLink')}
              </Button>
              {photo.isLinked ? (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onUnlink(photo.id);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {t('detail.unlink')}
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </RightDrawer>
  );
};

export default PhotoDetailDrawer;
