import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import HarvestMoneyPanel from './HarvestMoneyPanel';
import type { HarvestFinancialSummary } from '../../services/financialSummaryService';

const mockGetHarvestSummary = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  }),
  { virtual: true }
);

jest.mock('../../services/serviceFactory', () => ({
  getFinancialSummaryService: () => ({
    getHarvestSummary: (...args: unknown[]) => mockGetHarvestSummary(...args),
  }),
}));

jest.mock('../../context/CaptureContext', () => ({
  useCaptureOptional: () => ({ openCapture: jest.fn() }),
}));

const unknownIncome: HarvestFinancialSummary = {
  harvestId: 'harvest-1',
  fieldId: 'field-1',
  income: null,
  expenses: 180,
  netResult: null,
  hasRecordedIncome: false,
  hasRecordedExpenses: true,
  incomeMessage: 'Δεν έχει καταχωρηθεί ακόμη έσοδο',
  transactionCount: 1,
  dataAvailability: {
    hasPostedRecords: true,
    hasDraftRecords: false,
    incomeIsUnknown: true,
    expensesAreUnknown: false,
    areaIsMissing: false,
    oilQuantityIsMissing: false,
    includesUnassigned: false,
  },
};

test('harvest money shows unknown income, never €0 sale', async () => {
  mockGetHarvestSummary.mockResolvedValue(unknownIncome);
  await i18n.changeLanguage('el');
  render(
    <I18nextProvider i18n={i18n}>
      <HarvestMoneyPanel harvestId="harvest-1" fieldId="field-1" />
    </I18nextProvider>
  );

  await waitFor(() => {
    expect(screen.getAllByText('Δεν έχει καταχωρηθεί ακόμη έσοδο').length).toBeGreaterThan(0);
  });
  expect(screen.getByRole('button', { name: 'Καταχώρηση εσόδου' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Καταχώρηση εξόδου' })).toBeInTheDocument();
  expect(screen.queryByText('€0')).not.toBeInTheDocument();
  expect(screen.queryByText('0 €')).not.toBeInTheDocument();
});
