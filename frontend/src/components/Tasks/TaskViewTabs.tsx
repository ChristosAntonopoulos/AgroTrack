import React, { useRef } from 'react';
import type { TaskPageView } from '../../utils/taskViewState';

export type TaskViewTabItem = {
  id: TaskPageView;
  label: string;
  count: number;
};

interface TaskViewTabsProps {
  views: TaskViewTabItem[];
  activeView: TaskPageView;
  ariaLabel: string;
  onChange: (view: TaskPageView) => void;
}

const TaskViewTabs: React.FC<TaskViewTabsProps> = ({
  views,
  activeView,
  ariaLabel,
  onChange,
}) => {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusView = (index: number) => {
    const next = views[index];
    if (!next) return;
    tabRefs.current[index]?.focus();
    onChange(next.id);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = views.findIndex((view) => view.id === activeView);
    if (current < 0) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      focusView((current + 1) % views.length);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusView((current - 1 + views.length) % views.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusView(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusView(views.length - 1);
    }
  };

  return (
    <div className="tasks-view-tabs" role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown}>
      {views.map((view, index) => {
        const selected = view.id === activeView;
        const countId = `tasks-tab-count-${view.id}`;
        return (
          <button
            key={view.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`tasks-tab-${view.id}`}
            aria-label={view.label}
            aria-selected={selected}
            aria-controls={`tasks-panel-${view.id}`}
            aria-describedby={view.count > 0 ? countId : undefined}
            tabIndex={selected ? 0 : -1}
            className={`tasks-view-tab${selected ? ' is-active' : ''}`}
            onClick={() => onChange(view.id)}
          >
            <span className="tasks-view-tab-label">{view.label}</span>
            {view.count > 0 ? (
              <span id={countId} className="tasks-view-tab-count">
                {view.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

export default TaskViewTabs;
