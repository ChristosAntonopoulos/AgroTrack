import React, { useEffect, useState } from 'react';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import FormDateField from '../forms/FormDateField';
import { useTranslation } from 'react-i18next';
import type { FieldTask } from '../../services/fieldWorkService';
import { toDateInputValue } from '../../utils/proposalPresentation';

type Props = {
  task: FieldTask | null;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (plannedStart: string, plannedEnd?: string) => void;
};

const RescheduleTaskSheet: React.FC<Props> = ({ task, open, busy, onClose, onConfirm }) => {
  const { t } = useTranslation('tasks');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (!task) return;
    setDate(toDateInputValue(task.plannedStart) || '');
  }, [task]);

  return (
    <Sheet
      open={open && Boolean(task)}
      onClose={onClose}
      title={t('fieldWork.reschedule.title')}
      edge="bottom"
      size="sm"
      footer={
        <Button
          title={t('fieldWork.reschedule.confirm')}
          disabled={!date || busy}
          onPress={() => onConfirm(date, date)}
        />
      }
    >
      <FormDateField
        label={t('fieldWork.reschedule.newDate')}
        value={date}
        onValueChange={setDate}
      />
    </Sheet>
  );
};

export default RescheduleTaskSheet;
