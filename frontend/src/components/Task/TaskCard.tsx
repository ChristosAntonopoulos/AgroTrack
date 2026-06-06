import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import { Task } from '../../services/taskService';
import Card from '../Common/Card';
import Badge from '../Common/Badge';
import { CATEGORY_STYLES, PRIORITY_VARIANT } from '../../utils/taskTemplateUtils';
import { isTaskDueToday, isTaskOverdue } from '../../utils/taskListUtils';
import { TaskTemplateCategory } from '../../types/oliveTaskTemplate';
import { Calendar, CheckSquare, MapPin, Sparkles } from 'lucide-react';
import './TaskCard.css';

type Props = {
  task: Task;
  fieldName?: string;
  compact?: boolean;
};

const TaskCard: React.FC<Props> = ({ task, fieldName, compact = false }) => {
  const { t } = useTranslation(['tasks', 'common']);
  const { formatDate } = useLocaleFormatters();

  const overdue = isTaskOverdue(task);
  const dueToday = isTaskDueToday(task);
  const categoryStyle = CATEGORY_STYLES[task.type as TaskTemplateCategory];
  const checklistTotal = task.checklist?.length ?? 0;

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
    <Card hover to={`/tasks/${task.id}`} className={`task-card-v2${compact ? ' task-card-v2--compact' : ''}`}>
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
              {task.type}
            </span>
          ) : (
            <span className="task-card-v2-category task-card-v2-category--plain">{task.type}</span>
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
          <span className="task-card-v2-meta-item">
            <MapPin size={14} />
            {fieldName}
          </span>
        )}
        <span className={`task-card-v2-meta-item${overdue ? ' task-card-v2-meta-item--warn' : ''}${dueToday ? ' task-card-v2-meta-item--today' : ''}`}>
          <Calendar size={14} />
          {task.scheduledEnd
            ? formatDate(task.scheduledEnd)
            : t('tasks:notScheduled')}
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
    </Card>
  );
};

export default TaskCard;
