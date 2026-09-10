import { buildYearSummaryFromTransactions } from './buildYearSummary';
import type { FinancialTransaction } from '../services/financialTransactionService';

const tx = (
  partial: Partial<FinancialTransaction> & Pick<FinancialTransaction, 'id' | 'type' | 'status' | 'amount'>
): FinancialTransaction => ({
  ownerUserId: 'owner-1',
  typeLabel: partial.type,
  statusLabel: partial.status,
  currency: 'EUR',
  occurredOn: '2026-03-10T00:00:00',
  resultYear: 2026,
  fieldId: 'field-1',
  description: 'Test',
  sourceType: 'manual',
  sourceTypeLabel: 'Manual',
  attachmentIds: [],
  createdByUserId: 'owner-1',
  createdAt: '2026-03-10T00:00:00Z',
  updatedAt: '2026-03-10T00:00:00Z',
  ...partial,
});

describe('buildYearSummaryFromTransactions', () => {
  it('keeps official totals unknown when there are no posted records', () => {
    const summary = buildYearSummaryFromTransactions(2026, [
      tx({ id: 'd1', type: 'expense', status: 'draft', amount: 80 }),
      tx({ id: 'v1', type: 'income', status: 'void', amount: 500 }),
    ]);
    expect(summary.totalIncome).toBeNull();
    expect(summary.totalExpenses).toBeNull();
    expect(summary.netResult).toBeNull();
    expect(summary.transactionCount).toBe(0);
    expect(summary.draftCount).toBe(1);
    expect(summary.resultLabel).toBe('Δεν υπάρχουν ακόμη καταχωρήσεις');
  });

  it('sums only posted records and uses Greek result labels', () => {
    const summary = buildYearSummaryFromTransactions(2026, [
      tx({ id: 'i1', type: 'income', status: 'posted', amount: 100, category: 'olive_oil_sale' }),
      tx({ id: 'e1', type: 'expense', status: 'posted', amount: 40, category: 'labor' }),
      tx({ id: 'd1', type: 'expense', status: 'draft', amount: 999, category: 'fuel_and_energy' }),
    ]);
    expect(summary.totalIncome).toBe(100);
    expect(summary.totalExpenses).toBe(40);
    expect(summary.netResult).toBe(60);
    expect(summary.resultLabel).toBe('Κέρδος');
    expect(summary.expenseByCategory[0].categoryLabel).toBe('Εργασία');
    expect(summary.monthlyResults).toHaveLength(12);
    expect(summary.monthlyResults[2].hasRecords).toBe(true);
    expect(summary.monthlyResults[0].emptyLabel).toBe('Καμία καταχώρηση');
  });
});
