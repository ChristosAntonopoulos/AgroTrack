import api from './api';

export type FieldOverviewBoundaryStatus = 'complete' | 'missing';

export interface FieldOverviewDto {
  field: {
    id: string;
    name: string;
    locationLabel: string;
    variety?: string;
    areaStremmata?: number;
    treeCount?: number;
    irrigationLabel?: string;
    boundaryStatus: FieldOverviewBoundaryStatus;
    status: string;
  };
  current: {
    lifecycleStage?: string;
    primaryAttention?: {
      label: string;
      detail: string;
      severity: 'warning' | 'info';
      href?: string;
    } | null;
    latestRecord?: {
      type: string;
      title: string;
      occurredAt: string;
      href: string;
    } | null;
  };
  production: {
    harvestOliveKg: number;
    oilProducedLitres: number;
    oilCurrentlyInCellarLitres: number;
    oilHeldLitres: number;
    hasOilEntries: boolean;
  };
  money: {
    postedIncome: number;
    postedExpense: number;
    result: number;
    currency: string;
  };
  weather: {
    headline: string;
    recommendation?: string;
    estimatedWaterNeedMm?: number;
    sourceLabel?: string;
  };
  recentHistory: Array<{
    id: string;
    type: string;
    title: string;
    summary?: string;
    occurredAt: string;
    href: string;
    amount?: number;
    currency?: string;
  }>;
  photos: Array<{
    id: string;
    url?: string;
    thumbnailUrl?: string;
    capturedAt?: string;
  }>;
  cropYear: {
    id: number;
    label: string;
  };
}

export const fieldOverviewService = {
  getOverview: async (fieldId: string, resultYear: number): Promise<FieldOverviewDto> => {
    const response = await api.get<FieldOverviewDto>(`/api/v1/fields/${fieldId}/overview`, {
      params: { resultYear },
    });
    return response.data;
  },
};

export const getFieldOverviewService = () => fieldOverviewService;
