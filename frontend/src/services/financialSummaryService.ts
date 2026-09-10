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

export interface OliveOilEconomics {
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
  oliveOil?: OliveOilEconomics | null;
  dataAvailability: FinancialDataAvailability;
}

export interface TaskFinancialSummary {
  taskId: string;
  fieldId: string;
  estimatedCost: number | null;
  actualCost: number | null;
  difference: number | null;
  transactionCount: number;
  dataAvailability: FinancialDataAvailability;
}

export interface HarvestFinancialSummary {
  harvestId: string;
  fieldId: string;
  income: number | null;
  expenses: number | null;
  netResult: number | null;
  hasRecordedIncome: boolean;
  hasRecordedExpenses: boolean;
  incomeMessage?: string | null;
  transactionCount: number;
  dataAvailability: FinancialDataAvailability;
}

export interface FieldYearSummary {
  fieldId: string;
  fieldName: string;
  resultYear: number;
  currency: string;
  totalIncome: number | null;
  totalExpenses: number | null;
  netResult: number | null;
  resultLabel: string;
  costPerKilogramOfOil: number | null;
  costPerKilogramMessage?: string | null;
  oilKilograms: number | null;
  oliveKilograms: number | null;
  oliveOil?: OliveOilEconomics | null;
  postedTransactionCount: number;
  draftTransactionCount: number;
  completedExecutionCount: number;
  partialExecutionCount: number;
  confirmedHarvestCount: number;
  phenologyObservationCount: number;
  weatherReviewCount: number;
  activeOfficialWarningCount: number;
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

  getTaskSummary: async (taskId: string): Promise<TaskFinancialSummary> => {
    const response = await api.get<TaskFinancialSummary>(`/api/v1/field-tasks/${taskId}/financial-summary`);
    return response.data;
  },

  getHarvestSummary: async (harvestId: string, language?: string): Promise<HarvestFinancialSummary> => {
    const response = await api.get<HarvestFinancialSummary>(
      `/api/v1/harvest-records/${harvestId}/financial-summary`,
      { params: { language } }
    );
    return response.data;
  },

  getFieldYear: async (
    fieldId: string,
    year: number,
    language?: string
  ): Promise<FieldYearSummary> => {
    const response = await api.get<FieldYearSummary>(`/api/v1/fields/${fieldId}/year/${year}/summary`, {
      params: { language },
    });
    return response.data;
  },
};
