import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import { Task } from '../../services/taskService';
import Badge from '../Common/Badge';
import AccentCard from '../Common/AccentCard';
import { CATEGORY_STYLES, PRIORITY_VARIANT } from '../../utils/taskTemplateUtils';
import { isTaskDueToday, isTaskOverdue } from '../../utils/taskListUtils';
import { TaskTemplateCategory } from '../../types/oliveTaskTemplate';
import { resolveFieldColor } from '../../utils/fieldColors';
import { resolveTaskCategoryAccent } from '../../utils/taskCategoryAccents';
import { Calendar, CheckSquare, MapPin, Sparkles } from 'lucide-react';
import './TaskCard.css';

type Props = {
  task: Task;
  fieldName?: string;
  /** Saved field color — left edge. */
  fieldColor?: string | null;
  compact?: boolean;
};

const TaskCard: React.FC<Props> = ({ task, fieldName, fieldColor, compact = false }) => {
  const { t } = useTranslation(['tasks', 'common', 'taskTemplates']);
  const { formatDate } = useLocaleFormatters();

  const overdue = isTaskOverdue(task);
  const dueToday = isTaskDueToday(task);
  const categoryStyle = CATEGORY_STYLES[task.type as TaskTemplateCategory];
  const checklistTotal = task.checklist?.length ?? 0;
  const fieldAccent = resolveFieldColor(fieldColor, task.fieldId);
  const categoryAccent = resolveTaskCategoryAccent(task.type);
  const typeLabel = t(`taskTemplates:categories.${task.type}`, {
    defaultValue: task.type,
  });

  const statusVariant =
    task.status === 'completed'
      ? 'success'
      : task.status === 'in_progress'
        ? 'info'
        : overdue
          ? 'error'
          : 'warning';

  const priorityVariant = task.priority
    ? PRIORITY_VARIANT[task.priority as keyof typeof PRIORITY_VARIANT]
    : 'info';

  return (
    <Link to={`/tasks/${task.id}`} className="task-card-v2-link">
      <AccentCard
        accentColor={fieldAccent}
        endColor={categoryAccent}
        compact={compact}
        interactive
        className={`task-card-v2${compact ? ' task-card-v2--compact' : ''}${overdue ? ' is-overdue' : ''}`}
        style={
          {
            ['--category-accent' as string]: categoryAccent,
          } as React.CSSProperties
        }
      >
        <div className="task-card-v2-top">
          <div className="task-card-v2-badges">
            {categoryStyle ? (
              <span
                className="task-card-v2-category"
                style={{
                  background: categoryStyle.chipBg,
                  color: categoryStyle.text,
                  borderColor: categoryStyle.border,
                }}
              >
                {typeLabel}
              </span>
            ) : (
              <span className="task-card-v2-category task-card-v2-category--plain">{typeLabel}</span>
            )}
            {task.priority && (
              <Badge variant={priorityVariant} size="sm">
                {t(`tasks:form.priorities.${task.priority}`)}
              </Badge>
            )}
            {task.templateId && (
              <span className="task-card-v2-template" title={t('tasks:card.fromTemplate')}>
                <Sparkles size={12} />
              </span>
            )}
          </div>
          <Badge variant={statusVariant as 'success' | 'info' | 'warning' | 'error'} size="sm">
            {t(`common:taskStatus.${task.status}`)}
          </Badge>
        </div>

        <h3 className="task-card-v2-title">{task.title}</h3>

        {!compact && task.description && (
          <p className="task-card-v2-desc">{task.description}</p>
        )}

        <div className="task-card-v2-meta">
          {fieldName && (
            <span className="task-card-v2-meta-item accent-card-field-chip">
              <span className="accent-card-field-dot" aria-hidden />
              <MapPin size={14} />
              {fieldName}
            </span>
          )}
          <span
            className={`task-card-v2-meta-item${overdue ? ' task-card-v2-meta-item--warn' : ''}${dueToday ? ' task-card-v2-meta-item--today' : ''}`}
          >
            <Calendar size={14} />
            {task.scheduledEnd ? formatDate(task.scheduledEnd) : t('tasks:notScheduled')}
            {overdue && ` · ${t('tasks:card.overdue')}`}
            {dueToday && !overdue && ` · ${t('tasks:card.dueToday')}`}
          </span>
          {checklistTotal > 0 && (
            <span className="task-card-v2-meta-item">
              <CheckSquare size={14} />
              {t('tasks:card.checklistItems', { count: checklistTotal })}
            </span>
          )}
        </div>
      </AccentCard>
    </Link>
  );
};

export default TaskCard;
