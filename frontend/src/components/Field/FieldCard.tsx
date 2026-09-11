import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Field } from '../../services/fieldService';
import { getFieldOpenPath, isFieldSetupIncomplete } from '../../utils/fieldDisplay';
import { resolveFieldColor } from '../../utils/fieldColors';
import FieldIdentity from '../fields/FieldIdentity';
import FieldPolygonThumbnail from '../fields/FieldPolygonThumbnail';
import './FieldCard.css';

export interface FieldCardStats {
  todayTaskCount: number;
  tasksReady?: boolean;
}

interface FieldCardProps {
  field: Field;
  stats: FieldCardStats;
  compact?: boolean;
  selected?: boolean;
  onSelect?: (fieldId: string) => void;
  onHover?: (fieldId: string | null) => void;
}

const FieldCard: React.FC<FieldCardProps> = ({
  field,
  stats,
  compact,
  selected,
  onSelect,
  onHover,
}) => {
  const { t } = useTranslation(['fields']);
  const navigate = useNavigate();
  const accent = resolveFieldColor(field.color, field.id);

  const incomplete = isFieldSetupIncomplete(field.status);
  const open = () => navigate(getFieldOpenPath(field));
  const hasTasks = stats.tasksReady && stats.todayTaskCount > 0;
  const todayLine = !stats.tasksReady
    ? t('fields:card.todayTasksLoading')
    : stats.todayTaskCount === 0
      ? t('fields:card.todayTasks_zero')
      : t('fields:card.todayTasks', { count: stats.todayTaskCount });

  const handleActivate = () => {
    if (onSelect) onSelect(field.id);
    else open();
  };

  return (
    <article
      className={`field-card-v2${compact ? ' field-card-v2--compact' : ''}${selected ? ' field-card-v2--selected' : ''}${hasTasks ? ' field-card-v2--has-tasks' : ''}`}
      style={{ ['--field-accent' as string]: accent }}
      onClick={handleActivate}
      onMouseEnter={() => onHover?.(field.id)}
      onMouseLeave={() => onHover?.(null)}
      role={onSelect ? 'button' : 'link'}
      tabIndex={0}
      aria-pressed={onSelect ? selected : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleActivate();
        }
      }}
    >
      <div className="field-card-v2-main">
        <FieldIdentity field={field} size="card" />
        <div className="field-card-v2-footer">
          <p
            className={`field-card-v2-today${hasTasks ? ' field-card-v2-today--active' : ''}${!stats.tasksReady ? ' field-card-v2-today--loading' : ''}`}
          >
            {todayLine}
          </p>
          <span
            className="field-card-v2-open-hint"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                open();
              }
            }}
            role={onSelect ? 'link' : undefined}
            tabIndex={onSelect ? 0 : undefined}
          >
            {incomplete ? t('fields:card.continueSetup') : t('fields:card.open')}
            <ChevronRight size={16} aria-hidden />
          </span>
        </div>
      </div>
      {compact ? null : <FieldPolygonThumbnail field={field} />}
    </article>
  );
};

export default FieldCard;
