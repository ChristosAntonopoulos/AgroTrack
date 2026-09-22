import React from 'react';
import { render, screen } from '@testing-library/react';
import TaskViewTabs from './TaskViewTabs';

describe('TaskViewTabs', () => {
  it('renders farmer workflow tabs with counts', () => {
    render(
      <TaskViewTabs
        ariaLabel="Task views"
        activeView="todo"
        onChange={() => undefined}
        views={[
          { id: 'todo', label: 'Να γίνουν', count: 3 },
          { id: 'done', label: 'Ολοκληρωμένα', count: 0 },
        ]}
      />
    );

    const todo = screen.getByRole('tab', { name: 'Να γίνουν' });
    expect(todo).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Ολοκληρωμένα' })).not.toHaveAttribute('aria-describedby');
  });
});
