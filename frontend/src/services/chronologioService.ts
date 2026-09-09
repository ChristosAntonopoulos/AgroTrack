import api from './api';

export type ChronologioCategory =
  | 'task'
  | 'expense'
  | 'harvest'
  | 'note'
  | 'photo'
  | 'weather'
  | 'intelligence'
  | 'activity'
  | 'collaborator'
  | 'lifecycle';

export type ChronologioImportance =
  | 'normal'
  | 'important'
  | 'warning'
  | 'critical'
  | 'positive';

export type ChronologioSourceType =
  | 'Task'
  | 'Expense'
  | 'Harvest'
  | 'Note'
  | 'Activity';

export interface ChronologioFieldRef {
  id: string;
  name: string;
}

export interface ChronologioActor {
  userId: string;
  displayName: string;
}

export interface ChronologioAmount {
  value: number;
  currency: string;
}

export interface ChronologioMedia {
  id: string;
  type: string;
  thumbnailUrl?: string;
  url?: string;
}

export interface ChronologioTaskDetails {
  taskId: string;
  taskType?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  assigneeName?: string;
}

export interface ChronologioExpenseDetails {
  expenseId: string;
  expenseCategory?: string;
  linkedTaskId?: string;
  description?: string;
}

export interface ChronologioHarvestDetails {
  harvestId: string;
  oliveKg: number;
  oilKg?: number;
  oilYieldPercent?: number;
  mill?: string;
  quality?: string;
  workers: number;
  harvestMethod?: string;
}

export interface ChronologioNoteDetails {
  noteId: string;
  bodyPreview: string;
  pinned: boolean;
}

export interface ChronologioLifecycleDetails {
  previousYear?: string;
  newYear?: string;
  previousStage?: string;
  newStage?: string;
  message?: string;
}

export interface ChronologioCollaboratorDetails {
  producerId?: string;
  requestId?: string;
  message?: string;
}

export interface ChronologioActivityDetails {
  activityType: string;
  message?: string;
  metadata?: Record<string, string>;
}

export interface ChronologioWeatherDetails {
  rainfallMm?: number;
  temperatureMin?: number;
  temperatureMax?: number;
  source?: string;
}

export interface ChronologioIntelligenceDetails {
  message?: string;
  severity?: string;
  relatedSourceIds?: string[];
  recommendation?: string;
}

export interface ChronologioDetails {
  task?: ChronologioTaskDetails;
  expense?: ChronologioExpenseDetails;
  harvest?: ChronologioHarvestDetails;
  note?: ChronologioNoteDetails;
  lifecycle?: ChronologioLifecycleDetails;
  collaborator?: ChronologioCollaboratorDetails;
  activity?: ChronologioActivityDetails;
  weather?: ChronologioWeatherDetails;
  intelligence?: ChronologioIntelligenceDetails;
}

export interface ChronologioEntryBase {
  id: string;
  fieldId: string;
  field: ChronologioFieldRef;
  cropCycleId?: string | null;
  lifecycleYear?: string | null;
  occurredAt: string;
  createdAt?: string | null;
  eventType: string;
  title: string;
  summary?: string | null;
  sourceType: ChronologioSourceType | string;
  sourceId: string;
  isSystemGenerated: boolean;
  actor?: ChronologioActor | null;
  importance: ChronologioImportance | string;
  amount?: ChronologioAmount | null;
  media: ChronologioMedia[];
  details: ChronologioDetails;
}

export type ChronologioEntry =
  | (ChronologioEntryBase & { category: 'task'; details: ChronologioDetails & { task: ChronologioTaskDetails } })
  | (ChronologioEntryBase & { category: 'expense'; details: ChronologioDetails & { expense: ChronologioExpenseDetails } })
  | (ChronologioEntryBase & { category: 'harvest'; details: ChronologioDetails & { harvest: ChronologioHarvestDetails } })
  | (ChronologioEntryBase & { category: 'note'; details: ChronologioDetails & { note: ChronologioNoteDetails } })
  | (ChronologioEntryBase & { category: 'lifecycle'; details: ChronologioDetails & { lifecycle?: ChronologioLifecycleDetails } })
  | (ChronologioEntryBase & { category: 'collaborator'; details: ChronologioDetails & { collaborator?: ChronologioCollaboratorDetails } })
  | (ChronologioEntryBase & { category: ChronologioCategory; details: ChronologioDetails });

