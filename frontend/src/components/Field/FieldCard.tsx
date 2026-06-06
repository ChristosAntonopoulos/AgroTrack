import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Droplets,
  MapPin,
  Sprout,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { Field } from '../../services/fieldService';
import { Task } from '../../services/taskService';
import LifecycleIndicator from './LifecycleIndicator';
import Badge from '../Common/Badge';
import Button from '../Common/Button';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import './FieldCard.css';

export interface FieldCardStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

interface FieldCardProps {
  field: Field;
  stats: FieldCardStats;
  isOwner: boolean;
  showProducerInfo?: boolean;
  assignedProducers?: string[];
  nextTask?: Task;
  onDelete?: (id: string) => void;
}

const FieldCard: React.FC<FieldCardProps> = ({
  field,
  stats,
  isOwner,
  showProducerInfo,
  assignedProducers = [],
  nextTask,
  onDelete,
}) => {
  const { t } = useTranslation(['fields', 'common']);
  const { formatDate } = useLocaleFormatters();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const hasRisk = stats.overdue > 0;
  const progressPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const handleCardClick = () => navigate(`/fields/${field.id}`);

  return (
    <article
      className={`field-card-v2 ${hasRisk ? 'field-card-v2--alert' : ''}`}
      onClick={handleCardClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
    >
      <div className="field-card-v2-accent" aria-hidden />

      <div className="field-card-v2-header">
        <div className="field-card-v2-title-block">
          <h3 className="field-card-v2-title">{field.name}</h3>
          <LifecycleIndicator year={field.currentLifecycleYear} />
        </div>
        {!isOwner && (
          <Badge variant="info" size="sm">
            {t('common:assigned')}
          </Badge>
        )}
      </div>

      <div className="field-card-v2-chips">
        <span className="field-chip">
          <MapPin size={13} />
          {t('common:hectares', { count: field.area })}
        </span>
        {field.variety && (
          <span className="field-chip field-chip-variety">
            <Sprout size={13} />
            {field.variety}
          </span>
        )}
        {field.irrigationStatus && (
          <span className="field-chip field-chip-irrigation">
            <Droplets size={13} />
            {t('fields:card.irrigation')}
          </span>
        )}
        {field.treeAge != null && field.treeAge > 0 && (
          <span className="field-chip">{field.treeAge} {t('fields:controlRoom.years')}</span>
        )}
      </div>

      {hasRisk && isOwner && (
        <div className="field-card-v2-alerts">
          {stats.overdue > 0 && (
            <Badge variant="warning" size="sm">
              <AlertTriangle size={12} />
              {t('fields:card.overdue', { count: stats.overdue })}
            </Badge>
          )}

        </div>
      )}

      {nextTask && (
        <div className="field-card-v2-next">
          <span className="field-card-v2-next-label">{t('fields:card.next')}</span>
          <span className="field-card-v2-next-task">{nextTask.title}</span>
          {nextTask.scheduledEnd && (
            <span className="field-card-v2-next-due">
              {t('common:due')}: {formatDate(nextTask.scheduledEnd)}
            </span>
          )}
        </div>
      )}

      {stats.total > 0 && (
        <div className="field-card-v2-progress">
          <div className="field-card-v2-progress-header">
            <span>{t('fields:card.tasks', { count: stats.total })}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="field-card-v2-progress-bar">
            <div className="field-card-v2-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="field-card-v2-stats">
            <span title={t('common:taskStatus.completed')}>
              <CheckCircle2 size={14} className="stat-done" />
              {stats.completed}
            </span>
            <span title={t('common:taskStatus.in_progress')}>
              <Clock size={14} className="stat-active" />
              {stats.inProgress}
            </span>
            <span title={t('common:taskStatus.pending')}>
              <Clock size={14} className="stat-pending" />
              {stats.pending}
            </span>
          </div>
        </div>
      )}

      {showProducerInfo && assignedProducers.length > 0 && (
        <p className="field-card-v2-producers">
          {t('fields:card.producers')}: {assignedProducers.slice(0, 2).join(', ')}
          {assignedProducers.length > 2 ? ` +${assignedProducers.length - 2}` : ''}
        </p>
      )}

      <div className="field-card-v2-footer" onClick={(e) => e.stopPropagation()}>
        <Button
          to={`/fields/${field.id}`}
          variant="primary"
          size="sm"
          icon={<ChevronRight />}
          className="field-card-v2-open"
        >
          {t('fields:card.view')}
        </Button>

        {isOwner && (
          <div className="field-card-v2-more-wrap">
            <button
              type="button"
              className="field-card-v2-more"
              aria-label={t('common:actions')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <>
                <div className="field-card-v2-menu-backdrop" onClick={() => setMenuOpen(false)} />
                <div className="field-card-v2-menu">
                  <Button to={`/fields/${field.id}/edit`} variant="ghost" size="sm">
                    {t('common:edit')}
                  </Button>
                  <Button to={`/fields/${field.id}/task-templates`} variant="ghost" size="sm">
                    {t('fields:controlRoom.addTaskFromTemplate')}
                  </Button>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="field-card-v2-delete"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(field.id);
                      }}
                    >
                      {t('common:delete')}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default FieldCard;
