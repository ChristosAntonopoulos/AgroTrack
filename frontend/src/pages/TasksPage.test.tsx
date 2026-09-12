import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import TasksPage from './TasksPage';
import type { Field } from '../services/fieldService';
import type { FieldTask, TaskProposal } from '../services/fieldWorkService';

const mockListProposals = jest.fn();
const mockListFieldTasks = jest.fn();
const mockGetFields = jest.fn();
const mockNavigate = jest.fn();
const mockSetShowingCachedData = jest.fn();
const mockSnoozeProposal = jest.fn();
const mockDismissProposal = jest.fn();
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
  getFieldWorkService: () => ({
    listProposals: (...args: unknown[]) => mockListProposals(...args),
    listFieldTasks: (...args: unknown[]) => mockListFieldTasks(...args),
    snoozeProposal: (...args: unknown[]) => mockSnoozeProposal(...args),
    dismissProposal: (...args: unknown[]) => mockDismissProposal(...args),
    acceptProposal: jest.fn().mockResolvedValue({ acceptedTaskId: 'new-1' }),
    startFieldTask: jest.fn(),
    undoStartFieldTask: jest.fn(),
    pauseFieldTask: jest.fn(),
    resumeFieldTask: jest.fn(),
    rescheduleFieldTask: jest.fn(),
    cancelFieldTask: jest.fn(),
    getFieldTask: jest.fn(),
    assignFieldTask: jest.fn(),
    evaluateDismissalLearning: jest.fn().mockResolvedValue({ shouldPrompt: false }),
  }),
  getFieldService: () => ({ getFields: (...args: unknown[]) => mockGetFields(...args) }),
  getPartnerService: () => ({ getContacts: (...args: unknown[]) => mockGetContacts(...args) }),
  getFinancialSummaryService: () => ({ getTaskSummary: jest.fn().mockResolvedValue(null) }),
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

