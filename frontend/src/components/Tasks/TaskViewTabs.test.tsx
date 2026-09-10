import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import TaskViewTabs from './TaskViewTabs';

describe('TaskViewTabs', () => {
  it('moves between tabs with arrow keys and exposes counts on the tab', async () => {
    const onChange = jest.fn();
    render(
      <TaskViewTabs
        ariaLabel="Προβολές εργασιών"
        activeView="proposals"
        onChange={onChange}
        views={[
          { id: 'proposals', label: 'Προτάσεις', count: 5 },
          { id: 'planned', label: 'Προγραμματισμένες', count: 2 },
          { id: 'active', label: 'Σε εξέλιξη', count: 0 },
        ]}
      />
    );

    const proposals = screen.getByRole('tab', { name: 'Προτάσεις' });
    expect(proposals).toHaveAttribute('aria-selected', 'true');
    expect(proposals).toHaveAttribute('aria-describedby', 'tasks-tab-count-proposals');
    expect(within(proposals).getByText('5')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Σε εξέλιξη' })).not.toHaveAttribute('aria-describedby');

    proposals.focus();
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('planned');
  });
});
