import React from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../Common/Button';

interface TaskFormActionsProps {
  primaryLabel: string;
  disabledReason?: string;
  saving: boolean;
  onCancel: () => void;
}

const TaskFormActions: React.FC<TaskFormActionsProps> = ({
  primaryLabel,
  disabledReason,
  saving,
  onCancel,
}) => {
  const { t } = useTranslation('tasks');
  const reasonId = 'task-form-disabled-reason';

  return (
    <div className="task-form-actions">
      {disabledReason ? (
        <p id={reasonId} className="task-form-disabled-reason" role="status">
          {disabledReason}
        </p>
      ) : null}
      <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={saving}>
        {t('fieldWork.form.cancel')}
      </Button>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={saving}
        disabled={Boolean(disabledReason)}
        aria-describedby={disabledReason ? reasonId : undefined}
      >
        {primaryLabel}
      </Button>
    </div>
  );
};

export default TaskFormActions;
