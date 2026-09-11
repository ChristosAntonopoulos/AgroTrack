import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  CheckCircle2,
  Clock,
  Euro,
  Handshake,
  Leaf,
  PlayCircle,
} from 'lucide-react';
import StatsCard from '../Common/StatsCard';
import {
  MeDashboard,
  MeDashboardPeriod,
  trendPercent,
} from '../../services/meDashboardService';
import './DashboardWidgets.css';

export interface MyActionsStripProps {
  data: MeDashboard;
  density?: 'everyday' | 'full';
  period?: MeDashboardPeriod;
}

type TileKey =
  | 'tasksCompleted'
  | 'tasksStarted'
  | 'evidenceAdded'
  | 'harvestsRecorded'
  | 'expensesLogged'
  | 'contactsSent'
  | 'dueToday'
  | 'overdue'
  | 'open';

const MyActionsStrip: React.FC<MyActionsStripProps> = ({
  data,
  density = 'everyday',
  period,
}) => {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const activePeriod = period || data.period;

  const tiles = useMemo(() => {
    const openEstimate =
      data.pending.overdue + data.pending.dueToday + Math.max(0, data.counts.tasksStarted);
    const everyday: { key: TileKey; value: number; prev?: number; color: 'primary' | 'success' | 'warning' | 'error' | 'info'; path: string; icon: React.ReactNode }[] = [
      {
        key: 'tasksCompleted',
        value: data.counts.tasksCompleted,
        prev: data.previousCounts.tasksCompleted,
        color: 'success',
        path: `/tasks?status=completed&period=${activePeriod}`,
        icon: <CheckCircle2 />,
      },
      {
        key: 'open',
        value: openEstimate,
        color: data.pending.overdue > 0 ? 'warning' : 'primary',
        path: '/tasks?focus=action',
        icon: <Clock />,
      },
      {
        key: 'dueToday',
        value: data.pending.dueToday,
        color: 'info',
        path: '/chronologio?focus=today',
        icon: <PlayCircle />,
      },
    ];

    if (density === 'everyday') return everyday;

    return [
      {
        key: 'tasksCompleted' as TileKey,
        value: data.counts.tasksCompleted,
        prev: data.previousCounts.tasksCompleted,
        color: 'success' as const,
        path: `/tasks?status=completed&period=${activePeriod}`,
        icon: <CheckCircle2 />,
      },
      {
        key: 'tasksStarted' as TileKey,
        value: data.counts.tasksStarted,
        prev: data.previousCounts.tasksStarted,
        color: 'primary' as const,
        path: '/tasks?status=in_progress',
        icon: <PlayCircle />,
      },
      {
        key: 'evidenceAdded' as TileKey,
        value: data.counts.evidenceAdded,
        prev: data.previousCounts.evidenceAdded,
        color: 'info' as const,
        path: '/tasks',
        icon: <Camera />,
      },
      {
        key: 'harvestsRecorded' as TileKey,
        value: data.counts.harvestsRecorded,
        prev: data.previousCounts.harvestsRecorded,
        color: 'success' as const,
        path: '/fields',
        icon: <Leaf />,
      },
      {
        key: 'expensesLogged' as TileKey,
        value: data.counts.expensesLogged,
        prev: data.previousCounts.expensesLogged,
        color: 'warning' as const,
        path: '/money',
        icon: <Euro />,
      },
      {
        key: 'contactsSent' as TileKey,
        value: data.counts.contactsSent,
        prev: data.previousCounts.contactsSent,
        color: 'info' as const,
        path: '/partners',
        icon: <Handshake />,
      },
    ];
  }, [data, density, activePeriod]);

  return (
    <section className={`my-actions-strip my-actions-strip--${density}`} aria-label={t('myActions.stripTitle')}>
      <h2 className="dashboard-section-label">{t('myActions.stripTitle')}</h2>
      <div className="my-actions-grid">
        {tiles.map((tile) => {
          const trendValue =
            tile.prev !== undefined ? trendPercent(tile.value, tile.prev) : null;
          return (
            <StatsCard
              key={tile.key}
              title={t(`myActions.tiles.${tile.key}`)}
              value={tile.value}
              icon={tile.icon}
              color={tile.color}
              trend={
                trendValue === null
                  ? undefined
                  : { value: Math.abs(trendValue), isPositive: trendValue >= 0 }
              }
              onClick={() => navigate(tile.path)}
            />
          );
        })}
      </div>
    </section>
  );
};

export default MyActionsStrip;
