import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import FormDateField from '../forms/FormDateField';
import { useTranslation } from 'react-i18next';
import type { Task } from '../../services/taskService';
import { toDateInputValue } from '../../utils/proposalPresentation';
import { TaskChoiceChips } from './TaskChoiceChips';
import { spacing } from '../../theme';

export type RepeatFrequency = 'weekly' | 'monthly';

type Props = {
  task: Task | null;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (input: { recurrence: RepeatFrequency; scheduledFor: string }) => void;
};

const RepeatTaskSheet: React.FC<Props> = ({ task, open, busy, onClose, onConfirm }) => {
  const { t } = useTranslation('tasks');
  const [frequency, setFrequency] = useState<RepeatFrequency>('weekly');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (!task) return;
    setFrequency('weekly');
    setDate(toDateInputValue(task.scheduledFor || task.plannedStart) || '');
  }, [task]);

  return (
    <Sheet
      open={open && Boolean(task)}
      onClose={onClose}
      title={t('notebook.menu.repeat')}
      edge="bottom"
      size="sm"
      footer={
        <Button
          title={t('notebook.menu.repeat')}
          disabled={!date || busy}
          onPress={() => onConfirm({ recurrence: frequency, scheduledFor: date })}
        />
      }
    >
      <View style={{ gap: spacing.md }}>
        <TaskChoiceChips
          options={[
            { id: 'weekly', label: t('schedule.repeatWeekly') },
            { id: 'monthly', label: t('schedule.repeatMonthly') },
          ]}
          value={frequency}
          onChange={setFrequency}
        />
        <FormDateField
          label={t('schedule.repeatStart')}
          value={date}
          onValueChange={setDate}
        />
      </View>
    </Sheet>
  );
};

export default RepeatTaskSheet;
