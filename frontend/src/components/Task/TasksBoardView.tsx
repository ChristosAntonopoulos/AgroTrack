import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Task } from '../../services/taskService';
import { groupTasksForBoard, TaskBoardColumn } from '../../utils/taskListUtils';
import TaskCard from './TaskCard';
import EmptyState from '../Common/EmptyState';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { LayoutGrid } from 'lucide-react';
import './TasksBoardView.css';

type Props = {
  tasks: Task[];
  fieldNames: Record<string, string>;
  fieldColors?: Record<string, string | null | undefined>;
};

const COLUMN_ORDER: TaskBoardColumn[] = ['overdue', 'today', 'thisWeek', 'done'];

const TasksBoardView: React.FC<Props> = ({ tasks, fieldNames, fieldColors = {} }) => {
  const { t } = useTranslation(['tasks', 'fields']);
  const isMobile = useBreakpoint('md');
  const [activeColumn, setActiveColumn] = useState<TaskBoardColumn>('today');

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

  const visibleColumns = isMobile ? [activeColumn] : COLUMN_ORDER;

  return (
    <div className="tasks-board-wrap">
      {isMobile ? (
        <div className="tasks-board-tabs" role="tablist" aria-label={t('fields:taskBoard.title', { defaultValue: 'Board columns' })}>
          {COLUMN_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeColumn === key}
              className={`tasks-board-tab ${activeColumn === key ? 'active' : ''}`}
              onClick={() => setActiveColumn(key)}
            >
              <span className="tasks-board-tab-label">{columnLabel(key)}</span>
              <span className="tasks-board-tab-count">{columns[key].length}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className={`tasks-board-view ${isMobile ? 'tasks-board-view--mobile' : ''}`}>
        {visibleColumns.map((key) => (
          <section key={key} className={`tasks-board-col tasks-board-col--${key}`}>
            {!isMobile ? (
              <header className="tasks-board-col-header">
                <h3>{columnLabel(key)}</h3>
                <span className="tasks-board-col-count">{columns[key].length}</span>
              </header>
            ) : null}
            <div className="tasks-board-col-body">
              {columns[key].length === 0 ? (
                <p className="tasks-board-col-empty">{t('fields:taskBoard.empty')}</p>
              ) : (
                columns[key].map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    fieldName={fieldNames[task.fieldId]}
                    fieldColor={fieldColors[task.fieldId]}
                    compact
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default TasksBoardView;
