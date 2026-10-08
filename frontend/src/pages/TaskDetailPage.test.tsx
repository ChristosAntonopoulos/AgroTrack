import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import TaskDetailPage from './TaskDetailPage';
import type { Task } from '../services/taskService';

const mockGetTask = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    useParams: () => ({ id: 'task-1' }),
    useNavigate: () => jest.fn(),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  }),
  { virtual: true }
);

jest.mock('../components/Layout/Breadcrumbs', () => () => null);

jest.mock('../services/serviceFactory', () => ({
  getTaskService: () => ({
    getTask: (...args: unknown[]) => mockGetTask(...args),
    patchTask: jest.fn(),
    completeTask: jest.fn(),
    skipTask: jest.fn(),
  }),
  getFieldService: () => ({ getFields: async () => [] }),
}));

const task: Task = {
  id: 'task-1',
  fieldId: 'field-1',
  resultYear: 2026,
  ownerId: 'owner-1',
  title: 'Λίπανση',
  status: 'planned',
  statusLabel: 'Προγραμματισμένη',
  source: 'custom',
  timingBucket: 'today',
  checklist: [],
  createdByUserId: 'owner-1',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

describe('TaskDetailPage slim detail', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('el');
    mockGetTask.mockResolvedValue(task);
  });

  it('shows view/edit actions without start/pause work controls', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <TaskDetailPage />
      </I18nextProvider>
    );

    expect(await screen.findByRole('heading', { name: 'Λίπανση' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Σήμανε έτοιμη' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Αλλαγή ημερομηνίας' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Έναρξη|Συνέχισε|Παύση/i })).not.toBeInTheDocument();
  });
});
