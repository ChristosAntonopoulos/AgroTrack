import type {
  ChronologioEntry,
  ChronologioFilters,
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
  ChronologioSummaryFilters,
} from '../chronologioService';

const emptyYears: ChronologioPeriodSummary[] = [];
const emptyMonths: ChronologioMonthSummary[] = [];

/** Mock returns empty living-timeline data — do not invent agricultural history. */
export const mockChronologioService = {
  getFieldChronologio: async (
    _fieldId: string,
    _filters?: ChronologioFilters
  ): Promise<ChronologioEntry[]> => [],

  getMyChronologio: async (_filters?: ChronologioFilters): Promise<ChronologioEntry[]> => [],

  getFieldYearSummaries: async (
    _fieldId: string,
    _filters?: ChronologioSummaryFilters
  ): Promise<ChronologioPeriodSummary[]> => emptyYears,

  getMyYearSummaries: async (
    _filters?: ChronologioSummaryFilters
  ): Promise<ChronologioPeriodSummary[]> => emptyYears,

  getFieldMonthSummaries: async (
    _fieldId: string,
    _filters?: ChronologioSummaryFilters
  ): Promise<ChronologioMonthSummary[]> => emptyMonths,

  getMyMonthSummaries: async (
    _filters?: ChronologioSummaryFilters
  ): Promise<ChronologioMonthSummary[]> => emptyMonths,
};
