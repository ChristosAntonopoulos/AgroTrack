import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Pin, StickyNote } from 'lucide-react';
import Button from '../Common/Button';
import RightDrawer from '../Common/RightDrawer';
import { getNoteService } from '../../services/serviceFactory';
import { Note } from '../../services/noteService';
import { getApiErrorMessage } from '../../utils/translateApiError';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import './NoteSheet.css';

type FieldOption = { id: string; name: string; color?: string | null };

type Props = {
  open?: boolean;
  note?: Note;
  fields: FieldOption[];
  initialBody?: string;
  onClose: () => void;
  onChanged?: () => void | Promise<void>;
};

const NOTE_MAX = 4000;

const NoteSheet: React.FC<Props> = ({
  open = true,
  note,
  fields,
  initialBody = '',
  onClose,
  onChanged,
}) => {
  const { t } = useTranslation(['dashboard', 'common', 'chronologio']);
  const [body, setBody] = useState(note?.body || initialBody);
  const [fieldId, setFieldId] = useState(note?.fieldId || '');
  const [pinned, setPinned] = useState(Boolean(note?.pinned));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setBody(note?.body || initialBody);
    setFieldId(note?.fieldId || '');
    setPinned(Boolean(note?.pinned));
    setError(null);
  }, [open, note?.id, note?.body, note?.fieldId, note?.pinned, initialBody]);

  const save = async () => {
    const trimmed = body.trim();
    if (!trimmed) {
      setError(t('dashboard:notes.bodyRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        body: trimmed,
        fieldId: fieldId || null,
        pinned,
      };
      if (note) {
        await getNoteService().updateNote(note.id, payload);
      } else {
        await getNoteService().createNote(payload);
      }
      await onChanged?.();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!note) return;
    setDeleting(true);
    setError(null);
    try {
      await getNoteService().deleteNote(note.id);
      await onChanged?.();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <RightDrawer
      open={open}
      accent
      className="notes-sheet-drawer"
      title={note ? t('dashboard:notes.editTitle') : t('dashboard:notes.newTitle')}
      kicker={t('chronologio:categoryLabel.note')}
      icon={<StickyNote size={18} />}
      subtitle={t('dashboard:notes.subtitle')}
      onClose={onClose}
      footer={
        <div className="notes-sheet-footer">
          {note ? (
            <Button variant="ghost" size="sm" onClick={() => void remove()} disabled={deleting || saving}>
              {t('common:delete')}
            </Button>
          ) : (
            <span />
          )}
          <div className="notes-sheet-footer-actions">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('common:cancel')}
            </Button>
            <Button variant="primary" size="sm" onClick={() => void save()} disabled={saving || !body.trim()}>
              {t('dashboard:notes.save')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="notes-sheet">
        <label className="notes-sheet-write" htmlFor="note-body">
          <span className="notes-sheet-label">{t('dashboard:notes.bodyLabel')}</span>
          <textarea
            id="note-body"
            className="notes-sheet-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            maxLength={NOTE_MAX}
            placeholder={t('dashboard:notes.placeholder')}
            autoFocus
          />
          <span className="notes-sheet-count">
            {t('dashboard:notes.charCount', { count: body.length, max: NOTE_MAX })}
          </span>
        </label>

        <fieldset className="notes-sheet-block">
          <legend id="note-field-label" className="notes-sheet-label">
            <MapPin size={14} aria-hidden />
            {t('dashboard:notes.pinField')}
          </legend>
          <p className="notes-sheet-hint">{t('dashboard:notes.fieldHint')}</p>
          <div className="notes-sheet-fields" role="radiogroup" aria-labelledby="note-field-label">
            <button
              type="button"
              role="radio"
              aria-checked={!fieldId}
              className={!fieldId ? 'is-selected' : ''}
              onClick={() => setFieldId('')}
            >
              <span className="notes-sheet-field-dot is-none" aria-hidden />
              {t('dashboard:notes.noField')}
            </button>
            {fields.map((field) => {
              const selected = fieldId === field.id;
              return (
                <button
                  key={field.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={selected ? 'is-selected' : ''}
                  onClick={() => setFieldId(field.id)}
                >
                  <span
                    className="notes-sheet-field-dot"
                    style={{ background: resolveFieldColor(field.color, field.id) }}
                    aria-hidden
                  />
                  {friendlyFieldLabel(field.name)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          type="button"
          className={`notes-sheet-pin${pinned ? ' is-on' : ''}`}
          aria-pressed={pinned}
          onClick={() => setPinned((value) => !value)}
        >
          <span className="notes-sheet-pin-icon" aria-hidden>
            <Pin size={16} />
          </span>
          <span className="notes-sheet-pin-copy">
            <strong>{t('dashboard:notes.pinTop')}</strong>
            <small>{t('dashboard:notes.pinHint')}</small>
          </span>
        </button>

        {error ? <p className="notes-sheet-error">{error}</p> : null}
      </div>
    </RightDrawer>
  );
};

export default NoteSheet;
