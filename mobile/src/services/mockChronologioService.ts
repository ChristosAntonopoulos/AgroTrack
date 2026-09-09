import type {
  ChronologioEntry,
  ChronologioFilters,
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
  ChronologioSummaryFilters,
} from './chronologioService';

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
  ): Promise<ChronologioPeriodSummary[]> => [],

  getMyYearSummaries: async (
    _filters?: ChronologioSummaryFilters
  ): Promise<ChronologioPeriodSummary[]> => [],

  getFieldMonthSummaries: async (
    _fieldId: string,
    _filters?: ChronologioSummaryFilters
  ): Promise<ChronologioMonthSummary[]> => [],

  getMyMonthSummaries: async (
    _filters?: ChronologioSummaryFilters
  ): Promise<ChronologioMonthSummary[]> => [],
};
