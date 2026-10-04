import React from 'react';
import { useTranslation } from 'react-i18next';
import RightDrawer from '../Common/RightDrawer';
import '../Tasks/TasksShell.css';
import './LearningPromptSheet.css';

export type LearningAction = {
  id: string;
  label: string;
  hint?: string;
  variant?: 'primary' | 'outline' | 'caution';
};

type Props = {
  open?: boolean;
  title: string;
  message: string;
  actions: LearningAction[];
  busy?: boolean;
  onAction: (actionId: string) => void;
  onClose: () => void;
};

const LearningPromptSheet: React.FC<Props> = ({
  open = true,
  title,
  message,
  actions,
  busy = false,
  onAction,
  onClose,
}) => {
  const { t } = useTranslation('common');

  return (
    <RightDrawer
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={title}
      size="sm"
      closeDisabled={busy}
      closeLabel={t('close')}
      footer={null}
    >
      <p className="fw-learning-sheet-message">{message}</p>
      <div className="tasks-choice-list">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={`tasks-choice-row${action.variant === 'caution' ? ' tasks-choice-row--caution' : ''}`}
            disabled={busy}
            onClick={() => onAction(action.id)}
          >
            <span className="tasks-choice-label">{action.label}</span>
            {action.hint ? <span className="tasks-choice-hint">{action.hint}</span> : null}
          </button>
        ))}
      </div>
    </RightDrawer>
  );
};

export default LearningPromptSheet;
