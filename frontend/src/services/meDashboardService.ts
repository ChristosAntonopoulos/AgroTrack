import api from './api';
import { EntityCache } from '../utils/entityCache';

export type MeDashboardPeriod = 'today' | 'week' | 'month';

export type MeDashboardTopAction =
  | 'complete_task'
  | 'add_evidence'
  | 'log_harvest'
  | 'log_expense'
  | 'contact_partner'
  | 'none';

export interface MeDashboardCounts {
  tasksCompleted: number;
  tasksStarted: number;
  evidenceAdded: number;
  harvestsRecorded: number;
  expensesLogged: number;
  contactsSent: number;
}

export interface MeDashboardSeriesPoint {
  date: string;
  total: number;
}

export interface MeDashboardPending {
  overdue: number;
  dueToday: number;
  pendingApproval: number;
}

export interface MeDashboardActivity {
  id: string;
  fieldId: string;
  type: string;
  message: string;
  actorUserId?: string | null;
  taskId?: string | null;
  timestamp: string;
  metadata?: Record<string, string> | null;
}

export interface MeDashboard {
  period: MeDashboardPeriod;
  from: string;
  to: string;
  counts: MeDashboardCounts;
  previousCounts: MeDashboardCounts;
  series: MeDashboardSeriesPoint[];
  topAction: MeDashboardTopAction;
  pending: MeDashboardPending;
  recent: MeDashboardActivity[];
}

const emptyCounts = (): MeDashboardCounts => ({
  tasksCompleted: 0,
  tasksStarted: 0,
  evidenceAdded: 0,
  harvestsRecorded: 0,
  expensesLogged: 0,
  contactsSent: 0,
});

export const emptyMeDashboard = (period: MeDashboardPeriod = 'week'): MeDashboard => {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from =
    period === 'today'
      ? today
      : period === 'month'
        ? new Date(today.getTime() - 29 * 86400000)
        : new Date(today.getTime() - 6 * 86400000);
  return {
    period,
    from: from.toISOString(),
    to: new Date(today.getTime() + 86400000).toISOString(),
    counts: emptyCounts(),
    previousCounts: emptyCounts(),
    series: [],
    topAction: 'none',
    pending: { overdue: 0, dueToday: 0, pendingApproval: 0 },
    recent: [],
  };
};

export function trendPercent(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export const meDashboardService = {
  getDashboard: async (period: MeDashboardPeriod = 'week'): Promise<MeDashboard> => {
    try {
      const response = await api.get<MeDashboard>('/api/v1/me/dashboard', {
        params: { period },
      });
      const data = normalizeDashboard(response.data, period);
      EntityCache.setOne('meDashboard', period, data);
      return data;
    } catch (error) {
      const cached = EntityCache.getOne<MeDashboard>('meDashboard', period);
      if (cached) return cached;
      throw error;
    }
  },
};

function normalizeDashboard(raw: MeDashboard, period: MeDashboardPeriod): MeDashboard {
  return {
    ...emptyMeDashboard(period),
    ...raw,
    period: (raw.period as MeDashboardPeriod) || period,
    counts: { ...emptyCounts(), ...raw.counts },
    previousCounts: { ...emptyCounts(), ...raw.previousCounts },
    pending: {
      overdue: raw.pending?.overdue ?? 0,
      dueToday: raw.pending?.dueToday ?? 0,
      pendingApproval: raw.pending?.pendingApproval ?? 0,
    },
    series: Array.isArray(raw.series) ? raw.series : [],
    recent: Array.isArray(raw.recent) ? raw.recent : [],
    topAction: raw.topAction || 'none',
  };
}
