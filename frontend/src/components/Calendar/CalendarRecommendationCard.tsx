import React from 'react';
import { useTranslation } from 'react-i18next';
import { RecommendedTemplateEntry } from '../../utils/calendarRecommendations';
import { PRIORITY_VARIANT } from '../../utils/taskTemplateUtils';
import Badge from '../Common/Badge';
import Button from '../Common/Button';
import { Clock, MapPin, CalendarRange } from 'lucide-react';
import './CalendarRecommendationCard.css';

type Props = {
  entry: RecommendedTemplateEntry;
  fieldLabel?: string;
  onSchedule?: () => void;
  onDetails?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
};

const CalendarRecommendationCard: React.FC<Props> = ({
  entry,
  fieldLabel,
  onSchedule,
  onDetails,
  onDismiss,
  compact = false,
}) => {
  const { t } = useTranslation(['calendar', 'taskTemplates']);
  const { template, categoryBg, categoryColor, categoryBorder, recommended } = entry;

  return (
    <article
      className={`cal-rec-card${recommended ? ' cal-rec-card--now' : ''}${compact ? ' cal-rec-card--compact' : ''}`}
      style={{ borderLeftColor: categoryBorder }}
    >
      <div className="cal-rec-card-top">
        <span
          className="cal-rec-card-cat"
          style={{ background: categoryBg, color: categoryColor, borderColor: categoryBorder }}
        >
          {template.category}
        </span>
        <Badge variant={PRIORITY_VARIANT[template.priority]} size="sm">
          {template.priority}
        </Badge>
        {recommended && (
          <span className="cal-rec-card-now">{t('taskTemplates:card.recommendedNow')}</span>
        )}
      </div>

      <h4 className="cal-rec-card-title">{template.title}</h4>

      {!compact && (
        <>
          <p className="cal-rec-card-desc">{template.shortDescription}</p>

          <div className="cal-rec-card-meta">
            <div className="cal-rec-card-meta-row">
              <strong>{t('calendar:whyNow')}</strong>
              <span>{template.timingExplanation || template.whyItMatters}</span>
            </div>
            <div className="cal-rec-card-meta-row">
              <CalendarRange size={14} aria-hidden />
              <span>
                {t('calendar:suggestedWindow')}: {template.monthTooltip}
              </span>
            </div>
            {fieldLabel && (
              <div className="cal-rec-card-meta-row">
                <MapPin size={14} aria-hidden />
                <span>{fieldLabel}</span>
              </div>
            )}
            {template.estimatedDuration && (
              <div className="cal-rec-card-meta-row">
                <Clock size={14} aria-hidden />
                <span>{template.estimatedDuration}</span>
              </div>
            )}
          </div>
        </>
      )}

      {(onSchedule || onDetails || onDismiss) && (
        <div className="cal-rec-card-actions">
          {onSchedule && (
            <Button size="sm" variant="primary" onClick={onSchedule}>
              {t('calendar:scheduleTemplate')}
            </Button>
          )}
          {onDetails && (
            <Button size="sm" variant="outline" onClick={onDetails}>
              {t('calendar:viewDetails')}
            </Button>
          )}
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              {t('calendar:dismiss')}
            </Button>
          )}
        </div>
      )}
    </article>
  );
};

export default CalendarRecommendationCard;
