import React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import './CalendarTaskChip.css';

export type TaskChipVariant = 'scheduled' | 'recommended' | 'overdue' | 'completed' | 'deadline';

type Props = {
  label: string;
  categoryColor: string;
  variant?: TaskChipVariant;
  priority?: string;
  onClick?: (e: React.MouseEvent) => void;
  as?: 'button' | 'span';
  title?: string;
};

const CalendarTaskChip: React.FC<Props> = ({
  label,
  categoryColor,
  variant = 'scheduled',
  priority,
  onClick,
  as = 'button',
  title,
}) => {
  const className = [
    'cal-task-chip',
    `cal-task-chip--${variant}`,
    priority === 'Critical' && 'cal-task-chip--critical',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {variant === 'overdue' && (
        <AlertCircle size={10} className="cal-task-chip-icon" aria-hidden />
      )}
      {variant === 'completed' && (
        <Check size={10} className="cal-task-chip-icon" aria-hidden />
      )}
      <span className="cal-task-chip-label">{label}</span>
    </>
  );

  const style = { '--chip-color': categoryColor } as React.CSSProperties;

  if (as === 'span') {
    return (
      <span className={className} style={style} title={title ?? label}>
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={onClick}
      title={title ?? label}
    >
      {content}
    </button>
  );
};

export default CalendarTaskChip;
