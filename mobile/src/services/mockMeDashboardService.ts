import {
  emptyMeDashboard,
  MeDashboard,
  MeDashboardPeriod,
  meDashboardService,
} from './meDashboardService';

function buildMock(period: MeDashboardPeriod): MeDashboard {
  const base = emptyMeDashboard(period);
  const days = period === 'today' ? 1 : period === 'month' ? 30 : 7;
  const series = Array.from({ length: days }, (_, i) => {
    const d = new Date(base.from);
    d.setUTCDate(d.getUTCDate() + i);
    return { date: d.toISOString(), total: Math.max(0, (i % 4) + (i > 2 ? 1 : 0)) };
  });

  return {
    ...base,
    counts: {
      tasksCompleted: period === 'today' ? 1 : 4,
      tasksStarted: period === 'today' ? 1 : 3,
      evidenceAdded: period === 'today' ? 0 : 2,
      harvestsRecorded: period === 'today' ? 0 : 1,
      expensesLogged: period === 'today' ? 0 : 2,
      contactsSent: period === 'today' ? 0 : 1,
    },
    previousCounts: {
      tasksCompleted: 2,
      tasksStarted: 2,
      evidenceAdded: 1,
      harvestsRecorded: 0,
      expensesLogged: 1,
      contactsSent: 0,
    },
    series,
    topAction: 'complete_task',
    pending: { overdue: 2, dueToday: 1, pendingApproval: 1 },
    recent: [
      {
        id: 'act-1',
        fieldId: 'field-1',
        type: 'task_status_changed',
        message: "Task 'Pruning — north block' completed",
        actorUserId: 'user-1',
        taskId: 'task-1',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'act-2',
        fieldId: 'field-1',
        type: 'evidence_added',
        message: 'Evidence added to pruning task',
        actorUserId: 'user-1',
        taskId: 'task-1',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      },
    ],
  };
}

export const mockMeDashboardService: typeof meDashboardService = {
  getDashboard: async (period: MeDashboardPeriod = 'week') => buildMock(period),
};
