import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Field } from '../../services/fieldService';
import {
  formatCompactDate,
  getFieldOpenPath,
  isFieldSetupIncomplete,
  isOwnedField,
  viewerFieldRole,
} from '../../utils/fieldDisplay';
import { resolveFieldColor } from '../../utils/fieldColors';
import FieldIdentity from '../fields/FieldIdentity';
import FieldPolygonThumbnail from '../fields/FieldPolygonThumbnail';
import { normalizeLocale } from '../../i18n/config';
import './FieldCard.css';

export interface FieldCardStats {
  todayTaskCount: number;
  tasksReady?: boolean;
}

interface FieldCardProps {
  field: Field;
  stats: FieldCardStats;
  currentUserId?: string | null;
  compact?: boolean;
  selected?: boolean;
  onSelect?: (fieldId: string) => void;
  onHover?: (fieldId: string | null) => void;
  showActivityDate?: boolean;
}

const FieldCard: React.FC<FieldCardProps> = ({
  field,
  stats,
  currentUserId,
  compact,
  selected,
  onSelect,
  onHover,
  showActivityDate = false,
}) => {
  const { t, i18n } = useTranslation(['fields']);
  const navigate = useNavigate();
  const accent = resolveFieldColor(field.color, field.id);
  const locale = normalizeLocale(i18n.language);

  const incomplete = isFieldSetupIncomplete(field.status);
  const role = viewerFieldRole(field, currentUserId);
  const mine = role === 'Admin' || (role == null && isOwnedField(field, currentUserId));
  const open = () => navigate(getFieldOpenPath(field));
  const hasTasks = stats.tasksReady && stats.todayTaskCount > 0;
  const todayLine = !stats.tasksReady
    ? t('fields:card.todayTasksLoading')
    : stats.todayTaskCount > 0
      ? t('fields:card.needsNowTasks', {
          count: stats.todayTaskCount,
          defaultValue: `Χρειάζεται τώρα · ${stats.todayTaskCount} εργασίες`,
        })
      : showActivityDate && field.updatedAt
        ? t('fields:card.lastRecord', {
            date: formatCompactDate(field.updatedAt, locale === 'el' ? 'el-GR' : locale),
            defaultValue: `Τελευταία καταγραφή · ${formatCompactDate(field.updatedAt, locale === 'el' ? 'el-GR' : locale)}`,
          })
        : t('fields:card.todayTasks_zero');

  const handleActivate = () => {
    // Map split: first click focuses the grove on the map, second opens it.
    if (onSelect) {
      if (selected) open();
      else onSelect(field.id);
      return;
    }
    open();
  };

  return (
    <article
      className={`field-card-v2${compact ? ' field-card-v2--compact' : ''}${selected ? ' field-card-v2--selected' : ''}${hasTasks ? ' field-card-v2--has-tasks' : ''}${incomplete ? ' field-card-v2--draft' : ''}`}
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
        <div className="field-card-v2-badges">
          {incomplete ? <span className="field-card-badge field-card-badge--draft">{t('fields:card.draftBadge')}</span> : null}
          {currentUserId ? (
            <span
              className={`field-card-badge field-card-badge--${
                role === 'Admin' || mine
                  ? 'admin'
                  : role === 'Family'
                    ? 'family'
                    : 'partner'
              }`}
            >
              {role
                ? t(`fields:card.role.${role}`)
                : t('fields:card.sharedBadge')}
            </span>
          ) : null}
        </div>
        <FieldIdentity field={field} size="card" />
        <div className="field-card-v2-footer">
          <div className="field-card-v2-meta">
            <p
              className={`field-card-v2-today${hasTasks ? ' field-card-v2-today--active' : ''}${!stats.tasksReady ? ' field-card-v2-today--loading' : ''}`}
            >
              {todayLine}
            </p>
            {showActivityDate && field.updatedAt ? (
              <p className="field-card-v2-activity">
                {t('fields:card.activityDate', {
                  date: formatCompactDate(field.updatedAt, locale === 'el' ? 'el-GR' : locale),
                })}
              </p>
            ) : null}
          </div>
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
