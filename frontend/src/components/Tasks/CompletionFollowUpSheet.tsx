import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';
import type { Task } from '../../services/taskService';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
import './ScheduleWorkSheet.css';

interface CompletionFollowUpSheetProps {
  task: Task | null;
  open: boolean;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSaveDetails: (payload: { notes: string }) => void | Promise<void>;
  onDone: () => void;
}

const CompletionFollowUpSheet: React.FC<CompletionFollowUpSheetProps> = ({
  task,
  open,
  busy,
  error,
  onClose,
  onSaveDetails,
  onDone,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const [mode, setMode] = useState<'prompt' | 'details'>('prompt');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setMode('prompt');
    setNotes('');
  }, [open, task?.id]);

  const title = task
    ? taskDisplayTitle(task.title, task.templateCode, i18n.language)
    : '';

  return (
    <RightDrawer
      open={open && Boolean(task)}
      onClose={onClose}
      title={mode === 'prompt' ? t('complete.followUpTitle') : t('complete.detailsTitle')}
      subtitle={title}
      footer={
        mode === 'prompt' ? (
          <div className="schedule-work-footer">
            <Button variant="outline" size="lg" onClick={onDone}>
              {t('complete.done')}
            </Button>
            <Button variant="primary" size="lg" onClick={() => setMode('details')}>
              {t('complete.addDetails')}
            </Button>
          </div>
        ) : (
          <div className="schedule-work-footer">
            <Button variant="outline" size="lg" onClick={onDone} disabled={busy}>
              {t('complete.done')}
            </Button>
            <Button
              variant="primary"
              size="lg"
              disabled={busy}
              onClick={() => void onSaveDetails({ notes: notes.trim() })}
            >
              {t('complete.saveDetails')}
            </Button>
          </div>
        )
      }
    >
      {error ? <p className="task-form-error" role="alert">{error}</p> : null}
      {mode === 'prompt' ? (
        <p className="tasks-dismiss-copy">{t('complete.followUpBody')}</p>
      ) : (
        <div className="schedule-work-form">
          <label className="task-form-field">
            <span className="task-form-label">{t('complete.notes')}</span>
            <textarea
              className="task-form-input"
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t('complete.notesPlaceholder')}
            />
          </label>
          <p className="schedule-photo-hint">{t('complete.costPhotoHint')}</p>
        </div>
      )}
    </RightDrawer>
  );
};

export default CompletionFollowUpSheet;
