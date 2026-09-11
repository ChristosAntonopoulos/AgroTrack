import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import TaskFormPage from './TaskFormPage';
import type { Field } from '../services/fieldService';
import type { TaskProposal } from '../services/fieldWorkService';

const mockGetFields = jest.fn();
const mockCreateFieldTask = jest.fn();
const mockAcceptProposal = jest.fn();
const mockGetPeople = jest.fn();
const mockGetContacts = jest.fn();
const mockGetFieldWeather = jest.fn();
const mockNavigate = jest.fn();

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
        const [params] = ReactLib.useState(() => new URLSearchParams(mockSearchState.initial));
        return [params, jest.fn()];
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
    createFieldTask: (...args: unknown[]) => mockCreateFieldTask(...args),
    acceptProposal: (...args: unknown[]) => mockAcceptProposal(...args),
    getWorkProfile: jest.fn().mockResolvedValue(null),
  }),
  getFieldService: () => ({ getFields: (...args: unknown[]) => mockGetFields(...args) }),
  getPartnerService: () => ({ getContacts: (...args: unknown[]) => mockGetContacts(...args) }),
}));

jest.mock('../services/fieldPeopleService', () => ({
  fieldPeopleService: {
    getPeople: (...args: unknown[]) => mockGetPeople(...args),
  },
}));

jest.mock('../services/weatherService', () => ({
  weatherService: {
    getFieldWeather: (...args: unknown[]) => mockGetFieldWeather(...args),
  },
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'owner-1', firstName: 'Μαρία', role: 'FieldOwner' } }),
}));

const field = (id: string, name: string): Field => ({
  id,
  ownerId: 'owner-1',
  name,
  area: 1.2,
  locationText: 'Φιλιατρά',
  irrigationStatus: false,
  currentLifecycleYear: '2026',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  status: 'Active',
});

