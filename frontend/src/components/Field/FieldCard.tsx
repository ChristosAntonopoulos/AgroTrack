import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Field } from '../../services/fieldService';
import FieldIdentity from '../fields/FieldIdentity';
import FieldPolygonThumbnail from '../fields/FieldPolygonThumbnail';
import './FieldCard.css';

export interface FieldCardStats {
  todayTaskCount: number;
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
        <p className="field-card-v2-today">
          {t('fields:card.todayTasks', { count: stats.todayTaskCount })}
        </p>
        <span className="field-card-v2-open-hint">{t('fields:card.open')}</span>
      </div>
      <FieldPolygonThumbnail field={field} />
    </article>
  );
};

export default FieldCard;
