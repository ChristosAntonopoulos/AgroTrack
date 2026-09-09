import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart as RechartsLineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import type { MeDashboardSeriesPoint } from '../../services/meDashboardService';
import './DashboardWidgets.css';

export interface ActionSparklineProps {
  series: MeDashboardSeriesPoint[];
}

const ActionSparkline: React.FC<ActionSparklineProps> = ({ series }) => {
  const { t } = useTranslation('dashboard');
  const data = useMemo(
    () =>
      series.map((p) => ({
        date: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        total: p.total,
      })),
    [series]
  );

  if (data.length === 0) return null;

  return (
    <section className="action-sparkline" aria-label={t('myActions.sparklineTitle')}>
      <h2 className="dashboard-section-label">{t('myActions.sparklineTitle')}</h2>
      <div className="action-sparkline-chart">
        <ResponsiveContainer width="100%" height={120}>
          <RechartsLineChart data={data}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="total"
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={false}
              name={t('myActions.sparklineSeries')}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default ActionSparkline;
