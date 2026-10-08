import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import TasksPage from './TasksPage';
import type { Field } from '../services/fieldService';
import type { Task, TaskSuggestion } from '../services/taskService';

const mockListTasks = jest.fn();
const mockListSuggestions = jest.fn();
const mockGetFields = jest.fn();
const mockNavigate = jest.fn();
const mockSetShowingCachedData = jest.fn();
const mockCompleteTask = jest.fn();
const mockUndoComplete = jest.fn();
const mockDismissSuggestion = jest.fn();
const mockCreateTask = jest.fn();
const mockGetPeople = jest.fn();
const mockGetContacts = jest.fn();

const mockSearchState = {
  initial: '',
  current: new URLSearchParams(),
};

jest.mock(
  'react-router-dom',
  () => {
    const ReactLib = require('react');
    return {
      useNavigate: () => mockNavigate,
      useLocation: () => ({ pathname: '/tasks', search: '', hash: '', state: null, key: 'test' }),
      Navigate: () => null,
      useSearchParams: () => {
        const [params, setParams] = ReactLib.useState(
          () => new URLSearchParams(mockSearchState.initial)
        );
        const setSearchParams = (next: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams)) => {
          const resolved = typeof next === 'function' ? next(params) : next;
          const copy = new URLSearchParams(resolved);
          mockSearchState.current = copy;
          setParams(copy);
        };
        return [params, setSearchParams];
      },
      Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
        <a href={to}>{children}</a>
      ),
    };
  },
  { virtual: true }
);

jest.mock('../components/Layout/Breadcrumbs', () => () => null);

jest.mock('../services/serviceFactory', () => ({
  getTaskService: () => ({
    listTasks: (...args: unknown[]) => mockListTasks(...args),
    listSuggestions: (...args: unknown[]) => mockListSuggestions(...args),
    completeTask: (...args: unknown[]) => mockCompleteTask(...args),
    undoComplete: (...args: unknown[]) => mockUndoComplete(...args),
    dismissSuggestion: (...args: unknown[]) => mockDismissSuggestion(...args),
    createTask: (...args: unknown[]) => mockCreateTask(...args),
    skipTask: jest.fn(),
    patchTask: jest.fn(),
    createWorkRecord: jest.fn(),
  }),
  getFieldService: () => ({ getFields: (...args: unknown[]) => mockGetFields(...args) }),
  getPartnerService: () => ({ getContacts: (...args: unknown[]) => mockGetContacts(...args) }),
  getFieldWorkService: () => ({ getWorkProfile: jest.fn().mockResolvedValue(null) }),
}));

jest.mock('../services/fieldPeopleService', () => ({
  fieldPeopleService: {
    getPeople: (...args: unknown[]) => mockGetPeople(...args),
  },
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'owner-1', role: 'FieldOwner' } }),
}));

jest.mock('../context/OfflineContext', () => ({
  useOfflineMode: () => ({ refreshGeneration: 0, setShowingCachedData: mockSetShowingCachedData }),
}));

jest.mock('../hooks/useModulePageGuard', () => ({
  useModulePageGuard: () => ({ allowed: true, loading: false }),
}));

jest.mock('../hooks/useActiveFieldAccess', () => ({
  useActiveFieldAccess: () => ({
    capabilities: { canManageTasks: true },
    accessLevel: 'work',
    isAdminOnActive: true,
    isCollaboratorOnActive: false,
  }),
}));

jest.mock('../context/CapturePageContext', () => ({
  useRegisterCapturePage: () => undefined,
}));

const field = (id: string, name: string): Field => ({
  id,
  ownerId: 'owner-1',
  name,
  area: 1.2,
  irrigationStatus: false,
  currentLifecycleYear: '2026',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  status: 'Active',
});

const suggestion = (overrides: Partial<TaskSuggestion> = {}): TaskSuggestion => ({
  templateCode: 'T14',
  title: 'Έλεγχος παγίδων δάκου',
  fieldId: 'field-1',
  resultYear: 2026,
  whyNow: 'Εποχική υπενθύμιση.',
  category: 'monitoring',
  confidence: 'seasonal_reminder',
  ...overrides,
});

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 't-1',
  fieldId: 'field-1',
  resultYear: 2026,
  ownerId: 'owner-1',
  title: 'Προγραμματισμένη εργασία',
  status: 'planned',
  statusLabel: 'Προγραμματισμένη',
  source: 'custom',
  timingBucket: 'today',
  scheduledFor: '2026-10-08',
  plannedStart: '2026-10-08',
  checklist: [],
  createdByUserId: 'owner-1',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
  ...overrides,
});

