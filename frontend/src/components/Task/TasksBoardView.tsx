import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Task } from '../../services/taskService';
import { groupTasksForBoard, TaskBoardColumn } from '../../utils/taskListUtils';
import TaskCard from './TaskCard';
import EmptyState from '../Common/EmptyState';
import { LayoutGrid } from 'lucide-react';
import './TasksBoardView.css';

type Props = {
  tasks: Task[];
  fieldNames: Record<string, string>;
};

const COLUMN_ORDER: TaskBoardColumn[] = ['overdue', 'today', 'thisWeek', 'done'];

const TasksBoardView: React.FC<Props> = ({ tasks, fieldNames }) => {
  const { t } = useTranslation(['tasks', 'fields']);

  const columns = useMemo(() => groupTasksForBoard(tasks), [tasks]);

  const columnLabel = (key: TaskBoardColumn) => {
    const map: Record<TaskBoardColumn, string> = {
      overdue: t('fields:taskBoard.overdue'),
      today: t('fields:taskBoard.today'),
      thisWeek: t('fields:taskBoard.thisWeek'),
      done: t('fields:taskBoard.done'),
    };
    return map[key];
  };

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<LayoutGrid size={48} />}
        title={t('tasks:emptyTitle')}
        description={t('tasks:emptyDescriptionFilter')}
      />
    );
  }

  return (
    <div className="tasks-board-view">
      {COLUMN_ORDER.map((key) => (
        <section key={key} className={`tasks-board-col tasks-board-col--${key}`}>
          <header className="tasks-board-col-header">
            <h3>{columnLabel(key)}</h3>
            <span className="tasks-board-col-count">{columns[key].length}</span>
          </header>
          <div className="tasks-board-col-body">
            {columns[key].length === 0 ? (
              <p className="tasks-board-col-empty">{t('fields:taskBoard.empty')}</p>
            ) : (
              columns[key].map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  fieldName={fieldNames[task.fieldId]}
                  compact
                />
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
};

export default TasksBoardView;
