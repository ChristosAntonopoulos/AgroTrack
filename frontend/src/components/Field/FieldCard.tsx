import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Field } from '../../services/fieldService';
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
}

const FieldCard: React.FC<FieldCardProps> = ({ field, stats, compact, selected }) => {
  const { t } = useTranslation(['fields']);
  const navigate = useNavigate();

  const open = () => navigate(`/fields/${field.id}`);
  const todayLine = !stats.tasksReady
    ? t('fields:card.todayTasksLoading')
    : stats.todayTaskCount === 0
      ? t('fields:card.todayTasks_zero')
      : t('fields:card.todayTasks', { count: stats.todayTaskCount });

  return (
    <article
      className={`field-card-v2${compact ? ' field-card-v2--compact' : ''}${selected ? ' field-card-v2--selected' : ''}`}
      onClick={open}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
    >
      <div className="field-card-v2-main">
        <FieldIdentity field={field} size="card" />
        <p className="field-card-v2-today">{todayLine}</p>
        <span className="field-card-v2-open-hint">{t('fields:card.open')}</span>
      </div>
      <FieldPolygonThumbnail field={field} />
    </article>
  );
};

export default FieldCard;