const proposal = (overrides: Partial<TaskProposal> = {}): TaskProposal => ({
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

const renderForm = (query = '') => {
  mockSearchState.initial = query;
  mockSearchState.current = new URLSearchParams(query);
  return render(
    <I18nextProvider i18n={i18n}>
      <TaskFormPage />
    </I18nextProvider>
  );
};

describe('TaskFormPage Phase 4', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('el');
    mockSearchState.initial = '';
    sessionStorage.clear();
    mockNavigate.mockReset();
    mockCreateFieldTask.mockReset();
    mockAcceptProposal.mockReset();
    mockGetFields.mockResolvedValue([
      field('field-1', 'Κτήμα Φιλιατρών'),
      field('field-2', 'Κάτω χωράφι'),
    ]);
    mockGetPeople.mockResolvedValue([]);
    mockGetContacts.mockResolvedValue([]);
    mockGetFieldWeather.mockRejectedValue(new Error('no weather'));
    mockCreateFieldTask.mockResolvedValue({
      id: 'created-1',
      resultYear: 2026,
      fieldId: 'field-1',
      title: 'Κλάδεμα των ξερών κλαδιών',
    });
    mockAcceptProposal.mockResolvedValue({
      id: 'p-1',
      acceptedTaskId: 'accepted-1',
    });
  });

  it('shows only the four primary inputs on a manual form', async () => {
    renderForm();

    expect(await screen.findByRole('heading', { name: 'Νέα εργασία' })).toBeInTheDocument();
    expect(screen.getByText('Τι θέλεις να γίνει και πότε;')).toBeInTheDocument();
    expect(screen.getByLabelText('Τι χρειάζεται να γίνει;')).toBeInTheDocument();
    expect(screen.getByText('Σε ποιο χωράφι;')).toBeInTheDocument();
    expect(screen.getByText('Πότε θέλεις να γίνει;')).toBeInTheDocument();
    expect(screen.getByText('Ποιος θα το κάνει;')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Δημιουργία εργασίας' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Εκτιμώμενο κόστος')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Χρονιά αποτελέσματος')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Πρότυπο/)).not.toBeInTheDocument();
    expect(document.querySelector('input[type="datetime-local"]')).not.toBeInTheDocument();
    expect(screen.queryByText(/T0\d/)).not.toBeInTheDocument();
  });

  it('defaults assignee to me and opens people dropdown when requested', async () => {
    mockGetPeople.mockResolvedValue([
      {
        userId: 'partner-1',
        displayName: 'Κώστας',
        capacities: ['work'],
        status: 'Active',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);
    mockGetContacts.mockResolvedValue([
      {
        id: 'c-1',
        displayName: 'Θείος Νίκος',
        phone: '6900000000',
        serviceCategoryIds: [],
        fieldIds: ['field-1'],
        source: 'Manual',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]);
    renderForm('fieldId=field-1');

    expect(await screen.findByRole('radio', { name: 'Εγώ' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/Θα την κάνεις εσύ/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Κάποιος άλλος' }));
    const select = await screen.findByLabelText('Κάποιος άλλος');
    expect(select).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: /Κώστας/ })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: /Θείος Νίκος/ })).toBeInTheDocument();
  });

  it('explains why the action is disabled until a date is chosen', async () => {
    renderForm();
    const title = await screen.findByLabelText('Τι χρειάζεται να γίνει;');
    await userEvent.type(title, 'Κλάδεμα των ξερών κλαδιών');

    const reason = screen.getByText('Επίλεξε ημερομηνία ή «Δεν έχω αποφασίσει».');
    expect(reason).toHaveAttribute('id', 'task-form-disabled-reason');
    const submit = screen.getByRole('button', { name: 'Δημιουργία εργασίας' });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-describedby', 'task-form-disabled-reason');
    expect(screen.getByLabelText('Τι χρειάζεται να γίνει;')).toHaveAttribute('aria-invalid', 'false');
  });

  it('creates a single-day task without an end date and returns to Planned', async () => {
    renderForm();
    await screen.findByLabelText('Τι χρειάζεται να γίνει;');
    await userEvent.type(screen.getByLabelText('Τι χρειάζεται να γίνει;'), 'Κλάδεμα των ξερών κλαδιών');
    await userEvent.click(screen.getByRole('button', { name: 'Σήμερα' }));
    await userEvent.click(screen.getByRole('button', { name: 'Δημιουργία εργασίας' }));

    await waitFor(() => {
      expect(mockCreateFieldTask).toHaveBeenCalled();
    });
    const input = mockCreateFieldTask.mock.calls[0][0];
    expect(input.plannedEnd).toBeUndefined();
    expect(input.plannedStart).toMatch(/^20\d{2}-\d{2}-\d{2}T/);
    expect(input.title).toBe('Κλάδεμα των ξερών κλαδιών');
    expect(input.templateCode).toBeUndefined();
    expect(input.assignedUserId).toBe('owner-1');
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringMatching(/^\/tasks\?view=planned&year=\d{4}&field=field-1&created=created-1$/)
    );
  });

  it('keeps proposal context and schedules via acceptProposal', async () => {
    sessionStorage.setItem('oleachron.scheduleProposal.v1', JSON.stringify(proposal()));
    renderForm('proposalId=p-1&fieldId=field-1');

    expect(await screen.findByRole('heading', { name: 'Προγραμματισμός εργασίας' })).toBeInTheDocument();
    expect(screen.getByText(/Έλεγχος παγίδων δάκου · Κτήμα Φιλιατρών/)).toBeInTheDocument();
    expect(
      screen.getByText('Δεν έχει καταγραφεί έλεγχος παγίδων τις τελευταίες 7 ημέρες.')
    ).toBeInTheDocument();
    expect(screen.getAllByText(/1 Ιουν – 14 Ιουν 2026/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Τι είδους εργασία είναι;')).not.toBeInTheDocument();
    expect(screen.queryByText(/T14/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Προγραμματισμός' }));
    await waitFor(() => {
      expect(mockAcceptProposal).toHaveBeenCalledWith(
        'p-1',
        expect.objectContaining({
          plannedStart: '2026-06-01T00:00:00.000Z',
        })
      );
    });
    expect(mockCreateFieldTask).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      '/tasks?view=planned&year=2026&field=field-1&created=accepted-1'
    );
  });

  it('shows a Greek date picker, not a numeric browser date', async () => {
    renderForm();
    await screen.findByText('Πότε θέλεις να γίνει;');
    await userEvent.click(screen.getByRole('button', { name: 'Επιλογή ημερομηνίας' }));

    const calendar = screen.getByRole('group', { name: 'Επιλογή ημερομηνίας' });
    expect(calendar).toBeInTheDocument();
    expect(screen.getByText('Δε')).toBeInTheDocument();
    expect(document.querySelector('input[type="date"]')).not.toBeInTheDocument();
    expect(document.querySelector('input[type="datetime-local"]')).not.toBeInTheDocument();

    await userEvent.click(within(calendar).getByRole('button', { name: /10 \S+ 20\d{2}/ }));
    expect(screen.getByText(/10 \S+ 20\d{2}/)).toBeInTheDocument();
    expect(screen.queryByText(/\d{1,2}\/\d{1,2}\/\d{4}/)).not.toBeInTheDocument();
  });

  it('derives result year and only offers an override when harvest years cross', async () => {
    sessionStorage.setItem(
      'oleachron.scheduleProposal.v1',
      JSON.stringify(
        proposal({
          recommendedWindowStart: '2027-01-05',
          recommendedWindowEnd: '2027-01-05',
        })
      )
    );
    renderForm('proposalId=p-1&fieldId=field-1');
    await screen.findByRole('heading', { name: 'Προγραμματισμός εργασίας' });

    expect(screen.queryByLabelText('Χρονιά αποτελέσματος')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+ Περισσότερες λεπτομέρειες' }));
    const year = await screen.findByLabelText('Χρονιά αποτελέσματος');
    expect(year).toHaveValue('2026');
    expect(within(year).getByRole('option', { name: '2027' })).toBeInTheDocument();
    expect(screen.getByText(/προηγούμενη συγκομιδή/)).toBeInTheDocument();
  });

  it('keeps advanced details collapsed and shows a euro suffix on cost', async () => {
    renderForm();
    await screen.findByRole('button', { name: '+ Περισσότερες λεπτομέρειες' });
    expect(screen.queryByLabelText('Εκτιμώμενο κόστος')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '+ Περισσότερες λεπτομέρειες' }));
    expect(screen.getByLabelText('Εκτιμώμενο κόστος')).toBeInTheDocument();
    expect(screen.getByText('€')).toBeInTheDocument();
    expect(screen.getByText(/μόνο εκτίμηση/i)).toBeInTheDocument();
  });

  it('exposes sticky mobile actions', async () => {
    renderForm();
    const actions = await screen.findByRole('button', { name: 'Δημιουργία εργασίας' });
    expect(actions.closest('.task-form-actions')).toBeInTheDocument();
  });

  it('announces a save error and associates it with the title', async () => {
    mockCreateFieldTask.mockRejectedValueOnce(new Error('network'));
    renderForm();
    await screen.findByLabelText('Τι χρειάζεται να γίνει;');
    await userEvent.type(screen.getByLabelText('Τι χρειάζεται να γίνει;'), 'Κλάδεμα των ξερών κλαδιών');
    await userEvent.click(screen.getByRole('button', { name: 'Σήμερα' }));
    await userEvent.click(screen.getByRole('button', { name: 'Δημιουργία εργασίας' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('id', 'task-form-error');
    expect(screen.getByLabelText('Τι χρειάζεται να γίνει;')).toHaveAttribute(
      'aria-describedby',
      'task-form-error'
    );
  });
});
