import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import TaskNotebookCard from './TaskNotebookCard';
import type { Task } from '../../services/taskService';

const baseTask: Task = {
  id: 't1',
  fieldId: 'f1',
  resultYear: 2026,
  ownerId: 'owner',
  title: 'Prune the dry branches',
  status: 'done',
  source: 'custom',
  timingBucket: 'later',
  checklist: [],
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-02T08:00:00Z',
};

const renderCard = (task: Task, personName?: string) =>
  render(
    <I18nextProvider i18n={i18n}>
      <TaskNotebookCard
        unit={{ key: task.id, tasks: [task] }}
        fieldName={() => 'Grove'}
        personName={personName}
        year={2026}
        onOpen={() => undefined}
        onComplete={() => undefined}
        onMenu={() => undefined}
      />
    </I18nextProvider>
  );

describe('TaskNotebookCard', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('QA_029_completed_task_keeps_assignee_when_name_is_unresolved', () => {
    renderCard({ ...baseTask, assignedUserId: 'user-9' });
    expect(screen.getByText('Assigned')).toBeInTheDocument();
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument();
  });

  it('QA_029_completed_task_shows_resolved_assignee_name', () => {
    renderCard({ ...baseTask, assignedUserId: 'user-9' }, 'Maria');
    expect(screen.getByText('Maria')).toBeInTheDocument();
  });

  it('QA_029_task_without_assignee_is_unassigned', () => {
    renderCard(baseTask);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('QA_045_skipped_task_has_no_empty_more_menu', () => {
    renderCard({ ...baseTask, status: 'skipped', skippedReason: 'Rain' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(document.querySelector('.notebook-card-more')).toBeNull();
  });
});
