import { moneyLedgerCsv } from './moneyExport';
import type { FinancialTransaction } from '../services/financialTransactionService';

const row = (patch: Partial<FinancialTransaction>): FinancialTransaction =>
  ({
    id: 'tx-1',
    ownerUserId: 'owner',
    type: 'expense',
    typeLabel: 'Expense',
    status: 'posted',
    statusLabel: 'Posted',
    amount: 12.5,
    currency: 'EUR',
    occurredOn: '2026-03-02T00:00:00',
    resultYear: 2026,
    fieldId: 'field-1',
    category: 'labor',
    categoryLabel: 'Labor',
    description: 'Pruning, "north"',
    sourceType: 'manual',
    sourceTypeLabel: 'Manual',
    attachmentIds: [],
    createdByUserId: 'owner',
    createdAt: '2026-03-02T00:00:00Z',
    updatedAt: '2026-03-02T00:00:00Z',
    ...patch,
  }) as FinancialTransaction;

describe('moneyLedgerCsv', () => {
  it('quotes fields and uses the friendly field name', () => {
    const csv = moneyLedgerCsv({
      rows: [row({})],
      fieldNames: { 'field-1': 'Olive Field - ΦΙΛΙΑΤΡΩΝ - 088' },
      unassignedLabel: 'No field',
    });
    expect(csv.split('\n')[0]).toContain('date');
    expect(csv).toContain('"Pruning, ""north"""');
    expect(csv).toContain('ΦΙΛΙΑΤΡΩΝ · 088');
    expect(csv).toContain('12.50');
  });
});
