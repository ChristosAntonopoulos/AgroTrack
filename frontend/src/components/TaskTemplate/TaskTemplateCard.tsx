import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { OliveTaskTemplate } from '../../types/oliveTaskTemplate';
import Badge from '../Common/Badge';
import Button from '../Common/Button';
import {
  CATEGORY_STYLES,
  PRIORITY_VARIANT,
  formatPrimaryMonthRange,
  getMonthChips,
  getTimingStatus,
  isRecommendedNow,
} from '../../utils/taskTemplateUtils';
import { useTaskTemplateLabels } from '../../hooks/useLocalizedTaskTemplate';
import { Field } from '../../services/fieldService';
import { Task } from '../../services/taskService';
import './TaskTemplateCard.css';

interface TaskTemplateCardProps {
  template: OliveTaskTemplate;
  selected: boolean;
  currentMonth: number;
  field: Field | null;
  tasks: Task[];
  fieldId?: string;
  onSelect: () => void;
  onPreview: () => void;
  onCreate: () => void;
}

const TaskTemplateCard: React.FC<TaskTemplateCardProps> = ({
  template,
  selected,
  currentMonth,
  field,
  tasks,
  fieldId,
  onSelect,
  onPreview,
  onCreate,
}) => {
  const { t } = useTranslation('taskTemplates');
  const labels = useTaskTemplateLabels();
  const [expanded, setExpanded] = useState(false);
  const style = CATEGORY_STYLES[template.category];
  const recommended = isRecommendedNow(template, currentMonth, field, tasks, fieldId);
  const timing = getTimingStatus(template, currentMonth);
  const monthChips = getMonthChips(template, labels.monthShort, t('card.allYear'));
  const monthRange = formatPrimaryMonthRange(template, labels.monthShort);

  const timingLabel =
    recommended
      ? t('card.recommendedNow')
      : timing === 'coming_soon'
        ? t('card.comingSoon')
        : timing === 'passed'
          ? t('card.passedSeason')
          : null;

  return (
    <article
      className={[
        'tt-card',
        selected && 'tt-card-selected',
        recommended && 'tt-card-recommended',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onSelect}
    >
      <div className="tt-card-badges">
        <span
          className="tt-category-badge"
          style={{ background: style.chipBg, color: style.text, borderColor: style.border }}
        >
          {labels.categoryLabel(template.category)}
        </span>
        <Badge variant={PRIORITY_VARIANT[template.priority]} size="sm">
          {labels.priorityLabel(template.priority)}
        </Badge>
        {recommended && (
          <span className="tt-now-badge">
            <Sparkles size={12} />
            {t('card.recommendedNow')}
          </span>
        )}
        {timingLabel && !recommended && (
          <span className={`tt-timing-badge tt-timing-${timing}`}>{timingLabel}</span>
        )}
      </div>

      <h3 className="tt-card-title">{template.title}</h3>
      <p className="tt-card-desc">{template.shortDescription}</p>

      <div className="tt-card-meta">
        <div className="tt-card-chips">
          {monthChips.map((chip) => (
            <span
              key={chip}
              className="tt-month-chip"
              style={{ background: style.chipBg, color: style.text, borderColor: style.border }}
            >
              {chip}
            </span>
          ))}
        </div>
        <span className="tt-card-repetition">{template.repetition}</span>
      </div>

      {expanded && (
        <div className="tt-card-expanded" onClick={(e) => e.stopPropagation()}>
          <p className="tt-card-why">{template.whyItMatters}</p>

          <dl className="tt-card-details">
            <div>
              <dt>{t('card.recommendedPeriod')}</dt>
              <dd>{monthRange}</dd>
            </div>
            {template.estimatedDuration && (
              <div>
                <dt>{t('card.estimatedDuration')}</dt>
                <dd>{template.estimatedDuration}</dd>
              </div>
            )}
            <div>
              <dt>{t('card.appliesTo')}</dt>
              <dd>{template.appliesTo.join(', ')}</dd>
            </div>
          </dl>

          <div className="tt-card-section">
            <strong>{t('card.prefillTitle')}</strong>
            <ul>
              <li>{t('card.prefillCategory', { value: labels.categoryLabel(template.category) })}</li>
              <li>{t('card.prefillRecurrence', { value: template.repetition })}</li>
              <li>{t('card.prefillStartMonth', { value: monthRange })}</li>
              <li>{t('card.prefillChecklist', { value: template.checklist.slice(0, 3).join(', ') })}</li>
              <li>{t('card.prefillCompletion', { value: template.completionFields.join(', ') })}</li>
            </ul>
          </div>

          {template.warnings && template.warnings.length > 0 && (
            <div className="tt-card-warnings">
              {template.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="tt-card-actions" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setExpanded(!expanded)}
          icon={expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        >
          {expanded ? t('card.less') : t('card.details')}
        </Button>
        <Button size="sm" variant="outline" onClick={onPreview}>
          {t('card.preview')}
        </Button>
        <Button size="sm" variant="primary" onClick={onCreate}>
          {t('card.createTask')}
        </Button>
      </div>
    </article>
  );
};

export default TaskTemplateCard;