jest.mock('../services/weatherService', () => ({
  weatherService: {
    getFieldWeather: jest.fn().mockRejectedValue(new Error('no weather in tests')),
  },
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

const proposal = (overrides: Partial<TaskProposal>): TaskProposal => ({
  id: 'p-1',
  fieldId: 'field-1',
  resultYear: 2026,
  templateCode: 'T14',
  templateVersion: 1,
  sourceType: 'seasonal_baseline',
  sourceTypeLabel: 'Εποχική',
  generatedAt: '2026-06-01T00:00:00Z',
  confidence: 'worth_checking',
  confidenceLabel: 'Χρειάζεται έλεγχο',
  reasonCodes: ['olive_fly_weekly_check'],
  explanation: 'Δεν έχει καταγραφεί έλεγχος παγίδων τις τελευταίες 7 ημέρες.',
  greekExplanation: 'Δεν έχει καταγραφεί έλεγχος παγίδων τις τελευταίες 7 ημέρες.',
  recommendedWindowStart: '2026-06-01',
  recommendedWindowEnd: '2026-06-14',
  status: 'active',
  statusLabel: 'Πρόταση',
  ...overrides,
});

const task = (overrides: Partial<FieldTask>): FieldTask => ({
  id: 't-1',
  fieldId: 'field-1',
  resultYear: 2026,
  title: 'Προγραμματισμένη εργασία',
  status: 'planned',
  statusLabel: 'Προγραμματισμένη',
  plannedStart: '2026-08-15',
  plannedEnd: '2026-10-01',
  checklist: [],
  additionalParticipantUserIds: [],
  assignmentResponse: 'pending',
  weatherSuitability: 'unknown',
  weatherSuitabilityLabel: 'Καλή ημέρα',
  attachmentIds: [],
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

describe('TasksPage Phase 1 shell', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('el');
    mockSearchState.initial = '';
    mockSearchState.current = new URLSearchParams();
    mockSnoozeProposal.mockResolvedValue({});
    mockDismissProposal.mockResolvedValue({});
    mockGetContacts.mockResolvedValue([]);
    mockGetPeople.mockResolvedValue([
      {
        userId: 'u-kostas',
        displayName: 'Κώστας',
        capacities: ['work'],
        status: 'active',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);
    sessionStorage.clear();
    mockGetFields.mockResolvedValue([
      field('field-1', 'Κτήμα Φιλιατρών'),
      field('field-2', 'Κάτω χωράφι'),
    ]);
    mockListProposals.mockResolvedValue([
      proposal({ id: 'p-1', fieldId: 'field-1' }),
      proposal({ id: 'p-dup', fieldId: 'field-1' }),
      proposal({
        id: 'p-2',
        fieldId: 'field-2',
        explanation: 'Η συγκομιδή αναμένεται τον Νοέμβριο.',
        greekExplanation: 'Η συγκομιδή αναμένεται τον Νοέμβριο.',
      }),
    ]);
    mockListFieldTasks.mockResolvedValue([
      task({
        id: 'planned-1',
        title: 'Προκαταρκτική εκτίμηση συγκομιδής',
        status: 'planned',
        weatherSuitability: 'unknown',
        weatherSuitabilityLabel: 'Καλή ημέρα',
        assignedUserId: 'u-kostas',
        checklist: [
          {
            key: 'a',
            label: 'A',
            greekLabel: 'A',
            englishLabel: 'A',
            itemType: 'bool',
            requirement: 'required',
            isEssential: true,
            sortOrder: 1,
            isAnswered: false,
            attachmentIds: [],
            choices: [],
          },
          {
            key: 'b',
            label: 'B',
            greekLabel: 'B',
            englishLabel: 'B',
            itemType: 'bool',
            requirement: 'required',
            isEssential: true,
            sortOrder: 2,
            isAnswered: false,
            attachmentIds: [],
            choices: [],
          },
          {
            key: 'c',
            label: 'C',
            greekLabel: 'C',
            englishLabel: 'C',
            itemType: 'bool',
            requirement: 'required',
            isEssential: true,
            sortOrder: 3,
            isAnswered: false,
            attachmentIds: [],
            choices: [],
          },
        ],
      }),
      task({
        id: 'planned-later',
        title: 'Κλάδεμα',
        status: 'planned',
        plannedStart: '2026-12-01',
        plannedEnd: '2027-02-01',
      }),
      task({
        id: 'planned-blocked',
        title: 'Άρδευση',
        status: 'blocked',
        statusLabel: 'Μπλοκαρισμένη',
        plannedStart: '2026-09-10',
        plannedEnd: '2026-09-12',
      }),
      task({
        id: 'active-1',
        title: 'Κράτηση συνεργείου',
        status: 'in_progress',
        statusLabel: 'Σε εξέλιξη',
        weatherSuitability: 'good',
        weatherSuitabilityLabel: 'Καλή ημέρα',
        assignedUserId: 'u-kostas',
        startedAt: '2026-09-01T08:00:00Z',
        updatedAt: '2026-09-08T10:00:00Z',
        checklist: [
          {
            key: 'a',
            label: 'A',
            greekLabel: 'A',
            englishLabel: 'A',
            itemType: 'bool',
            requirement: 'required',
            isEssential: true,
            sortOrder: 1,
            isAnswered: true,
            attachmentIds: [],
            choices: [],
          },
          {
            key: 'b',
            label: 'B',
            greekLabel: 'B',
            englishLabel: 'B',
            itemType: 'bool',
            requirement: 'required',
            isEssential: true,
            sortOrder: 2,
            isAnswered: true,
            attachmentIds: [],
            choices: [],
          },
          {
            key: 'c',
            label: 'C',
            greekLabel: 'C',
            englishLabel: 'C',
            itemType: 'bool',
            requirement: 'required',
            isEssential: true,
            sortOrder: 3,
            isAnswered: true,
            attachmentIds: [],
            choices: [],
          },
          {
            key: 'd',
            label: 'D',
            greekLabel: 'D',
            englishLabel: 'D',
            itemType: 'bool',
            requirement: 'required',
            isEssential: true,
            sortOrder: 4,
            isAnswered: false,
            attachmentIds: [],
            choices: [],
          },
          {
            key: 'e',
            label: 'E',
            greekLabel: 'E',
            englishLabel: 'E',
            itemType: 'bool',
            requirement: 'required',
            isEssential: true,
            sortOrder: 5,
            isAnswered: false,
            attachmentIds: [],
            choices: [],
          },
        ],
      }),
      task({
        id: 'done-1',
        title: 'Ολοκληρωμένο κλάδεμα',
        status: 'completed',
        statusLabel: 'Ολοκληρώθηκε',
      }),
    ]);
  });

  it('shows only the active tab content and defaults to now', async () => {
    renderTasks();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Τώρα', selected: true })).toBeInTheDocument();
    });

    expect(document.getElementById('tasks-panel-now')).not.toBeNull();
    expect(document.getElementById('tasks-panel-proposals')).toBeNull();
  });

  it('groups identical proposals across fields on the proposals tab', async () => {
    renderTasks('view=proposals');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Προτάσεις για τα χωράφια σου' })).toBeInTheDocument();
    });
    expect(screen.getByText(/Προτείνεται για/)).toBeInTheDocument();
  });

  it('shows tab counts for the farmer workflow views', async () => {
    renderTasks();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Τώρα' })).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: 'Επόμενες' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Προτάσεις' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ιστορικό' })).toBeInTheDocument();
    expect(within(screen.getByRole('tab', { name: 'Προτάσεις' })).getByText('2')).toBeInTheDocument();
  });

  it('updates proposal count when the field filter changes', async () => {
    renderTasks('view=proposals');

    await waitFor(() => {
      expect(screen.getByLabelText('Φίλτρο ανά αγροτεμάχιο')).toBeInTheDocument();
    });

    await userEvent.selectOptions(screen.getByLabelText('Φίλτρο ανά αγροτεμάχιο'), 'field-2');

    await waitFor(() => {
      expect(within(screen.getByRole('tab', { name: 'Προτάσεις' })).getByText('1')).toBeInTheDocument();
    });
    expect(mockSearchState.current.get('field')).toBe('field-2');
  });

  it('persists the year filter in the URL across tab changes', async () => {
    renderTasks('view=proposals&year=2025');

    await waitFor(() => {
      expect(mockListProposals).toHaveBeenCalledWith({ resultYear: 2025 });
      expect(screen.getByRole('tab', { name: 'Επόμενες' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('tab', { name: 'Επόμενες' }));

    await waitFor(() => {
      expect(mockSearchState.current.get('view')).toBe('upcoming');
      expect(mockSearchState.current.get('year')).toBe('2025');
    });
  });

  it('does not mix completed work into upcoming', async () => {
    renderTasks('view=upcoming');

    await waitFor(() => {
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });
    expect(screen.queryByText('Ολοκληρωμένο κλάδεμα')).not.toBeInTheDocument();
  });

  it('shows completed work in history', async () => {
    renderTasks('view=history');

    await waitFor(() => {
      expect(screen.getByText('Ολοκληρωμένο κλάδεμα')).toBeInTheDocument();
    });
    expect(screen.getByText(/Δες το πλήρες Χρονολόγιο/)).toBeInTheDocument();
  });

  it('puts in-progress work on now', async () => {
    renderTasks('view=now');

    await waitFor(() => {
      expect(screen.getByText('Κράτηση συνεργείου')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Συνέχισε' })).toBeInTheDocument();
  });

  it('renders empty now state when there is nothing to do', async () => {
    mockListProposals.mockResolvedValue([]);
    mockListFieldTasks.mockResolvedValue([]);

    renderTasks();
    expect(await screen.findByText('Δεν χρειάζεται να κάνεις κάτι σήμερα')).toBeInTheDocument();
  });

  it('uses tab semantics with four views', async () => {
    renderTasks();

    await waitFor(() => {
      expect(screen.getByRole('tablist', { name: 'Προβολές εργασιών' })).toBeInTheDocument();
    });
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: /Τώρα/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tasks-panel-now');
  });

  it('opens schedule sheet for a grouped proposal', async () => {
    renderTasks('view=proposals');
    const schedule = await screen.findAllByRole('button', { name: 'Προγραμμάτισε' });
    await userEvent.click(schedule[0]);
    expect(await screen.findByText(/Επίλεξε χωράφια/)).toBeInTheDocument();
  });

  it('groups many proposals into priority sections', async () => {
    mockListProposals.mockResolvedValue([
      proposal({ id: 'official', sourceType: 'official_warning', reasonCodes: ['official_warning'] }),
      proposal({ id: 'weather', templateCode: 'T06', reasonCodes: [] }),
      proposal({ id: 'seasonal', templateCode: 'T14' }),
      proposal({
        id: 'info',
        templateCode: 'T01',
        confidence: 'low',
        reasonCodes: [],
        explanation: '',
        greekExplanation: '',
      }),
    ]);

    renderTasks('view=proposals');

    expect(await screen.findByRole('heading', { name: /Καλό να γίνουν τώρα/ })).toBeInTheDocument();
  });
});

