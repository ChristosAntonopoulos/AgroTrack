import { buildYearSummaryFromTransactions, UNASSIGNED_FIELD_QUERY } from '../finance/buildYearSummary';
import type {
  FieldYearSummary,
  TaskFinancialSummary,
  YearFinancialSummary,
} from './financialSummaryService';
import { listMockFinancialTransactions } from './mockFinancialTransactionService';

const emptyAvailability = {
  hasPostedRecords: false,
  hasDraftRecords: false,
  incomeIsUnknown: true,
  expensesAreUnknown: true,
  areaIsMissing: true,
  oilQuantityIsMissing: true,
  includesUnassigned: false,
};

export const mockFinancialSummaryService = {
  getYear: async (year: number, fieldId?: string, language?: string): Promise<YearFinancialSummary> => {
    return buildYearSummaryFromTransactions(year, listMockFinancialTransactions(), {
      fieldId: fieldId && fieldId !== UNASSIGNED_FIELD_QUERY ? fieldId : undefined,
      unassignedOnly: fieldId === UNASSIGNED_FIELD_QUERY,
      language,
    });
  },

  getTaskSummary: async (taskId: string): Promise<TaskFinancialSummary> => ({
    taskId,
    fieldId: '',
    estimatedCost: null,
    actualCost: null,
    difference: null,
    transactionCount: 0,
  }),

  getFieldYear: async (
    fieldId: string,
    year: number,
    _language?: string
  ): Promise<FieldYearSummary> => {
    const yearSummary = await mockFinancialSummaryService.getYear(year, fieldId);
    return {
      fieldId,
      fieldName: '',
      resultYear: year,
      currency: yearSummary.currency,
      totalIncome: yearSummary.totalIncome,
      totalExpenses: yearSummary.totalExpenses,
      netResult: yearSummary.netResult,
      resultLabel: yearSummary.resultLabel,
      costPerKilogramOfOil: yearSummary.costPerKilogramOfOil,
      costPerKilogramMessage: yearSummary.costPerKilogramMessage,
      oilKilograms: null,
      oliveKilograms: null,
      oliveOil: yearSummary.oliveOil ?? null,
      postedTransactionCount: yearSummary.transactionCount,
      draftTransactionCount: yearSummary.draftCount,
      completedExecutionCount: 0,
      partialExecutionCount: 0,
      confirmedHarvestCount: 0,
      phenologyObservationCount: 0,
      weatherReviewCount: 0,
      activeOfficialWarningCount: 0,
      dataAvailability: yearSummary.dataAvailability || emptyAvailability,
    };
  },
};
