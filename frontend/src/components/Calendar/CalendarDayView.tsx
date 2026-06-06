import React from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { CalendarEvent } from '../../services/calendarService';
import { RecommendedTemplateEntry, getEventsForDay } from '../../utils/calendarRecommendations';
import { PRIORITY_VARIANT } from '../../utils/taskTemplateUtils';
import Badge from '../Common/Badge';
import Button from '../Common/Button';
import EmptyState from '../Common/EmptyState';
import { CalendarClock, Plus, Sparkles } from 'lucide-react';
import './CalendarDayView.css';

type Props = {
  date: Date;
  events: CalendarEvent[];
  recommended: RecommendedTemplateEntry[];
  fieldId?: string;
  locale: string;
  onEventClick: (event: CalendarEvent) => void;
};

const CalendarDayView: React.FC<Props> = ({
  date,
  events,
  recommended,
  fieldId,
  locale,
  onEventClick,
}) => {
  const { t } = useTranslation(['calendar', 'taskTemplates']);
  const navigate = useNavigate();
  const dateLocale = locale === 'el' ? el : enUS;
  const dayEvents = getEventsForDay(events, date);

  return (
    <div className="cal-day-view">
      <header className="cal-day-header">
        <div>
          <p className="cal-day-weekday">{format(date, 'EEEE', { locale: dateLocale })}</p>
          <h2 className="cal-day-date">{format(date, 'd MMMM yyyy', { locale: dateLocale })}</h2>
        </div>
        {fieldId && (
          <Button
            size="sm"
            variant="primary"
            icon={<Plus />}
            onClick={() => navigate(`/tasks/new?fieldId=${fieldId}`)}
          >
            {t('calendar:scheduleTask')}
          </Button>
        )}
      </header>

      <section className="cal-day-section">
        <h3>{t('calendar:scheduledTitle')}</h3>
        {dayEvents.length === 0 ? (
          <EmptyState
            icon={<CalendarClock size={40} />}
            title={t('calendar:noEventsDay')}
            description={t('calendar:noEventsDayDesc')}
          />
        ) : (
          <ul className="cal-day-events-list">
            {dayEvents.map((event) => (
              <li key={event.id}>
                <button type="button" className="cal-day-event" onClick={() => onEventClick(event)}>
                  <span
                    className="cal-day-event-dot"
                    style={{ background: event.color || '#6c757d' }}
                  />
                  <div>
                    <strong>{event.title}</strong>
                    <span>{format(new Date(event.start), 'HH:mm')} – {format(new Date(event.end), 'HH:mm')}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recommended.length > 0 && (
        <section className="cal-day-section cal-day-recommended">
          <div className="cal-day-section-head">
            <Sparkles size={18} />
            <h3>{t('calendar:recommendedTitle')}</h3>
          </div>
          <p className="cal-day-recommended-desc">{t('calendar:recommendedDesc')}</p>
          <div className="cal-day-recommended-list">
            {recommended.map(({ template, categoryBg, categoryColor, categoryBorder, recommended: isRec }) => (
                <article
                  key={template.id}
                  className={`cal-day-rec-card${isRec ? ' cal-day-rec-card--highlight' : ''}`}
                  style={{ borderLeftColor: categoryBorder }}
                >
                  <div className="cal-day-rec-top">
                    <span
                      className="cal-day-rec-cat"
                      style={{ background: categoryBg, color: categoryColor, borderColor: categoryBorder }}
                    >
                      {template.category}
                    </span>
                    <Badge variant={PRIORITY_VARIANT[template.priority]} size="sm">
                      {template.priority}
                    </Badge>
                    {isRec && <span className="cal-day-rec-now">{t('taskTemplates:card.recommendedNow')}</span>}
                  </div>
                  <h4>{template.title}</h4>
                  <p>{template.shortDescription}</p>
                  {fieldId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        navigate(
                          `/tasks/new?templateId=${template.id}&fieldId=${fieldId}&month=${date.getMonth() + 1}`
                        )
                      }
                    >
                      {t('calendar:scheduleTemplate')}
                    </Button>
                  )}
                </article>
              ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default CalendarDayView;