export interface ChronologioFilters {
  from?: string;
  to?: string;
  category?: ChronologioCategory | string;
  lifecycleYear?: string;
  cropCycleId?: string;
  fieldId?: string;
  limit?: number;
  offset?: number;
}

export type ChronologioAxis = 'calendar' | 'season';

export interface ChronologioSummaryFilters {
  axis?: ChronologioAxis | string;
  category?: ChronologioCategory | string;
  fieldId?: string;
  from?: string;
  to?: string;
  year?: number;
  season?: number;
}

export interface ChronologioPeriodSummary {
  key: string;
  periodYear: number;
  axis: string;
  from: string;
  to: string;
  taskCount: number;
  expenseCount: number;
  harvestCount: number;
  noteCount: number;
  expenseTotal: number;
  currency: string;
  oliveKg: number;
  oilKg: number;
  oilYieldPercent?: number | null;
  heroMediaUrl?: string | null;
  highlightTitles: string[];
}

export interface ChronologioMonthSummary {
  key: string;
  year: number;
  month: number;
  from: string;
  to: string;
  taskCount: number;
  expenseCount: number;
  harvestCount: number;
  noteCount: number;
  expenseTotal: number;
  currency: string;
  oliveKg: number;
  oilKg: number;
  oilYieldPercent?: number | null;
  heroMediaUrl?: string | null;
  highlightTitles: string[];
}

function toParams(filters?: ChronologioFilters): Record<string, string | number> | undefined {
  if (!filters) {
    return undefined;
  }

  const params: Record<string, string | number> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.category) params.category = filters.category;
  if (filters.lifecycleYear) params.lifecycleYear = filters.lifecycleYear;
  if (filters.cropCycleId) params.cropCycleId = filters.cropCycleId;
  if (filters.fieldId) params.fieldId = filters.fieldId;
  if (filters.limit != null) params.limit = filters.limit;
  if (filters.offset != null) params.offset = filters.offset;
  return params;
}

function toSummaryParams(filters?: ChronologioSummaryFilters): Record<string, string | number> | undefined {
  if (!filters) return undefined;
  const params: Record<string, string | number> = {};
  if (filters.axis) params.axis = filters.axis;
  if (filters.category) params.category = filters.category;
  if (filters.fieldId) params.fieldId = filters.fieldId;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.year != null) params.year = filters.year;
  if (filters.season != null) params.season = filters.season;
  return params;
}

export const chronologioService = {
  getFieldChronologio: async (
    fieldId: string,
    filters?: ChronologioFilters
  ): Promise<ChronologioEntry[]> => {
    const response = await api.get<ChronologioEntry[]>(
      `/api/v1/fields/${fieldId}/chronologio`,
      { params: toParams(filters) }
    );
    return response.data;
  },

  getMyChronologio: async (filters?: ChronologioFilters): Promise<ChronologioEntry[]> => {
    const response = await api.get<ChronologioEntry[]>('/api/v1/me/chronologio', {
      params: toParams(filters),
    });
    return response.data;
  },

  getFieldYearSummaries: async (
    fieldId: string,
    filters?: ChronologioSummaryFilters
  ): Promise<ChronologioPeriodSummary[]> => {
    const response = await api.get<ChronologioPeriodSummary[]>(
      `/api/v1/fields/${fieldId}/chronologio/summaries/years`,
      { params: toSummaryParams(filters) }
    );
    return response.data;
  },

  getMyYearSummaries: async (
    filters?: ChronologioSummaryFilters
  ): Promise<ChronologioPeriodSummary[]> => {
    const response = await api.get<ChronologioPeriodSummary[]>(
      '/api/v1/me/chronologio/summaries/years',
      { params: toSummaryParams(filters) }
    );
    return response.data;
  },

  getFieldMonthSummaries: async (
    fieldId: string,
    filters?: ChronologioSummaryFilters
  ): Promise<ChronologioMonthSummary[]> => {
    const response = await api.get<ChronologioMonthSummary[]>(
      `/api/v1/fields/${fieldId}/chronologio/summaries/months`,
      { params: toSummaryParams(filters) }
    );
    return response.data;
  },

  getMyMonthSummaries: async (
    filters?: ChronologioSummaryFilters
  ): Promise<ChronologioMonthSummary[]> => {
    const response = await api.get<ChronologioMonthSummary[]>(
      '/api/v1/me/chronologio/summaries/months',
      { params: toSummaryParams(filters) }
    );
    return response.data;
  },
};
