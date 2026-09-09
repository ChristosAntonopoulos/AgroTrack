import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { el, enUS, it } from 'date-fns/locale';
import { Pin, Plus } from 'lucide-react';
import Button from '../Common/Button';
import { getNoteService } from '../../services/serviceFactory';
import { Note, notePreviewTitle } from '../../services/noteService';
import NoteSheet from './NoteSheet';
import { useCaptureOptional } from '../../context/CaptureContext';
import { CAPTURE_SAVED_EVENT, type CaptureSavedDetail } from '../../capture/types';
import './DashboardWidgets.css';

export interface NotesWidgetProps {
  limit?: number;
  fieldNames?: Record<string, string>;
  fields?: Array<{ id: string; name: string }>;
  showSeeMore?: boolean;
}

const NotesWidget: React.FC<NotesWidgetProps> = ({
  limit = 3,
  fieldNames = {},
  showSeeMore = true,
}) => {
  const { t, i18n } = useTranslation(['dashboard', 'capture']);
  const navigate = useNavigate();
  const capture = useCaptureOptional();
  const locale = i18n.language?.startsWith('el') ? el : i18n.language?.startsWith('it') ? it : enUS;

  const [notes, setNotes] = useState<Note[]>([]);
  const [editing, setEditing] = useState<Note | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getNoteService().getNotes({ limit: Math.max(limit, 20) });
      setNotes(list);
    } catch {
      setNotes([]);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onSaved = (e: Event) => {
      const detail = (e as CustomEvent<CaptureSavedDetail>).detail;
      if (detail?.type === 'observation') void load();
    };
    window.addEventListener(CAPTURE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(CAPTURE_SAVED_EVENT, onSaved);
  }, [load]);

  const visible = useMemo(() => notes.slice(0, limit), [notes, limit]);

  return (
    <section className="notes-widget" aria-label={t('capture:types.observation.title')}>
      <div className="recent-activity-header">
        <h2 className="dashboard-section-label">{t('capture:types.observation.title')}</h2>
        {showSeeMore ? (
          <button
            type="button"
            className="recent-activity-more"
            onClick={() => navigate('/chronologio')}
          >
            {t('notes.seeAll')}
          </button>
        ) : null}
      </div>

      {capture ? (
        <div className="notes-composer">
          <Button
            size="sm"
            variant="primary"
            icon={<Plus size={14} />}
            onClick={() => capture.openCapture({ preferredType: 'observation' })}
          >
            {t('capture:types.observation.title')}
          </Button>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="recent-activity-empty">{t('notes.emptyTitle')}</p>
      ) : (
        <ul className="recent-activity-list notes-list">
          {visible.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                className="recent-activity-row notes-row"
                onClick={() => {
                  setEditing(note);
                  setSheetOpen(true);
                }}
              >
                <span className="notes-row-top">
                  {note.pinned ? <Pin size={12} className="notes-pin-icon" aria-hidden /> : null}
                  <span className="recent-activity-title">{notePreviewTitle(note.body) || '—'}</span>
                </span>
                <span className="recent-activity-meta">
                  {note.fieldId && fieldNames[note.fieldId] ? `${fieldNames[note.fieldId]} · ` : ''}
                  {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true, locale })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {sheetOpen && editing ? (
        <NoteSheet
          note={editing}
          fields={[]}
          onClose={() => {
            setSheetOpen(false);
            setEditing(null);
          }}
          onChanged={() => void load()}
        />
      ) : null}
    </section>
  );
};

export default NotesWidget;
