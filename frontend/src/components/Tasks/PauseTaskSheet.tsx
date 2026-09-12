import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';
import type { FieldTask } from '../../services/fieldWorkService';

export type PauseReason = 'weather' | 'waiting_person' | 'waiting_equipment' | 'another_day' | 'other';

interface PauseTaskSheetProps {
  task: FieldTask | null;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason: PauseReason, newDate?: string) => void;
}

const REASONS: PauseReason[] = [
  'weather',
  'waiting_person',
  'waiting_equipment',
  'another_day',
  'other',
];

const PauseTaskSheet: React.FC<PauseTaskSheetProps> = ({
  task,
  open,
  busy,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation('tasks');
  const [reason, setReason] = useState<PauseReason | null>(null);
  const [date, setDate] = useState('');

  const needsDate = reason === 'another_day' || reason === 'weather';

  return (
    <RightDrawer
      open={open && Boolean(task)}
      onClose={onClose}
      title={t('fieldWork.pause.title')}
      footer={
        <Button
          variant="primary"
          size="lg"
          disabled={!reason || busy || (needsDate && !date)}
          onClick={() => reason && onConfirm(reason, date || undefined)}
        >
          {t('fieldWork.pause.confirm')}
        </Button>
      }
    >
      <p className="tasks-dismiss-copy">{t('fieldWork.pause.copy')}</p>
      <div className="tasks-dismiss-choices">
        {REASONS.map((id) => (
          <Button
            key={id}
            variant={reason === id ? 'primary' : 'outline'}
            size="lg"
            onClick={() => setReason(id)}
          >
            {t(`fieldWork.pause.reasons.${id}`)}
          </Button>
        ))}
      </div>
      {needsDate ? (
        <label className="tasks-context-control" style={{ marginTop: 16, display: 'block' }}>
          <span className="tasks-context-label">{t('fieldWork.pause.newDate')}</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      ) : null}
    </RightDrawer>
  );
};

export default PauseTaskSheet;
