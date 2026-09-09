import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Task } from '../../services/taskService';
import TaskCard from './TaskCard';
import { resolveTaskCategoryAccent } from '../../utils/taskCategoryAccents';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './TasksCategoryBrowse.css';

export type CategoryRow = {
  key: string;
  label: string;
  accent: string;
  tasks: Task[];
};

type Props = {
  tasks: Task[];
  fieldNames: Record<string, string>;
  fieldColors?: Record<string, string | null | undefined>;
};

export const groupTasksByCategory = (tasks: Task[]): CategoryRow[] => {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = task.type?.trim() || 'Task';
    const list = map.get(key) || [];
    list.push(task);
    map.set(key, list);
  }
  return [...map.entries()]
    .map(([key, rowTasks]) => ({
      key,
      label: key,
      accent: resolveTaskCategoryAccent(key),
      tasks: rowTasks,
    }))
    .sort((a, b) => b.tasks.length - a.tasks.length || a.label.localeCompare(b.label));
};

const CategoryRail: React.FC<{
  row: CategoryRow;
  fieldNames: Record<string, string>;
  fieldColors: Record<string, string | null | undefined>;
}> = ({ row, fieldNames, fieldColors }) => {
  const { t } = useTranslation(['tasks', 'taskTemplates']);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const title = t(`taskTemplates:categories.${row.key}`, { defaultValue: row.label });

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(420, el.clientWidth * 0.85), behavior: 'smooth' });
  };

  return (
    <section className="tasks-rail" aria-label={title}>
      <header className="tasks-rail-header">
        <div className="tasks-rail-title-wrap">
          <span className="tasks-rail-swatch" style={{ background: row.accent }} aria-hidden />
          <h2 className="tasks-rail-title">{title}</h2>
          <span className="tasks-rail-count">{row.tasks.length}</span>
        </div>
        {row.tasks.length > 2 ? (
          <div className="tasks-rail-nav">
            <button
              type="button"
              className="tasks-rail-nav-btn"
              onClick={() => scrollBy(-1)}
              aria-label={t('tasks:browseScrollLeft')}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="tasks-rail-nav-btn"
              onClick={() => scrollBy(1)}
              aria-label={t('tasks:browseScrollRight')}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        ) : null}
      </header>
      <div className="tasks-rail-scroller" ref={scrollerRef}>
        {row.tasks.map((task) => (
          <div key={task.id} className="tasks-rail-card">
            <TaskCard
              task={task}
              fieldName={fieldNames[task.fieldId] || task.fieldId}
              fieldColor={fieldColors[task.fieldId]}
              compact
            />
          </div>
        ))}
      </div>
    </section>
  );
};

const TasksCategoryBrowse: React.FC<Props> = ({ tasks, fieldNames, fieldColors = {} }) => {
  const rows = useMemo(() => groupTasksByCategory(tasks), [tasks]);

  return (
    <div className="tasks-browse">
      {rows.map((row) => (
        <CategoryRail
          key={row.key}
          row={row}
          fieldNames={fieldNames}
          fieldColors={fieldColors}
        />
      ))}
    </div>
  );
};

export default TasksCategoryBrowse;
