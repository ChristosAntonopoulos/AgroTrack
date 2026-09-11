import React from 'react';
import { useTranslation } from 'react-i18next';
import RightDrawer from '../Common/RightDrawer';
import './LearningPromptSheet.css';

export type LearningAction = {
  id: string;
  label: string;
  variant?: 'primary' | 'outline';
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

/** Lightweight Greek-first learning prompt (large targets). */
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
      footerClassName="oa-drawer-footer--stack"
      footer={
        <div className="fw-learning-sheet-actions">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={`fw-learning-action${action.variant === 'outline' ? ' is-outline' : ''}`}
              disabled={busy}
              onClick={() => onAction(action.id)}
            >
              {action.label}
            </button>
          ))}
        </div>
      }
    >
      <p className="fw-learning-sheet-message">{message}</p>
    </RightDrawer>
  );
};

export default LearningPromptSheet;
