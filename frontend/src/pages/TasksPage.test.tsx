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
    startFieldTask: jest.fn(),
    cancelFieldTask: jest.fn(),
  }),
  getFieldService: () => ({ getFields: (...args: unknown[]) => mockGetFields(...args) }),
  getPartnerService: () => ({ getContacts: (...args: unknown[]) => mockGetContacts(...args) }),
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

  it('shows only the active tab content and defaults to proposals', async () => {
    renderTasks();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Προτάσεις για τα χωράφια σου' })).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: 'Προτάσεις', selected: true })).toBeInTheDocument();
    expect(screen.getAllByText('Έλεγχος παγίδων δάκου').length).toBeGreaterThan(0);
    expect(screen.queryByText('Προκαταρκτική εκτίμηση συγκομιδής')).not.toBeInTheDocument();
    expect(screen.queryByText('Κράτηση συνεργείου')).not.toBeInTheDocument();
    expect(screen.queryByText('Προσοχή τώρα')).not.toBeInTheDocument();
    expect(document.getElementById('tasks-panel-planned')).toBeNull();
    expect(document.getElementById('tasks-panel-active')).toBeNull();
  });

  it('keeps a proposal exactly once and distinguishes different fields', async () => {
    renderTasks();

    await waitFor(() => {
      expect(screen.getAllByText('Έλεγχος παγίδων δάκου')).toHaveLength(2);
    });
    const panel = document.getElementById('tasks-panel-proposals') as HTMLElement;
    expect(within(panel).getByText('Κτήμα Φιλιατρών')).toBeInTheDocument();
    expect(within(panel).getByText('Κάτω χωράφι')).toBeInTheDocument();
    expect(screen.queryByText('Προσοχή τώρα')).not.toBeInTheDocument();
  });

  it('shows tab counts that match returned records', async () => {
    renderTasks();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Προτάσεις' })).toBeInTheDocument();
    });

    expect(within(screen.getByRole('tab', { name: 'Προτάσεις' })).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByRole('tab', { name: 'Προγραμματισμένες' })).getByText('3')).toBeInTheDocument();
    expect(within(screen.getByRole('tab', { name: 'Σε εξέλιξη' })).getByText('1')).toBeInTheDocument();
  });

  it('updates all tab counts when the field filter changes', async () => {
    renderTasks();

    await waitFor(() => {
      expect(screen.getByLabelText('Φίλτρο ανά αγροτεμάχιο')).toBeInTheDocument();
    });
    expect(screen.getByText('Φίλτρο ανά αγροτεμάχιο')).toBeVisible();

    await userEvent.selectOptions(screen.getByLabelText('Φίλτρο ανά αγροτεμάχιο'), 'field-2');

    await waitFor(() => {
      expect(within(screen.getByRole('tab', { name: 'Προτάσεις' })).getByText('1')).toBeInTheDocument();
      expect(within(screen.getByRole('tab', { name: 'Προγραμματισμένες' })).queryByText('1')).toBeNull();
      expect(within(screen.getByRole('tab', { name: 'Σε εξέλιξη' })).queryByText('1')).toBeNull();
    });
    const panel = document.getElementById('tasks-panel-proposals');
    expect(panel).not.toBeNull();
    expect(within(panel as HTMLElement).getByText('Κάτω χωράφι')).toBeInTheDocument();
    expect(within(panel as HTMLElement).queryByText('Κτήμα Φιλιατρών')).not.toBeInTheDocument();
    expect(mockSearchState.current.get('field')).toBe('field-2');
  });

  it('persists the year filter in the URL across tab changes', async () => {
    renderTasks('view=proposals&year=2025');

    await waitFor(() => {
      expect(mockListProposals).toHaveBeenCalledWith({ resultYear: 2025 });
      expect(screen.getByRole('tab', { name: 'Προγραμματισμένες' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('tab', { name: 'Προγραμματισμένες' }));

    await waitFor(() => {
      expect(mockSearchState.current.get('view')).toBe('planned');
      expect(mockSearchState.current.get('year')).toBe('2025');
    });
    expect(screen.getByLabelText('Χρονιά')).toHaveValue('2025');
    expect(screen.queryByText('Έλεγχος παγίδων δάκου')).not.toBeInTheDocument();
    expect(screen.getByText('Προκαταρκτική εκτίμηση συγκομιδής')).toBeInTheDocument();
  });

  it('does not mix completed work into future-work tabs', async () => {
    renderTasks('view=planned');

    await waitFor(() => {
      expect(screen.getByText('Προκαταρκτική εκτίμηση συγκομιδής')).toBeInTheDocument();
    });
    expect(screen.queryByText('Ολοκληρωμένο κλάδεμα')).not.toBeInTheDocument();
  });

  it('does not mix completed work into the in-progress view', async () => {
    renderTasks('view=active');

    await waitFor(() => {
      expect(screen.getByText('Κράτηση συνεργείου')).toBeInTheDocument();
    });
    expect(screen.queryByText('Ολοκληρωμένο κλάδεμα')).not.toBeInTheDocument();
    expect(screen.getByText(/Δες τις ολοκληρωμένες εργασίες στο Χρονολόγιο/)).toBeInTheDocument();
  });

  it('does not render unknown weather as a good day', async () => {
    renderTasks('view=planned');

    await waitFor(() => {
      expect(screen.getByText('Προκαταρκτική εκτίμηση συγκομιδής')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Δεν υπάρχουν αρκετά δεδομένα').length).toBeGreaterThan(0);
    expect(screen.queryByText('Καλή ημέρα')).not.toBeInTheDocument();
  });

  it('formats Greek date ranges without dropping the end year', async () => {
    renderTasks('view=planned');

    await waitFor(() => {
      expect(screen.getByText(/15 Αυγ – 1 Οκτ/)).toBeInTheDocument();
      expect(screen.queryByText('15 Αυγ – 1 Οκτ 2026')).not.toBeInTheDocument();
    });
  });

  it('renders empty states for each view', async () => {
    mockListProposals.mockResolvedValue([]);
    mockListFieldTasks.mockResolvedValue([]);

    const first = renderTasks();
    expect(await screen.findByText('Δεν υπάρχουν νέες προτάσεις')).toBeInTheDocument();
    first.unmount();

    const second = renderTasks('view=planned');
    expect(await screen.findByText('Δεν υπάρχουν προγραμματισμένες εργασίες')).toBeInTheDocument();
    second.unmount();

    renderTasks('view=active');
    expect(await screen.findByText('Καμία εργασία σε εξέλιξη')).toBeInTheDocument();
  });

  it('uses tab semantics', async () => {
    renderTasks();

    await waitFor(() => {
      expect(screen.getByRole('tablist', { name: 'Προβολές εργασιών' })).toBeInTheDocument();
    });
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: /Προτάσεις/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tasks-panel-proposals');
  });

  it('shows a specific explanation, field name and Greek period on each proposal', async () => {
    renderTasks();

    const panel = await screen.findByRole('tabpanel');
    expect(
      within(panel).getByText('Δεν έχει καταγραφεί έλεγχος παγίδων τις τελευταίες 7 ημέρες.')
    ).toBeInTheDocument();
    expect(within(panel).getByText('Η συγκομιδή αναμένεται τον Νοέμβριο.')).toBeInTheDocument();
    expect(within(panel).getByText('Κτήμα Φιλιατρών')).toBeInTheDocument();
    expect(within(panel).getByText('Κάτω χωράφι')).toBeInTheDocument();
    expect(within(panel).getAllByText('1 Ιουν – 14 Ιουν 2026').length).toBeGreaterThan(0);
    expect(within(panel).queryByText(/T14/)).not.toBeInTheDocument();
    expect(within(panel).queryByText('Καλή ημέρα')).not.toBeInTheDocument();
  });

  it('sends schedule to the form with proposal and field, without accepting immediately', async () => {
    renderTasks();
    const schedule = await screen.findAllByRole('button', { name: 'Προγραμμάτισέ την' });
    await userEvent.click(schedule[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/tasks/new?proposalId=p-1&fieldId=field-1');
    expect(JSON.parse(sessionStorage.getItem('oleachron.scheduleProposal.v1') || '{}').id).toBe('p-1');
  });

  it('exposes overflow decisions for later, dismiss, and why', async () => {
    renderTasks();
    await screen.findAllByRole('button', { name: 'Προγραμμάτισέ την' });
    await userEvent.click(screen.getAllByRole('button', { name: 'Περισσότερες ενέργειες' })[0]);

    expect(screen.getByRole('menuitem', { name: 'Θύμισέ μου αργότερα' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Δεν αφορά αυτό το χωράφι' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Όχι φέτος' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('menuitem', { name: 'Γιατί το βλέπω;' }));
    expect(await screen.findByRole('dialog', { name: 'Γιατί το βλέπω;' })).toBeInTheDocument();
    expect(screen.queryByText(/T14/)).not.toBeInTheDocument();
  });

  it('groups many proposals into decision and waiting sections', async () => {
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

    renderTasks();

    expect(await screen.findByRole('heading', { name: 'Χρειάζονται απόφαση' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Μπορούν να περιμένουν' })).toBeInTheDocument();
    expect(screen.getByText('Κλάδεμα')).toBeInTheDocument();
    expect(screen.getByText('Ανασκόπηση προηγούμενης χρονιάς')).toBeInTheDocument();
  });

  it('groups planned work and keeps rows compact', async () => {
    renderTasks('view=planned');

    expect(await screen.findByRole('heading', { name: 'Σήμερα' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Αργότερα' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Ξεκίνα' }).length).toBeGreaterThan(0);
    expect(screen.getByText('0/3 έλεγχοι')).toBeInTheDocument();
    expect(await screen.findByText('Κώστας')).toBeInTheDocument();
    expect(screen.getByText('Σε αναμονή')).toBeInTheDocument();
    expect(screen.queryByText('Προγραμματισμένη')).not.toBeInTheDocument();
    expect(screen.queryByText(/T18|T06|T15/)).not.toBeInTheDocument();
  });

  it('shows in-progress progress as a sentence and bar, not only a fraction', async () => {
    renderTasks('view=active');

    expect(await screen.findByText('Κράτηση συνεργείου')).toBeInTheDocument();
    expect(screen.getByText('3 από 5 έλεγχοι ολοκληρώθηκαν')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
    expect(screen.getByRole('button', { name: 'Συνέχισε' })).toBeInTheDocument();
    expect(screen.getByText(/Ξεκίνησε 1 Σεπ/)).toBeInTheDocument();
    expect(screen.queryByText('0/5 βασικοί έλεγχοι')).not.toBeInTheDocument();
    expect(screen.getByText(/Δες τις ολοκληρωμένες εργασίες στο Χρονολόγιο/)).toBeInTheDocument();
  });
});

