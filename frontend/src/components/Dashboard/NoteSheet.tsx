import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import PartnersSheet from '../Partners/PartnersSheet';
import { getNoteService } from '../../services/serviceFactory';
import { Note } from '../../services/noteService';
import { getApiErrorMessage } from '../../utils/translateApiError';
import '../../pages/PartnersPage.css';

type FieldOption = { id: string; name: string };

type Props = {
  note?: Note;
  fields: FieldOption[];
  initialBody?: string;
  onClose: () => void;
  onChanged?: () => void | Promise<void>;
};

const NoteSheet: React.FC<Props> = ({
  note,
  fields,
  initialBody = '',
  onClose,
  onChanged,
}) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [body, setBody] = useState(note?.body || initialBody);
  const [fieldId, setFieldId] = useState(note?.fieldId || '');
  const [pinned, setPinned] = useState(Boolean(note?.pinned));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <PartnersSheet
      title={note ? t('dashboard:notes.editTitle') : t('dashboard:notes.newTitle')}
      subtitle={t('dashboard:notes.subtitle')}
      onClose={onClose}
      footer={
        <div className="notes-sheet-footer">
          {note ? (
            <Button variant="error" size="sm" onClick={() => void remove()} disabled={deleting || saving}>
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
      <label className="notes-sheet-label" htmlFor="note-body">
        {t('dashboard:notes.bodyLabel')}
      </label>
      <textarea
        id="note-body"
        className="notes-sheet-textarea"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        maxLength={4000}
        placeholder={t('dashboard:notes.placeholder')}
      />

      <label className="notes-sheet-label" htmlFor="note-field">
        {t('dashboard:notes.pinField')}
      </label>
      <select
        id="note-field"
        className="notes-sheet-select"
        value={fieldId}
        onChange={(e) => setFieldId(e.target.value)}
      >
        <option value="">{t('dashboard:notes.noField')}</option>
        {fields.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>

      <label className="notes-sheet-check">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
        />
        {t('dashboard:notes.pinTop')}
      </label>

      {error ? <p className="notes-sheet-error">{error}</p> : null}
    </PartnersSheet>
  );
};

export default NoteSheet;
