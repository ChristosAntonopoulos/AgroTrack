import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import TaskDetailPage from './TaskDetailPage';
import type { Task } from '../services/taskService';

const mockGetTask = jest.fn();
const mockReopenTask = jest.fn();
const mockDeleteTask = jest.fn();
const mockNavigate = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    useParams: () => ({ id: 'task-1' }),
    useNavigate: () => mockNavigate,
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
    reopenTask: (...args: unknown[]) => mockReopenTask(...args),
    deleteTask: (...args: unknown[]) => mockDeleteTask(...args),
  }),
  getFieldService: () => ({ getFields: async () => [] }),
}));

const planned: Task = {
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

const done: Task = {
  ...planned,
  status: 'done',
  statusLabel: 'Έγινε',
  completedAt: '2026-09-08T10:00:00Z',
  note: 'Έβαλα λίπασμα',
};

describe('TaskDetailPage slim detail', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('el');
    mockGetTask.mockReset();
    mockReopenTask.mockReset();
    mockDeleteTask.mockReset();
    mockNavigate.mockReset();
    mockGetTask.mockResolvedValue(planned);
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

  it('shows done outcome with restore and overflow edit/delete', async () => {
    mockGetTask.mockResolvedValue(done);
    mockReopenTask.mockResolvedValue({ ...done, status: 'planned' });

    render(
      <I18nextProvider i18n={i18n}>
        <TaskDetailPage />
      </I18nextProvider>
    );

    expect(await screen.findByRole('heading', { name: 'Έγινε' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Επαναφορά στις εργασίες' }).length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Έβαλα λίπασμα')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Περισσότερα'));
    expect(await screen.findByRole('menuitem', { name: 'Επεξεργασία' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Διαγραφή' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Επαναφορά στις εργασίες' })[0]);
    await waitFor(() => expect(mockReopenTask).toHaveBeenCalledWith('task-1'));
  });
});
