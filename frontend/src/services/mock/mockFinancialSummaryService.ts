import { buildYearSummaryFromTransactions, UNASSIGNED_FIELD_QUERY } from '../../finance/buildYearSummary';
import type {
  FieldYearSummary,
  HarvestFinancialSummary,
  TaskFinancialSummary,
  YearFinancialSummary,
} from '../financialSummaryService';
import { listMockFinancialTransactions } from './mockFinancialTransactionService';
import { mockFieldWorkService } from './mockFieldWorkService';

const posted = () => listMockFinancialTransactions().filter((row) => row.status === 'posted');

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const noIncomeMessage = (language?: string) =>
  (language || 'el').toLowerCase().startsWith('en')
    ? 'No income has been recorded yet'
    : 'Δεν έχει καταχωρηθεί ακόμη έσοδο';

export const mockFinancialSummaryService = {
  getYear: async (year: number, fieldId?: string, language?: string): Promise<YearFinancialSummary> => {
    return buildYearSummaryFromTransactions(year, listMockFinancialTransactions(), {
      fieldId: fieldId && fieldId !== UNASSIGNED_FIELD_QUERY ? fieldId : undefined,
      unassignedOnly: fieldId === UNASSIGNED_FIELD_QUERY,
      language,
    });
  },

  getTaskSummary: async (taskId: string): Promise<TaskFinancialSummary> => {
    const tasks = await mockFieldWorkService.listFieldTasks();
    const task = tasks.find((item) => item.id === taskId);
    const expenses = posted().filter((row) => row.relatedTaskId === taskId && row.type === 'expense');
    const actual = expenses.length ? roundMoney(expenses.reduce((sum, row) => sum + row.amount, 0)) : null;
    const estimated = task?.estimatedCost ?? null;
    return {
      taskId,
      fieldId: task?.fieldId || expenses[0]?.fieldId || '',
      estimatedCost: estimated,
      actualCost: actual,
      difference: estimated != null && actual != null ? roundMoney(actual - estimated) : null,
      transactionCount: expenses.length,
      dataAvailability: {
        hasPostedRecords: expenses.length > 0,
        hasDraftRecords: false,
        incomeIsUnknown: true,
        expensesAreUnknown: expenses.length === 0,
        areaIsMissing: false,
        oilQuantityIsMissing: false,
        includesUnassigned: false,
      },
    };
  },

  getHarvestSummary: async (
    harvestId: string,
    language?: string
  ): Promise<HarvestFinancialSummary> => {
    const linked = posted().filter((row) => row.relatedHarvestId === harvestId);
    const incomeRows = linked.filter((row) => row.type === 'income');
    const expenseRows = linked.filter((row) => row.type === 'expense');
    const income = incomeRows.length
      ? roundMoney(incomeRows.reduce((sum, row) => sum + row.amount, 0))
      : null;
    const expenses = expenseRows.length
      ? roundMoney(expenseRows.reduce((sum, row) => sum + row.amount, 0))
      : null;
    return {
      harvestId,
      fieldId: linked[0]?.fieldId || '',
      income,
      expenses,
      netResult: income != null ? roundMoney(income - (expenses ?? 0)) : null,
      hasRecordedIncome: incomeRows.length > 0,
      hasRecordedExpenses: expenseRows.length > 0,
      incomeMessage: incomeRows.length ? null : noIncomeMessage(language),
      transactionCount: linked.length,
      dataAvailability: {
        hasPostedRecords: linked.length > 0,
        hasDraftRecords: false,
        incomeIsUnknown: incomeRows.length === 0,
        expensesAreUnknown: expenseRows.length === 0,
        areaIsMissing: false,
        oilQuantityIsMissing: false,
        includesUnassigned: false,
      },
    };
  },

  getFieldYear: async (
    fieldId: string,
    year: number,
    language?: string
  ): Promise<FieldYearSummary> => {
    const yearSummary = await mockFinancialSummaryService.getYear(year, fieldId, language);
    return {
      fieldId,
      fieldName: yearSummary.fieldResults[0]?.fieldName || fieldId,
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
      postedTransactionCount: yearSummary.transactionCount,
      draftTransactionCount: yearSummary.draftCount,
      completedExecutionCount: 0,
      partialExecutionCount: 0,
      confirmedHarvestCount: 0,
      phenologyObservationCount: 0,
      weatherReviewCount: 0,
      activeOfficialWarningCount: 0,
      dataAvailability: yearSummary.dataAvailability,
    };
  },
};
