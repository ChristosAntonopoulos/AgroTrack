import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import MoneyPage from './MoneyPage';
import type { YearFinancialSummary } from '../services/financialSummaryService';
import type { Field } from '../services/fieldService';
import type { FinancialTransaction } from '../services/financialTransactionService';

const mockGetYear = jest.fn();
const mockList = jest.fn();
const mockGetFields = jest.fn();
const mockSetSearchParams = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    useSearchParams: () => [new URLSearchParams({ year: '2026' }), mockSetSearchParams],
    Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  }),
  { virtual: true }
);

jest.mock('../components/Layout/Breadcrumbs', () => () => null);

jest.mock('../services/serviceFactory', () => ({
  getFieldService: () => ({ getFields: (...args: unknown[]) => mockGetFields(...args) }),
  getFinancialSummaryService: () => ({ getYear: (...args: unknown[]) => mockGetYear(...args) }),
  getFinancialTransactionService: () => ({
    list: (...args: unknown[]) => mockList(...args),
    void: jest.fn(),
    post: jest.fn(),
    deleteDraft: jest.fn(),
  }),
  getFieldWorkService: () => ({ getFieldTask: jest.fn() }),
  getHarvestService: () => ({ listByField: jest.fn() }),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'owner-1', role: 'FieldOwner' } }),
}));

jest.mock('../context/ExperienceModeContext', () => ({
  useExperienceMode: () => ({ isFullPicture: false, isEveryday: true }),
}));

jest.mock('../context/OfflineContext', () => ({
  useOfflineMode: () => ({ refreshGeneration: 0, setShowingCachedData: jest.fn() }),
}));

jest.mock('../context/CaptureContext', () => ({
  useCaptureOptional: () => ({ openCapture: jest.fn() }),
}));

const field: Field = {
  id: 'field-1',
  ownerId: 'owner-1',
  name: 'Κάτω χωράφι',
  area: 1,
  irrigationStatus: false,
  currentLifecycleYear: '2026',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  status: 'Active',
};

const emptyMonths = Array.from({ length: 12 }, (_, index) => ({
  month: index + 1,
  income: null,
  expenses: null,
  netResult: null,
  hasRecords: false,
  emptyLabel: 'Καμία καταχώρηση',
}));

const emptySummary = (overrides?: Partial<YearFinancialSummary>): YearFinancialSummary => ({
  year: 2026,
  currency: 'EUR',
  totalIncome: null,
  totalExpenses: null,
  netResult: null,
  resultLabel: 'Δεν υπάρχουν ακόμη καταχωρήσεις',
  transactionCount: 0,
  draftCount: 0,
  monthlyResults: emptyMonths,
  fieldResults: [],
  incomeByCategory: [],
  expenseByCategory: [],
  costPerHectare: null,
  incomePerHectare: null,
  netPerHectare: null,
  costPerKilogramOfOil: null,
  dataAvailability: {
    hasPostedRecords: false,
    hasDraftRecords: false,
    incomeIsUnknown: true,
    expensesAreUnknown: true,
    areaIsMissing: true,
    oilQuantityIsMissing: true,
    includesUnassigned: false,
  },
  ...overrides,
});

const renderPage = async () => {
  await i18n.changeLanguage('el');
  return render(
    <I18nextProvider i18n={i18n}>
      <MoneyPage />
    </I18nextProvider>
  );
};

describe('MoneyPage', () => {
  beforeEach(() => {
    mockGetFields.mockResolvedValue([field]);
    mockList.mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 50 });
  });

  it('shows the empty-year Greek state without charts or zero totals', async () => {
    mockGetYear.mockResolvedValue(emptySummary());
    await renderPage();
    expect(await screen.findByText('Δεν έχεις καταχωρήσει χρήματα για το 2026')).toBeInTheDocument();
    expect(screen.getByText(/Ξεκίνα με ένα έσοδο ή ένα έξοδο/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Καταχώρηση χρημάτων' })).toBeInTheDocument();
    expect(screen.queryByText('Ανά μήνα')).not.toBeInTheDocument();
    expect(screen.queryByText('Έξοδα ανά κατηγορία')).not.toBeInTheDocument();
    expect(screen.queryByText(/0,00/)).not.toBeInTheDocument();
    expect(screen.queryByText('€0.00')).not.toBeInTheDocument();
  });

  it('renders API null totals as unknown text, not €0', async () => {
    mockGetYear.mockResolvedValue(
      emptySummary({
        draftCount: 1,
        dataAvailability: {
          hasPostedRecords: false,
          hasDraftRecords: true,
          incomeIsUnknown: true,
          expensesAreUnknown: true,
          areaIsMissing: true,
          oilQuantityIsMissing: true,
          includesUnassigned: false,
        },
      })
    );
    mockList.mockResolvedValue({
      items: [
        {
          id: 'draft-1',
          ownerUserId: 'owner-1',
          type: 'expense',
          typeLabel: 'Έξοδο',
          status: 'draft',
          statusLabel: 'Πρόχειρο',
          amount: 45,
          currency: 'EUR',
          occurredOn: '2026-03-10T00:00:00',
          resultYear: 2026,
          fieldId: 'field-1',
          description: 'Εργάτες',
          sourceType: 'manual',
          sourceTypeLabel: 'Χειροκίνητη καταχώρηση',
          attachmentIds: [],
          createdByUserId: 'owner-1',
          createdAt: '2026-03-10T00:00:00Z',
          updatedAt: '2026-03-10T00:00:00Z',
        } satisfies FinancialTransaction,
      ],
      totalCount: 1,
      page: 1,
      pageSize: 50,
    });
    await renderPage();
    const unknowns = await screen.findAllByText('Δεν υπάρχουν ακόμη καταχωρήσεις');
    expect(unknowns.length).toBeGreaterThan(0);
    expect(screen.queryByText(/€0/)).not.toBeInTheDocument();
    expect(screen.getByText('Εργάτες')).toBeInTheDocument();
  });

  it('renders official totals from the summary API without summing in the page', async () => {
    mockGetYear.mockResolvedValue(
      emptySummary({
        totalIncome: 100,
        totalExpenses: 40,
        netResult: 999,
        resultLabel: 'Κέρδος',
        transactionCount: 2,
        fieldResults: [
          {
            fieldId: 'field-1',
            fieldName: 'Κάτω χωράφι',
            isUnassigned: false,
            income: 100,
            expenses: 40,
            netResult: 999,
            costPerHectare: null,
            incomePerHectare: null,
            netPerHectare: null,
            transactionCount: 2,
          },
        ],
        monthlyResults: emptyMonths.map((month, index) =>
          index === 2
            ? { ...month, hasRecords: true, income: 100, expenses: 40, netResult: 999, emptyLabel: '' }
            : month
        ),
        expenseByCategory: [
          { category: 'labor', categoryLabel: 'Εργασία', amount: 40, percentageOfTotal: 100 },
        ],
        dataAvailability: {
          hasPostedRecords: true,
          hasDraftRecords: false,
          incomeIsUnknown: false,
          expensesAreUnknown: false,
          areaIsMissing: true,
          oilQuantityIsMissing: true,
          includesUnassigned: false,
        },
      })
    );
    await renderPage();
    expect(await screen.findByText('Κέρδος')).toBeInTheDocument();
    expect(screen.getByText('Εργασία')).toBeInTheDocument();
    expect(screen.getAllByText(/999,00/).length).toBeGreaterThan(0);
    expect(screen.queryByText('60,00')).not.toBeInTheDocument();
    expect(screen.queryByText('labor')).not.toBeInTheDocument();
  });
});
