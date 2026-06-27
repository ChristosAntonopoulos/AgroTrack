import React from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { CalendarEvent } from '../../services/calendarService';
import { RecommendedTemplateEntry } from '../../utils/calendarRecommendations';
import {
  getEventCategoryColor,
  getEventChipVariant,
  partitionDayEvents,
} from '../../utils/calendarViewUtils';
import CalendarTaskChip from './CalendarTaskChip';
import CalendarRecommendationCard from './CalendarRecommendationCard';
import Button from '../Common/Button';
import { X, Plus, CalendarClock } from 'lucide-react';
import './CalendarDayPanel.css';

type Props = {
  date: Date;
  events: CalendarEvent[];
  recommended: RecommendedTemplateEntry[];
  fieldId?: string;
  fieldLabel?: string;
  locale: string;
  isDrawer?: boolean;
  onClose?: () => void;
  onEventClick: (event: CalendarEvent) => void;
  onScheduleTemplate?: (templateId: string) => void;
  onCreateTask?: () => void;
  onScheduleRecommended?: () => void;
};

const CalendarDayPanel: React.FC<Props> = ({
  date,
  events,
  recommended,
  fieldId,
  fieldLabel,
  locale,
  isDrawer = false,
  onClose,
  onEventClick,
  onScheduleTemplate,
  onCreateTask,
  onScheduleRecommended,
}) => {
  const { t } = useTranslation(['calendar', 'taskTemplates']);
  const navigate = useNavigate();
  const dateLocale = locale === 'el' ? el : enUS;
  const { scheduled, overdue, completed, deadlines } = partitionDayEvents(events);
  const monthName = format(date, 'MMMM', { locale: dateLocale });
  const topRecommended = recommended.filter((r) => r.recommended).slice(0, 3);
  const hasWork = scheduled.length + overdue.length + completed.length + deadlines.length > 0;

  const renderEventRow = (event: CalendarEvent) => (
    <li key={event.id}>
      <button type="button" className="cal-day-panel-event" onClick={() => onEventClick(event)}>
        <CalendarTaskChip
          as="span"
          label={event.title}
          categoryColor={getEventCategoryColor(event)}
          variant={getEventChipVariant(event)}
          priority={event.priority}
        />
        <div className="cal-day-panel-event-meta">
          {event.fieldName && <span>{event.fieldName}</span>}
          <span>
            {format(new Date(event.start), 'HH:mm')}
            {event.priority && ` · ${event.priority}`}
          </span>
        </div>
      </button>
    </li>
  );

  return (
    <aside
      className={`cal-day-panel${isDrawer ? ' cal-day-panel--drawer' : ''}`}
      aria-label={t('calendar:dayDetailsAria', { date: format(date, 'd MMMM yyyy', { locale: dateLocale }) })}
    >
      <header className="cal-day-panel-header">
        <div>
          <p className="cal-day-panel-weekday">{format(date, 'EEEE', { locale: dateLocale })}</p>
          <h2 className="cal-day-panel-date">{format(date, 'd MMMM yyyy', { locale: dateLocale })}</h2>
          <p className="cal-day-panel-context">
            {t('calendar:monthFocusDynamic', {
              month: monthName,
              defaultValue: t('calendar:monthFocus', { month: monthName }),
            })}
          </p>
        </div>
        {isDrawer && onClose && (
          <button type="button" className="cal-day-panel-close" onClick={onClose} aria-label={t('calendar:closePanel')}>
            <X size={18} />
          </button>
        )}
      </header>

      <div className="cal-day-panel-body">
        {overdue.length > 0 && (
          <section className="cal-day-panel-section cal-day-panel-section--overdue">
            <h3>{t('calendar:overdueTitle')}</h3>
            <ul>{overdue.map(renderEventRow)}</ul>
          </section>
        )}

        <section className="cal-day-panel-section">
          <div className="cal-day-panel-section-head">
            <h3>{t('calendar:scheduledTitle')}</h3>
            {fieldId && onCreateTask && (
              <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={onCreateTask}>
                {t('calendar:scheduleTask')}
              </Button>
            )}
          </div>

          {!hasWork && scheduled.length === 0 ? (
            <div className="cal-day-panel-empty">
              <CalendarClock size={28} aria-hidden />
              <p className="cal-day-panel-empty-title">{t('calendar:noEventsDay')}</p>
              <p className="cal-day-panel-empty-desc">{t('calendar:noEventsDayDesc')}</p>
              {topRecommended.length > 0 && (
                <ul className="cal-day-panel-empty-recs">
                  {topRecommended.map(({ template, categoryBorder, recommended: isRec }) => (
                    <li key={template.id}>
                      <CalendarTaskChip
                        as="span"
                        label={`${template.title} — ${template.priority}`}
                        categoryColor={categoryBorder}
                        variant="recommended"
                      />
                      {isRec && <span className="cal-day-panel-rec-tag">{t('taskTemplates:card.recommendedNow')}</span>}
                    </li>
                  ))}
                </ul>
              )}
              <div className="cal-day-panel-empty-actions">
                {onScheduleRecommended && topRecommended.length > 0 && (
                  <Button size="sm" variant="primary" onClick={onScheduleRecommended}>
                    {t('calendar:scheduleRecommended')}
                  </Button>
                )}
                {onCreateTask && (
                  <Button size="sm" variant="outline" onClick={onCreateTask}>
                    {t('calendar:createCustomTask')}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <ul>
              {[...deadlines, ...scheduled].map(renderEventRow)}
            </ul>
          )}
        </section>

        {completed.length > 0 && (
          <section className="cal-day-panel-section">
            <h3>{t('calendar:completedTitle')}</h3>
            <ul>{completed.map(renderEventRow)}</ul>
          </section>
        )}

        {recommended.length > 0 && (
          <section className="cal-day-panel-section cal-day-panel-section--recommended">
            <h3>{t('calendar:recommendedTitle')}</h3>
            <p className="cal-day-panel-rec-desc">{t('calendar:recommendedDesc')}</p>
            <div className="cal-day-panel-rec-list">
              {recommended.slice(0, 5).map((entry) => (
                <CalendarRecommendationCard
                  key={entry.template.id}
                  entry={entry}
                  fieldLabel={fieldLabel}
                  compact
                  onSchedule={
                    fieldId && onScheduleTemplate
                      ? () => onScheduleTemplate(entry.template.id)
                      : undefined
                  }
                  onDetails={() => navigate(`/fields/${fieldId || ''}/task-templates`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
};

export default CalendarDayPanel;
