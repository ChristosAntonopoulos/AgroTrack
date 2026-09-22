import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';
import PhotoLocationMap from './PhotoLocationMap';
import { linkedRecordLabel, linkedRecordPath } from './photoLinks';
import { capturedDateIsFallback, localizeLinkedStatus } from './photoLabels';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import type { Field } from '../../services/fieldService';
import type { Photo } from '../../services/photoService';
import { loadPhotoLinkTargets, type PhotoLinkTarget } from './photoLinkTargets';

export type PhotoDetailDrawerProps = {
  photo: Photo | null;
  fields: Field[];
  open: boolean;
  onClose: () => void;
  onConfirmField: (photoId: string, fieldId: string) => Promise<void>;
  onLink: (photoId: string, ownerType: string, ownerId: string) => Promise<void>;
  onUnlink: (photoId: string) => Promise<void>;
  onDelete: (photoId: string) => Promise<void>;
  onUpdate?: (
    photoId: string,
    body: { capturedAt?: string; caption?: string; kind?: string }
  ) => Promise<void>;
  onExpandFullscreen?: (photo: Photo) => void;
  /** Panel sits beside the open viewer. Drawer is the standalone fallback. */
  variant?: 'drawer' | 'panel';
  /** Open already ready to edit field, date, and description. */
  startEditing?: boolean;
  /** Increment to re-enter edit after the user cancelled. */
  editPulse?: number;
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
  onUpdate,
  onExpandFullscreen,
  variant = 'drawer',
  startEditing = false,
  editPulse = 0,
}) => {
  const { t } = useTranslation('photos');
  const { formatDateTime, formatDate } = useLocaleFormatters();
  const { user } = useAuth();
  const [ownerType, setOwnerType] = useState('task');
  const [ownerId, setOwnerId] = useState('');
  const [targets, setTargets] = useState<PhotoLinkTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [targetsError, setTargetsError] = useState(false);
  const [targetsRetry, setTargetsRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmFieldId, setConfirmFieldId] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [dateDraft, setDateDraft] = useState('');
  const [kindDraft, setKindDraft] = useState('general');
  const [linkNotice, setLinkNotice] = useState<string | null>(null);

  const fieldId = photo?.fieldId || '';

  useEffect(() => {
    setOwnerId(photo?.isLinked && photo.ownerType === ownerType ? photo.ownerId : '');
    setMenuOpen(false);
  }, [ownerType, photo?.id, photo?.isLinked, photo?.ownerId, photo?.ownerType]);

  useEffect(() => {
    setLinkNotice(null);
  }, [photo?.id]);

  useEffect(() => {
    setEditingLink(false);
    setEditingMeta(startEditing);
    setCaptionDraft(photo?.caption || '');
    setKindDraft(photo?.kind || 'general');
    const source = photo?.capturedAt || photo?.effectiveCapturedAt || '';
    setDateDraft(source ? source.slice(0, 10) : '');
    setConfirmFieldId(photo?.fieldId || '');
    if (photo?.isLinked && photo.ownerType) setOwnerType(photo.ownerType);
    // Reset drafts when the photo or edit intent changes, not on every metadata refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo?.id, startEditing, editPulse]);

  useEffect(() => {
    setConfirmFieldId('');
  }, [photo?.id]);

  useEffect(() => {
    if (!open || !fieldId || !photo || (!editingLink && photo.isLinked)) {
      setTargets([]);
      setTargetsError(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingTargets(true);
      setTargetsError(false);
      try {
        const next = await loadPhotoLinkTargets({ fieldId, ownerType, formatDate, t });
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
  }, [editingLink, fieldId, formatDate, open, ownerType, photo, t, targetsRetry]);

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
  const linkedLabel = linkedRecordLabel(photo, (ownerType) =>
    t(`badges.${ownerType}`, { defaultValue: ownerType })
  );
  const uploaderName =
    photo.uploadedByUserId && user?.userId === photo.uploadedByUserId
      ? t('badges.you')
      : photo.uploadedByUserId
        ? photo.uploadedByUserId.slice(0, 8)
        : null;
  const kindLabel =
    photo.kind && photo.kind !== 'general'
      ? t(`kinds.${photo.kind}`, { defaultValue: photo.kind })
      : null;
  const reasonKey = photo.assignmentReason
    ? `detail.reasons.${photo.assignmentReason}`
    : null;
  const reasonLabel = reasonKey
    ? t(reasonKey, { defaultValue: photo.assignmentReason || '' })
    : null;

  const saveMeta = async () => {
    setBusy(true);
    try {
      const nextField = confirmFieldId || photo.fieldId;
      if (nextField && nextField !== photo.fieldId) {
        await onConfirmField(photo.id, nextField);
      }
      if (onUpdate) {
        const time =
          (photo.capturedAt || photo.effectiveCapturedAt || '').slice(11) || '12:00:00.000Z';
        await onUpdate(photo.id, {
          capturedAt: dateDraft ? `${dateDraft}T${time}` : undefined,
          caption: captionDraft,
          kind: kindDraft || 'general',
        });
      }
      setEditingMeta(false);
    } finally {
      setBusy(false);
    }
  };

  const body = (
      <div className={`photo-detail-body${editingMeta ? ' is-editing' : ''}`}>
        {variant === 'drawer' && onExpandFullscreen ? (
          <button
            type="button"
            className="photo-detail-hero"
            onClick={() => {
              onExpandFullscreen(photo);
            }}
            aria-label={t('viewer.expand')}
          >
            <img src={src} alt={drawerTitle} />
            <span className="photo-detail-hero-hint">{t('viewer.expand')}</span>
          </button>
        ) : variant === 'drawer' ? (
          <img src={src} alt={drawerTitle} />
        ) : null}

        <section className="photo-detail-card" aria-label={t('detail.metaSection')}>
          <div className="photo-detail-card-head">
            <div>
              <p className="photo-detail-kicker">{t('detail.metaSection')}</p>
              <h3 className="photo-detail-card-title">{fieldName}</h3>
              <p className="photo-detail-card-sub">
                {formatDateTime(photo.effectiveCapturedAt)}
                {uploaderName ? ` · ${t('badges.uploadedBy', { name: uploaderName })}` : null}
              </p>
            </div>
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

          {editingMeta ? (
            <div className="photo-detail-edit">
              <p className="photo-detail-hint">{t('detail.audience')}</p>
              {confirmFieldId && confirmFieldId !== photo.fieldId ? (
                <p className="photo-detail-hint is-warn">{t('detail.audienceChange')}</p>
              ) : null}
              <label className="photo-detail-field">
                <span>{t('detail.field')}</span>
                <select
                  value={confirmFieldId || photo.fieldId || ''}
                  onChange={(e) => setConfirmFieldId(e.target.value)}
                >
                  <option value="">{t('review.chooseLater')}</option>
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="photo-detail-field">
                <span>{t('detail.captured')}</span>
                <input
                  type="date"
                  value={dateDraft}
                  onChange={(e) => setDateDraft(e.target.value)}
                />
                {capturedDateIsFallback(photo.capturedAt) ? (
                  <small>{t('detail.capturedFallback')}</small>
                ) : null}
              </label>
              <label className="photo-detail-field">
                <span>{t('detail.kind')}</span>
                <select value={kindDraft} onChange={(e) => setKindDraft(e.target.value)}>
                  <option value="general">{t('kinds.general')}</option>
                  <option value="before">{t('kinds.before')}</option>
                  <option value="after">{t('kinds.after')}</option>
                </select>
              </label>
              <label className="photo-detail-field">
                <span>{t('detail.caption')}</span>
                <textarea
                  value={captionDraft}
                  maxLength={500}
                  rows={3}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                />
              </label>
              <div className="photo-detail-actions">
                <Button size="sm" disabled={busy} loading={busy} onClick={() => void saveMeta()}>
                  {t('detail.saveMeta')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setEditingMeta(false)}
                >
                  {t('detail.cancelEdit')}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <dl className="photo-detail-meta">
                <div>
                  <dt>{t('detail.field')}</dt>
                  <dd>{fieldName}</dd>
                </div>
                <div>
                  <dt>{t('detail.captured')}</dt>
                  <dd>
                    {formatDateTime(photo.effectiveCapturedAt)}
                    {capturedDateIsFallback(photo.capturedAt) ? (
                      <span className="photo-detail-fallback">{t('detail.capturedFallback')}</span>
                    ) : null}
                  </dd>
                </div>
                {uploaderName ? (
                  <div>
                    <dt>{t('detail.uploader')}</dt>
                    <dd>{uploaderName}</dd>
                  </div>
                ) : null}
                {photo.caption ? (
                  <div className="photo-detail-meta-wide">
                    <dt>{t('detail.caption')}</dt>
                    <dd>{photo.caption}</dd>
                  </div>
                ) : null}
                {kindLabel ? (
                  <div>
                    <dt>{t('detail.kind')}</dt>
                    <dd>{kindLabel}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>{t('detail.location')}</dt>
                  <dd>
                    {photo.latitude != null && photo.longitude != null
                      ? `${photo.latitude.toFixed(5)}, ${photo.longitude.toFixed(5)}`
                      : t('detail.noGps')}
                  </dd>
                </div>
                {reasonLabel ? (
                  <div className="photo-detail-meta-wide">
                    <dt>{t('detail.assignmentReason')}</dt>
                    <dd>{reasonLabel}</dd>
                  </div>
                ) : null}
                {photo.fileName ? (
                  <div className="photo-detail-meta-wide">
                    <dt>{t('detail.fileName')}</dt>
                    <dd className="photo-detail-filename">{photo.fileName}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="photo-detail-actions">
                <Button size="sm" variant="secondary" onClick={() => setEditingMeta(true)}>
                  {t('detail.editMeta')}
                </Button>
              </div>
              <p className="photo-detail-hint quiet">{t('detail.recordPrivacy')}</p>
            </>
          )}
        </section>

        {photo.isLinked ? (
          <section className="photo-detail-card" aria-label={t('detail.linkedRecord')}>
            <p className="photo-detail-kicker">
              {t('detail.linkedWithType', {
                type: t(`badges.${photo.ownerType}`, { defaultValue: photo.ownerType }),
              })}
            </p>
            <div className={`photo-linked-card${photo.linkBroken ? ' is-broken' : ''}`}>
              <strong className="photo-linked-card-title">
                {photo.linkedTitle || linkedLabel}
              </strong>
              <div className="photo-linked-card-meta">
                {[
                  photo.linkedOccurredAt ? formatDate(photo.linkedOccurredAt) : null,
                  localizeLinkedStatus(photo.linkedStatus, t),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
              {photo.linkBroken ? (
                <p className="photo-linked-card-warn">{t('detail.linkBroken')}</p>
              ) : null}
              <div className="photo-linked-card-actions">
                {recordHref && !photo.linkBroken ? (
                  <Link className="photo-linked-card-open" to={recordHref} onClick={onClose}>
                    {t('detail.openRecord')}
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="photo-linked-card-open is-button"
                  onClick={() => setEditingLink(true)}
                >
                  {t('detail.changeLink')}
                </button>
              </div>
              {linkNotice ? <p className="photo-link-notice">{linkNotice}</p> : null}
            </div>
          </section>
        ) : null}

        {photo.latitude != null && photo.longitude != null ? (
          <section className="photo-detail-card" aria-label={t('detail.mapSection')}>
            <p className="photo-detail-kicker">{t('detail.mapSection')}</p>
            <PhotoLocationMap latitude={photo.latitude} longitude={photo.longitude} />
          </section>
        ) : null}

        {needsField && !editingMeta ? (
          <section className="photo-detail-card" aria-label={t('detail.fieldSection')}>
            <p className="photo-detail-kicker">{t('detail.fieldSection')}</p>
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

        {(!photo.isLinked || editingLink) ? (
        <section className="photo-detail-card" aria-label={t('detail.link')}>
          <p className="photo-detail-kicker">{t('detail.link')}</p>
          <p className="photo-detail-hint">{t('detail.linkMoves')}</p>
          <div className="photo-link-form">
            <label>
              {t('detail.ownerType')}
              <select value={ownerType} onChange={(e) => setOwnerType(e.target.value)}>
                <option value="task">{t('badges.task')}</option>
                <option value="note">{t('badges.note')}</option>
                <option value="harvest">{t('badges.harvest')}</option>
                <option value="phenology">{t('badges.phenology')}</option>
              </select>
              {ownerType === 'phenology' ? (
                <span className="photo-link-hint">{t('badges.phenologyHint')}</span>
              ) : null}
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
                  const previous = photo.isLinked
                    ? linkedRecordLabel(photo, (type) =>
                        t(`badges.${type}`, { defaultValue: type })
                      )
                    : '';
                  const nextLabel =
                    targets.find((target) => target.id === ownerId.trim())?.label || ownerId.trim();
                  setBusy(true);
                  try {
                    await onLink(photo.id, ownerType, ownerId.trim());
                    if (previous) {
                      setLinkNotice(t('detail.linkChanged', { from: previous, to: nextLabel }));
                    }
                    setEditingLink(false);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t('detail.saveLink')}
              </Button>
              {photo.isLinked ? (
                <div className="photo-unlink-block">
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await onUnlink(photo.id);
                        setEditingLink(false);
                        setLinkNotice(null);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {t('detail.unlink')}
                  </Button>
                  <p className="photo-link-hint">{t('detail.unlinkHint')}</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>
        ) : null}
      </div>
  );

  if (!open) return null;

  if (variant === 'panel') {
    return (
      <div className="photo-detail-panel">
        <div className="photo-detail-panel-head">
          <div>
            <p className="photo-detail-kicker">{t('detail.title')}</p>
            <h2>{drawerTitle}</h2>
          </div>
          <button type="button" className="photo-detail-panel-close" onClick={onClose}>
            {t('viewer.closeDetails')}
          </button>
        </div>
        {body}
      </div>
    );
  }

  return (
    <RightDrawer open={open} onClose={onClose} title={drawerTitle} size="md">
      {body}
    </RightDrawer>
  );
};

export default PhotoDetailDrawer;
