import React from 'react';
import { render, screen } from '@testing-library/react';
import TaskViewTabs from './TaskViewTabs';

describe('TaskViewTabs', () => {
  it('renders today / upcoming / done tabs with counts', () => {
    render(
      <TaskViewTabs
        ariaLabel="Task views"
        activeView="today"
        onChange={() => undefined}
        views={[
          { id: 'today', label: 'Σήμερα', count: 3 },
          { id: 'upcoming', label: 'Επόμενες', count: 1 },
          { id: 'done', label: 'Έγιναν', count: 0 },
        ]}
      />
    );

    const today = screen.getByRole('tab', { name: 'Σήμερα' });
    expect(today).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Επόμενες' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Έγιναν' })).not.toHaveAttribute('aria-describedby');
  });
});
