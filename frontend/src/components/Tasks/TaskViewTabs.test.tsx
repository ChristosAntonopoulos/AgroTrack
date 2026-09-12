import React from 'react';
import { render, screen } from '@testing-library/react';
import TaskViewTabs from './TaskViewTabs';

describe('TaskViewTabs', () => {
  it('renders farmer workflow tabs with counts', () => {
    render(
      <TaskViewTabs
        ariaLabel="Task views"
        activeView="now"
        onChange={() => undefined}
        views={[
          { id: 'now', label: 'Τώρα', count: 3 },
          { id: 'upcoming', label: 'Επόμενες', count: 6 },
          { id: 'proposals', label: 'Προτάσεις', count: 14 },
          { id: 'history', label: 'Ιστορικό', count: 0 },
        ]}
      />
    );

    const now = screen.getByRole('tab', { name: 'Τώρα' });
    expect(now).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Επόμενες' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Προτάσεις' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ιστορικό' })).not.toHaveAttribute('aria-describedby');
  });
});
