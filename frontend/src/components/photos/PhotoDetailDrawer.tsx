import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';
import PhotoLocationMap from './PhotoLocationMap';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
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
  /** Opens fullscreen among the current filtered gallery set. */
  onExpandFullscreen?: (photo: Photo) => void;
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
  const [ownerType, setOwnerType] = useState('task');
  const [ownerId, setOwnerId] = useState('');
  const [targets, setTargets] = useState<LinkTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmFieldId, setConfirmFieldId] = useState('');

  const fieldId = photo?.fieldId || '';

  useEffect(() => {
    setOwnerId('');
  }, [ownerType, photo?.id]);

  useEffect(() => {
    setConfirmFieldId('');
  }, [photo?.id]);

  useEffect(() => {
    if (!open || !fieldId || !photo) {
      setTargets([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingTargets(true);
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
            label: `${new Date(h.harvestDate).toLocaleDateString()} · ${h.oliveKg} kg`,
          }));
        } else if (ownerType === 'phenology') {
          const observations: FieldPhenologyObservation[] =
            await fieldWork.listPhenologyObservations(fieldId);
          next = observations.map((o) => ({
            id: o.id,
            label: `${o.stageLabel || o.stageCode} · ${new Date(o.observedOn).toLocaleDateString()}`,
          }));
        }
        if (!cancelled) setTargets(next);
      } catch {
        if (!cancelled) setTargets([]);
      } finally {
        if (!cancelled) setLoadingTargets(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [fieldId, open, ownerType, photo]);

  const linkedLabel = useMemo(() => {
    if (!photo?.isLinked) return null;
    return t(`badges.${photo.ownerType === 'field' ? 'standalone' : photo.ownerType}`, {
      defaultValue: photo.ownerType,
    });
  }, [photo, t]);

  if (!photo) return null;

  const src = resolvePublicAssetUrl(photo.url) || photo.url;
  const fieldName = fields.find((f) => f.id === photo.fieldId)?.name || photo.fieldId || '—';
  const needsField = !photo.fieldId;

  return (
    <RightDrawer open={open} onClose={onClose} title={t('detail.title')} size="md">
      <div className="photo-detail-body">
        {onExpandFullscreen ? (
          <button
            type="button"
            className="photo-detail-hero"
            onClick={() => onExpandFullscreen(photo)}
            aria-label={t('viewer.expand')}
          >
            <img src={src} alt={photo.fileName || t('detail.title')} />
            <span className="photo-detail-hero-hint">{t('viewer.expand')}</span>
          </button>
        ) : (
          <img src={src} alt={photo.fileName || t('detail.title')} />
        )}

        <section className="photo-detail-section" aria-label={t('detail.metaSection')}>
          <h3 className="photo-detail-section-title">{t('detail.metaSection')}</h3>
          <dl className="photo-detail-meta">
            <dt>{t('detail.field')}</dt>
            <dd>{fieldName}</dd>
            <dt>{t('detail.captured')}</dt>
            <dd>{new Date(photo.effectiveCapturedAt).toLocaleString()}</dd>
            <dt>{t('detail.uploaded')}</dt>
            <dd>{new Date(photo.createdAt).toLocaleString()}</dd>
            <dt>{t('detail.location')}</dt>
            <dd>
              {photo.latitude != null && photo.longitude != null
                ? `${photo.latitude.toFixed(5)}, ${photo.longitude.toFixed(5)}`
                : t('detail.noGps')}
            </dd>
            {linkedLabel ? (
              <>
                <dt>{t('detail.linkedAs')}</dt>
                <dd>{linkedLabel}</dd>
              </>
            ) : null}
          </dl>
        </section>

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
                disabled={loadingTargets || !photo.fieldId}
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
            {!loadingTargets && photo.fieldId && targets.length === 0 ? (
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

        <div className="photo-detail-danger">
          <Button
            variant="error"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm(t('detail.deleteConfirm'))) return;
              setBusy(true);
              try {
                await onDelete(photo.id);
                onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('detail.delete')}
          </Button>
        </div>
      </div>
    </RightDrawer>
  );
};

export default PhotoDetailDrawer;
