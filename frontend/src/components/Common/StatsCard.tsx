import React, { ReactNode, KeyboardEvent } from 'react';
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
  onClick?: () => void;
  href?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'primary',
  onClick,
  href,
}) => {
  const interactive = Boolean(onClick || href);
  const className = `stats-card stats-card-${color}${interactive ? ' stats-card-interactive' : ''}`;

  const content = (
    <div className="stats-card-content">
      <div className="stats-card-header">
        <h3 className="stats-card-title">{title}</h3>
        {icon && <div className="stats-card-icon">{icon}</div>}
      </div>
      <div className="stats-card-value">{value}</div>
      {trend && (
        <div
          className={`stats-card-trend ${trend.isPositive ? 'positive' : 'negative'}`}
          aria-label={`${trend.isPositive ? 'up' : 'down'} ${Math.abs(trend.value)} percent`}
        >
          <span aria-hidden="true">{trend.isPositive ? '↑' : '↓'}</span> {Math.abs(trend.value)}%
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <a className={className} href={href} onClick={onClick}>
        {content}
      </a>
    );
  }

  if (onClick) {
    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    };
    return (
      <div
        className={className}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        {content}
      </div>
    );
  }

  return <div className={className}>{content}</div>;
};

export default StatsCard;
