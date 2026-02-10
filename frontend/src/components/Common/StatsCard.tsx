import React, { ReactNode } from 'react';
import './StatsCard.css';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, trend, color = 'primary' }) => {
  return (
    <div className={`stats-card stats-card-${color}`}>
      <div className="stats-card-content">
        <div className="stats-card-header">
          <h3 className="stats-card-title">{title}</h3>
          {icon && <div className="stats-card-icon">{icon}</div>}
        </div>
        <div className="stats-card-value">{value}</div>
        {trend && (
          <div className={`stats-card-trend ${trend.isPositive ? 'positive' : 'negative'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
