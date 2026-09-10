import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './LearningPromptSheet.css';

export type LearningAction = {
  id: string;
  label: string;
  variant?: 'primary' | 'outline';
};

type Props = {
  title: string;
  message: string;
  actions: LearningAction[];
  busy?: boolean;
  onAction: (actionId: string) => void;
  onClose: () => void;
};

/** Lightweight Greek-first learning prompt (large targets). */
const LearningPromptSheet: React.FC<Props> = ({
  title,
  message,
  actions,
  busy = false,
  onAction,
  onClose,
}) => {
  const { t } = useTranslation('common');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [busy, onClose]);

  return (
    <div className="fw-learning-sheet" role="dialog" aria-modal="true" aria-labelledby="fw-learning-title">
      <button
        type="button"
        className="fw-learning-sheet-backdrop"
        aria-label={t('close')}
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div className="fw-learning-sheet-card">
        <header className="fw-learning-sheet-header">
          <h2 id="fw-learning-title">{title}</h2>
          <button
            type="button"
            className="fw-learning-sheet-close"
            onClick={() => {
              if (!busy) onClose();
            }}
            aria-label={t('close')}
          >
            <X size={20} aria-hidden />
          </button>
        </header>
        <p className="fw-learning-sheet-message">{message}</p>
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
      </div>
    </div>
  );
};

export default LearningPromptSheet;
