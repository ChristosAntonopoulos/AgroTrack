import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';
import type { Task } from '../../services/taskService';
import { toDateInputValue } from '../../utils/proposalPresentation';

interface RescheduleTaskSheetProps {
  task: Task | null;
  open: boolean;
  busy?: boolean;
  suggestedDate?: string;
  weatherNote?: string;
  onClose: () => void;
  onConfirm: (plannedStart: string, plannedEnd?: string) => void;
  onKeep?: () => void;
}

const RescheduleTaskSheet: React.FC<RescheduleTaskSheetProps> = ({
  task,
  open,
  busy,
  suggestedDate,
  weatherNote,
  onClose,
  onConfirm,
  onKeep,
}) => {
  const { t } = useTranslation('tasks');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (!task) return;
    setDate(
      suggestedDate ||
        toDateInputValue(task.scheduledFor || task.plannedStart) ||
        ''
    );
  }, [task, suggestedDate]);

  return (
    <RightDrawer
      open={open && Boolean(task)}
      onClose={onClose}
      title={t('fieldWork.reschedule.title')}
      footer={
        <div className="tasks-choice-list">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!date || busy}
            onClick={() => onConfirm(date, date)}
          >
            {suggestedDate
              ? t('fieldWork.reschedule.moveToSuggested')
              : t('fieldWork.reschedule.confirm')}
          </Button>
          {onKeep ? (
            <button
              type="button"
              className="tasks-choice-row"
              onClick={onKeep}
              disabled={busy}
            >
              <span className="tasks-choice-label">{t('fieldWork.reschedule.keep')}</span>
            </button>
          ) : null}
        </div>
      }
    >
      {weatherNote ? <p className="tasks-dismiss-copy">{weatherNote}</p> : null}
      {suggestedDate ? (
        <p className="tasks-dismiss-copy">
          {t('fieldWork.reschedule.suggested', { date: suggestedDate })}
        </p>
      ) : null}
      <label className="tasks-schedule-date">
        <span className="tasks-context-label">{t('fieldWork.reschedule.newDate')}</span>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
    </RightDrawer>
  );
};

export default RescheduleTaskSheet;