const renderTasks = (query = '') => {
  mockSearchState.initial = query;
  mockSearchState.current = new URLSearchParams(query);
  return render(
    <I18nextProvider i18n={i18n}>
      <TasksPage />
    </I18nextProvider>
  );
};

describe('TasksPage Phase 2 shell', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('el');
    mockSearchState.initial = '';
    mockSearchState.current = new URLSearchParams();
    mockGetContacts.mockResolvedValue([]);
    mockGetPeople.mockResolvedValue([]);
    mockCompleteTask.mockImplementation(async (id: string) =>
      task({ id, status: 'done', completedAt: '2026-10-08T12:00:00Z' })
    );
    mockDismissSuggestion.mockResolvedValue(undefined);
    sessionStorage.clear();
    mockGetFields.mockResolvedValue([
      field('field-1', 'Κτήμα Φιλιατρών'),
      field('field-2', 'Κάτω ελαιώνας'),
    ]);
    mockListSuggestions.mockResolvedValue([suggestion()]);
    mockListTasks.mockResolvedValue([
      task({ id: 'today-1', title: 'Έλεγχος σήμερα' }),
      task({
        id: 'overdue-1',
        title: 'Καθυστερημένο πότισμα',
        scheduledFor: '2026-10-01',
        plannedStart: '2026-10-01',
        timingBucket: 'today',
      }),
    ]);
  });

  it('defaults to today with three tabs', async () => {
    renderTasks();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Σήμερα', selected: true })).toBeInTheDocument();
    });
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Επόμενες' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Έγιναν' })).toBeInTheDocument();
  });

  it('shows overdue, today and suggestions sections without counting suggestions', async () => {
    renderTasks();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Καθυστέρησαν' })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Σήμερα' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Προτάσεις για τώρα' })).toBeInTheDocument();
    expect(screen.getAllByText('Εποχική υπενθύμιση.').length).toBeGreaterThan(0);
    // Tab count reflects tasks only (2), not suggestions
    expect(screen.getByRole('tab', { name: 'Σήμερα' })).toHaveAccessibleDescription('2');
  });

  it('opens schedule sheet from the header CTA', async () => {
    renderTasks();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Προγραμμάτισε δουλειά/ })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /Προγραμμάτισε δουλειά/ }));
    expect(mockSearchState.current.get('schedule')).toBe('1');
    expect(await screen.findByText('Γράψε δική σου δουλειά')).toBeInTheDocument();
  });

  it('filters by grove from the header selector', async () => {
    renderTasks();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Κάτω ελαιώνας' })).toBeInTheDocument();
    });
    await userEvent.selectOptions(screen.getByLabelText('Ελαιώνας'), 'field-2');
    expect(mockSearchState.current.get('fieldId')).toBe('field-2');
  });

  it('marks a task done and offers undo', async () => {
    renderTasks();

    await waitFor(() => {
      expect(screen.getByText('Έλεγχος σήμερα')).toBeInTheDocument();
    });
    const checks = screen.getAllByRole('button', { name: 'Σήμανε έτοιμη' });
    await userEvent.click(checks[0]);
    await waitFor(() => {
      expect(mockCompleteTask).toHaveBeenCalled();
    });
    expect(await screen.findByText('Σημειώθηκε ως έτοιμη.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Αναίρεση' })).toBeInTheDocument();
  });

  it('shows done tasks in the done tab', async () => {
    mockListTasks.mockResolvedValue([
      task({ id: 'done-1', title: 'Ολοκληρωμένο κλάδεμα', status: 'done' }),
    ]);
    renderTasks('view=done');

    await waitFor(() => {
      expect(screen.getByText('Ολοκληρωμένο κλάδεμα')).toBeInTheDocument();
    });
    expect(screen.getByText(/Δες το πλήρες Ιστορικό/)).toBeInTheDocument();
  });

  it('does not mix suggestions into task counts on done', async () => {
    mockListTasks.mockResolvedValue([]);
    mockListSuggestions.mockResolvedValue([suggestion()]);
    renderTasks('view=done');

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Έγιναν', selected: true })).toBeInTheDocument();
    });
    expect(screen.queryByText('Προτάσεις για τώρα')).not.toBeInTheDocument();
  });
});
