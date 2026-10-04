import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { LocaleProvider } from '../context/LocaleProvider';
import MoneyPage from './MoneyPage';

const mockGetYear = jest.fn();
const mockList = jest.fn();
const mockGetFields = jest.fn();
const mockSetSearchParams = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    useSearchParams: () => [new URLSearchParams({ year: '2026' }), mockSetSearchParams],
    useNavigate: () => jest.fn(),
    Navigate: () => null,
    Link: ({ children }: { children?: React.ReactNode }) => children,
  }),
  { virtual: true }
);

jest.mock('../components/Layout/Breadcrumbs', () => () => null);

jest.mock('../hooks/useModulePageGuard', () => ({
  useModulePageGuard: () => ({ allowed: true, loading: false }),
}));

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

jest.mock('../context/OfflineContext', () => ({
  useOfflineMode: () => ({ refreshGeneration: 0, setShowingCachedData: jest.fn() }),
}));

jest.mock('../context/CaptureContext', () => ({
  useCaptureOptional: () => ({ openCapture: jest.fn() }),
}));

const field = {
  id: 'field-1',
  ownerId: 'owner-1',
  name: 'Kato',
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
  emptyLabel: 'none',
}));

const emptySummary = (overrides = {}) => ({
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
    React.createElement(
      I18nextProvider,
      { i18n },
      React.createElement(LocaleProvider, null, React.createElement(MoneyPage))
    )
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
    expect(await screen.findByText('Δεν έχεις καταχωρήσει χρήματα για τη χρονιά συγκομιδής 2026/27')).toBeInTheDocument();
    expect(screen.getByText(/Ξεκίνα με ένα έσοδο ή ένα έξοδο/)).toBeInTheDocument();
    expect(screen.queryByText(/0,00/)).not.toBeInTheDocument();
  });

  it('keeps unit economics and categories collapsed by default', async () => {
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
            fieldName: 'Kato',
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
        costPerHectare: 100,
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
    expect(screen.getByText('Μέσα στη χρονιά συγκομιδής')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Κατηγορίες' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ανά στρέμμα και κόστος λαδιού' })).toBeInTheDocument();
    expect(screen.queryByText('Εργασία')).not.toBeInTheDocument();
    expect(screen.getAllByText(/999,00/).length).toBeGreaterThan(0);
  });
});
