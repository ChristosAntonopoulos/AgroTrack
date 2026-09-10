import { buildYearSummaryFromTransactions, UNASSIGNED_FIELD_QUERY } from '../finance/buildYearSummary';
import type { YearFinancialSummary } from './financialSummaryService';
import { listMockFinancialTransactions } from './mockFinancialTransactionService';

export const mockFinancialSummaryService = {
  getYear: async (year: number, fieldId?: string, language?: string): Promise<YearFinancialSummary> => {
    return buildYearSummaryFromTransactions(year, listMockFinancialTransactions(), {
      fieldId: fieldId && fieldId !== UNASSIGNED_FIELD_QUERY ? fieldId : undefined,
      unassignedOnly: fieldId === UNASSIGNED_FIELD_QUERY,
      language,
    });
  },
};
