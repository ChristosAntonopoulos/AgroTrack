import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  format,
  isSameDay,
  isSameMonth,
  isToday,
} from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { CalendarEvent } from '../../services/calendarService';
import { RecommendedTemplateEntry, getEventsForDay } from '../../utils/calendarRecommendations';
import {
  countCritical,
  getEventCategoryColor,
  getEventChipVariant,
  getWeekDays,
  shortenLabel,
} from '../../utils/calendarViewUtils';
import CalendarTaskChip from './CalendarTaskChip';
import './CalendarWeekView.css';

type Props = {
  currentDate: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  recommended: RecommendedTemplateEntry[];
  locale: string;
  onDateSelect: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
};

const MAX_CHIPS = 4;

const CalendarWeekView: React.FC<Props> = ({
  currentDate,
  selectedDate,
  events,
  recommended,
  locale,
  onDateSelect,
  onEventClick,
}) => {
  const { t } = useTranslation('calendar');
  const dateLocale = locale === 'el' ? el : enUS;
  const days = getWeekDays(currentDate);
  const todayRecs = recommended.filter((r) => r.recommended).slice(0, 1);

  return (
    <div className="cal-week">
      <div className="cal-week-grid">
        {days.map((day) => {
          const dayEvents = getEventsForDay(events, day);
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);
          const inMonth = isSameMonth(day, currentDate);
          const criticalCount = countCritical(dayEvents);
          const showRec =
            isCurrentDay && todayRecs.length > 0 && dayEvents.length < MAX_CHIPS;

          return (
            <button
              key={day.toISOString()}
              type="button"
              className={[
                'cal-week-day',
                !inMonth && 'cal-week-day--outside',
                isCurrentDay && 'cal-week-day--today',
                isSelected && 'cal-week-day--selected',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onDateSelect(day)}
              aria-pressed={isSelected}
            >
              <div className="cal-week-day-head">
                <span className="cal-week-day-name">{format(day, 'EEE', { locale: dateLocale })}</span>
                <span className="cal-week-day-num">{format(day, 'd')}</span>
                {criticalCount > 0 && (
                  <span className="cal-week-critical" title={t('criticalCount', { count: criticalCount })}>
                    {t('criticalShort', { count: criticalCount })}
                  </span>
                )}
              </div>

              <div className="cal-week-day-events">
                {dayEvents.slice(0, MAX_CHIPS).map((event) => (
                  <CalendarTaskChip
                    key={event.id}
                    label={shortenLabel(event.title, 22)}
                    categoryColor={getEventCategoryColor(event)}
                    variant={getEventChipVariant(event)}
                    priority={event.priority}
                    title={event.title}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  />
                ))}
                {showRec &&
                  todayRecs.map(({ template, categoryBorder }) => (
                    <CalendarTaskChip
                      key={`rec-${template.id}`}
                      label={shortenLabel(template.title, 22)}
                      categoryColor={categoryBorder}
                      variant="recommended"
                      title={template.title}
                    />
                  ))}
                {dayEvents.length > MAX_CHIPS && (
                  <span className="cal-week-more">
                    {t('moreEvents', { count: dayEvents.length - MAX_CHIPS })}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarWeekView;
