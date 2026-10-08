import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, X } from 'lucide-react';
import type { Field } from '../../services/fieldService';
import type { Task, WorkRecord } from '../../services/taskService';
import { getTaskService } from '../../services/serviceFactory';
import { fileUploadService } from '../../services/fileUploadService';
import { getApiErrorMessage } from '../../utils/translateApiError';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import './RecordCompletedWorkSheet.css';

const MAX_PHOTOS = 3;

type PhotoItem = { id: string; file: File; preview: string };

export type RecordCompletedWorkSheetProps = {
  fields: Field[];
  fieldId: string;
  /** ISO or datetime-local default for completed date (defaults to today). */
  defaultCompletedAt?: string;
  onFieldChange?: (fieldId: string) => void;
  onDirty?: () => void;
  onSaved: (record: WorkRecord, linkedTaskId?: string) => void;
  onCancel?: () => void;
};

const toDateInput = (isoOrLocal?: string): string => {
  if (!isoOrLocal) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrLocal)) return isoOrLocal;
  const d = new Date(isoOrLocal);
  if (Number.isNaN(d.getTime())) return toDateInput();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const dateToIsoEndOfDay = (ymd: string): string => {
  const [y, m, d] = ymd.split('-').map(Number);
  const local = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
  return local.toISOString();
};

/**
 * Form to record completed grove work (Work Record).
 * Optionally offers linking to a matching planned task — never forced.
 */
const RecordCompletedWorkSheet: React.FC<RecordCompletedWorkSheetProps> = ({
  fields,
  fieldId,
  defaultCompletedAt,
  onFieldChange,
  onDirty,
  onSaved,
  onCancel,
}) => {
  const { t } = useTranslation(['capture', 'common']);
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [completedOn, setCompletedOn] = useState(() => toDateInput(defaultCompletedAt));
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdRecord, setCreatedRecord] = useState<WorkRecord | null>(null);
  const [matches, setMatches] = useState<Task[]>([]);
  const [linkBusy, setLinkBusy] = useState(false);

  useEffect(() => {
    setCompletedOn(toDateInput(defaultCompletedAt));
  }, [defaultCompletedAt]);

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke on unmount only
  }, []);

  const markDirty = () => onDirty?.();

  const addPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    const next: PhotoItem[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!file.type.startsWith('image/')) continue;
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }
    if (next.length) {
      setPhotos((prev) => [...prev, ...next]);
      markDirty();
    }
  };

  const canSubmit = Boolean(fieldId && title.trim() && completedOn && !busy);

  const handleSave = async () => {
    if (!canSubmit) {
      if (!fieldId) setError(t('capture:errors.fieldRequired'));
      else if (!title.trim()) setError(t('capture:recordWork.titleRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const attachmentIds: string[] = [];
      for (const photo of photos) {
        attachmentIds.push(await fileUploadService.uploadFile(photo.file));
      }
      const record = await getTaskService().createWorkRecord({
        fieldId,
        title: title.trim(),
        notes: notes.trim() || undefined,
        completedAt: dateToIsoEndOfDay(completedOn),
        attachmentIds: attachmentIds.length ? attachmentIds : undefined,
        offerPlannedTaskMatch: true,
      });
      const planned = record.matchingPlannedTasks || [];
      if (planned.length > 0) {
        setCreatedRecord(record);
        setMatches(planned);
      } else {
        onSaved(record);
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('capture:errors.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const finishWithoutLink = () => {
    if (createdRecord) onSaved(createdRecord);
  };

  const linkToTask = async (taskId: string) => {
    if (!createdRecord) return;
    setLinkBusy(true);
    setError(null);
    try {
      await getTaskService().linkWorkRecord(taskId, createdRecord.id);
      onSaved(createdRecord, taskId);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('capture:errors.saveFailed'));
    } finally {
      setLinkBusy(false);
    }
  };

  if (createdRecord && matches.length > 0) {
    return (
      <div className="record-work-sheet">
        <p className="record-work-link-lead">{t('capture:recordWork.linkOffer')}</p>
        <p className="record-work-link-hint">{t('capture:recordWork.linkHint')}</p>
        <ul className="record-work-matches">
          {matches.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                className="record-work-match"
                disabled={linkBusy}
                onClick={() => void linkToTask(task.id)}
              >
                <strong>{task.title}</strong>
                {task.scheduledFor ? (
                  <span>{task.scheduledFor.slice(0, 10)}</span>
                ) : task.timingBucket ? (
                  <span>{String(task.timingBucket)}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
        {error ? (
          <p className="record-work-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="record-work-actions">
          <button
            type="button"
            className="record-work-skip"
            disabled={linkBusy}
            onClick={finishWithoutLink}
          >
            {t('capture:recordWork.skipLink')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="record-work-sheet">
      {error ? (
        <p className="record-work-error" role="alert">
          {error}
        </p>
      ) : null}

      <label className="record-work-field">
        <span className="record-work-label">{t('capture:fieldLabel')}</span>
        <select
          className="record-work-input"
          value={fieldId}
          onChange={(e) => {
            onFieldChange?.(e.target.value);
            markDirty();
          }}
        >
          {fields.length === 0 ? (
            <option value="">{t('capture:errors.fieldRequired')}</option>
          ) : null}
          {fields.map((field) => (
            <option key={field.id} value={field.id}>
              {friendlyFieldLabel(field.name) || field.name}
            </option>
          ))}
        </select>
      </label>

      <label className="record-work-field">
        <span className="record-work-label">{t('capture:recordWork.title')}</span>
        <input
          className="record-work-input"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            markDirty();
          }}
          placeholder={t('capture:recordWork.titlePlaceholder')}
          autoFocus
        />
      </label>

      <label className="record-work-field">
        <span className="record-work-label">{t('capture:recordWork.date')}</span>
        <input
          type="date"
          className="record-work-input"
          value={completedOn}
          onChange={(e) => {
            setCompletedOn(e.target.value);
            markDirty();
          }}
        />
      </label>

      <label className="record-work-field">
        <span className="record-work-label">{t('capture:recordWork.notes')}</span>
        <textarea
          className="record-work-input"
          rows={3}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            markDirty();
          }}
          placeholder={t('capture:recordWork.notesPlaceholder')}
        />
      </label>

      <div className="record-work-photos">
        <span className="record-work-label">{t('capture:recordWork.photo')}</span>
        <div className="record-work-photo-row">
          {photos.map((p) => (
            <div key={p.id} className="record-work-photo-thumb">
              <img src={p.preview} alt="" />
              <button
                type="button"
                aria-label={t('capture:photos.remove')}
                onClick={() => {
                  URL.revokeObjectURL(p.preview);
                  setPhotos((prev) => prev.filter((x) => x.id !== p.id));
                  markDirty();
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS ? (
            <button
              type="button"
              className="record-work-add-photo"
              onClick={() => fileRef.current?.click()}
            >
              <Camera size={18} />
              <span>{t('capture:recordWork.addPhoto')}</span>
            </button>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={(e) => {
            addPhotos(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <div className="record-work-actions">
        {onCancel ? (
          <button type="button" className="record-work-cancel" disabled={busy} onClick={onCancel}>
            {t('capture:cancel')}
          </button>
        ) : null}
        <button
          type="button"
          className="record-work-save"
          disabled={!canSubmit}
          onClick={() => void handleSave()}
        >
          {busy ? t('capture:saving') : t('capture:recordWork.save')}
        </button>
      </div>
    </div>
  );
};

export default RecordCompletedWorkSheet;
