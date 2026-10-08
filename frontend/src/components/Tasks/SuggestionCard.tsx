import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TaskSuggestion } from '../../services/taskService';
import TaskCategoryMark from './TaskCategoryMark';
import './TaskNotebookCard.css';

interface SuggestionCardProps {
  suggestion: TaskSuggestion;
  fieldName: string;
  busy?: boolean;
  onSchedule: (suggestion: TaskSuggestion) => void;
  onDismiss: (suggestion: TaskSuggestion) => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  fieldName,
  busy,
  onSchedule,
  onDismiss,
}) => {
  const { t } = useTranslation('tasks');

  return (
    <article className="task-row notebook-card notebook-card--suggestion">
      <div className="notebook-card-hit" style={{ cursor: 'default' }}>
        <TaskCategoryMark templateCode={suggestion.templateCode} />
        <span className="notebook-card-copy">
          <span className="task-row-title notebook-card-title">{suggestion.title}</span>
          <span className="task-row-meta notebook-card-where">
            {fieldName}
            {suggestion.whyNow ? (
              <>
                <span aria-hidden> · </span>
                <span>{suggestion.whyNow}</span>
              </>
            ) : null}
          </span>
        </span>
      </div>
      <div className="notebook-card-actions task-row-actions suggestion-actions">
        <button
          type="button"
          className="notebook-card-primary"
          disabled={busy}
          onClick={() => onSchedule(suggestion)}
        >
          {t('suggestions.schedule')}
        </button>
        <button
          type="button"
          className="suggestion-dismiss"
          disabled={busy}
          onClick={() => onDismiss(suggestion)}
        >
          {t('suggestions.dismiss')}
        </button>
      </div>
    </article>
  );
};

export default SuggestionCard;
