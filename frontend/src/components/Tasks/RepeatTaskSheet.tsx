import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';
import type { Task } from '../../services/taskService';
import { toDateInputValue } from '../../utils/proposalPresentation';

export type RepeatFrequency = 'weekly' | 'monthly';

interface RepeatTaskSheetProps {
  task: Task | null;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (input: { recurrence: RepeatFrequency; scheduledFor: string }) => void;
}

const RepeatTaskSheet: React.FC<RepeatTaskSheetProps> = ({
  task,
  open,
  busy,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation('tasks');
  const [frequency, setFrequency] = useState<RepeatFrequency>('weekly');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (!task) return;
    setFrequency('weekly');
    setDate(toDateInputValue(task.scheduledFor || task.plannedStart) || '');
  }, [task]);

  return (
    <RightDrawer
      open={open && Boolean(task)}
      onClose={onClose}
      title={t('notebook.menu.repeat')}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!date || busy}
          onClick={() => onConfirm({ recurrence: frequency, scheduledFor: date })}
        >
          {t('notebook.menu.repeat')}
        </Button>
      }
    >
      <div className="schedule-when-chips" role="radiogroup" aria-label={t('schedule.repeat')}>
        <button
          type="button"
          role="radio"
          aria-checked={frequency === 'weekly'}
          className={`task-type-chip${frequency === 'weekly' ? ' is-selected' : ''}`}
          onClick={() => setFrequency('weekly')}
        >
          {t('schedule.repeatWeekly')}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={frequency === 'monthly'}
          className={`task-type-chip${frequency === 'monthly' ? ' is-selected' : ''}`}
          onClick={() => setFrequency('monthly')}
        >
          {t('schedule.repeatMonthly')}
        </button>
      </div>
      <label className="tasks-schedule-date">
        <span className="tasks-context-label">{t('schedule.repeatStart')}</span>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
    </RightDrawer>
  );
};

export default RepeatTaskSheet;
