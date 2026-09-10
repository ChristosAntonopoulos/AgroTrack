import { UNASSIGNED_FIELD_QUERY } from '../finance/buildYearSummary';
import api from './api';

export interface MonthlyFinancialResult {
  month: number;
  income: number | null;
  expenses: number | null;
  netResult: number | null;
  hasRecords: boolean;
  emptyLabel: string;
}

export interface FieldFinancialResult {
  fieldId?: string | null;
  fieldName: string;
  isUnassigned: boolean;
  income: number | null;
  expenses: number | null;
  netResult: number | null;
  costPerHectare: number | null;
  incomePerHectare: number | null;
  netPerHectare: number | null;
  transactionCount: number;
}

export interface CategoryFinancialResult {
  category: string;
  categoryLabel: string;
  amount: number;
  percentageOfTotal: number | null;
}

export interface FinancialDataAvailability {
  hasPostedRecords: boolean;
  hasDraftRecords: boolean;
  incomeIsUnknown: boolean;
  expensesAreUnknown: boolean;
  areaIsMissing: boolean;
  oilQuantityIsMissing: boolean;
  includesUnassigned: boolean;
}

export interface YearFinancialSummary {
  year: number;
  currency: string;
  fieldId?: string | null;
  totalIncome: number | null;
  totalExpenses: number | null;
  netResult: number | null;
  resultLabel: string;
  transactionCount: number;
  draftCount: number;
  lastPostedAt?: string | null;
  monthlyResults: MonthlyFinancialResult[];
  fieldResults: FieldFinancialResult[];
  incomeByCategory: CategoryFinancialResult[];
  expenseByCategory: CategoryFinancialResult[];
  costPerHectare: number | null;
  incomePerHectare: number | null;
  netPerHectare: number | null;
  costPerKilogramOfOil: number | null;
  costPerKilogramMessage?: string | null;
  oliveOil?: {
    producedLitres: number | null;
    producedLitresAreEstimated: boolean;
    soldLitres: number | null;
    remainingLitres: number | null;
    remainingIsConfirmed: boolean;
    averageSalePricePerLitre: number | null;
    productionCostPerLitre: number | null;
    resultPerLitre: number | null;
    postedOliveOilSaleCount: number;
    postedOliveOilSalesMissingLitres: number;
    hasProductionOrSales: boolean;
    productionCostMessage?: string | null;
    averagePriceMessage?: string | null;
    remainingMessage?: string | null;
  } | null;
  dataAvailability: FinancialDataAvailability;
}

export const financialSummaryService = {
  getYear: async (year: number, fieldId?: string, language?: string): Promise<YearFinancialSummary> => {
    const scopedFieldId = fieldId && fieldId !== UNASSIGNED_FIELD_QUERY ? fieldId : undefined;
    const response = await api.get<YearFinancialSummary>(`/api/v1/financial-summary/year/${year}`, {
      params: { fieldId: scopedFieldId, language },
    });
    return response.data;
  },
};
