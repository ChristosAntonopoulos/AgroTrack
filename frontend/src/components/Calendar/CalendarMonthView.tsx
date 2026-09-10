import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { CalendarEvent } from '../../services/calendarService';
import {
  countCritical,
  getEventCategoryColor,
  getEventChipVariant,
  getEventsForDay,
  shortenLabel,
} from '../../utils/calendarViewUtils';
import CalendarTaskChip from './CalendarTaskChip';
import './CalendarMonthView.css';

type Props = {
  currentDate: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  locale: string;
  onDateSelect: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
};

const MAX_VISIBLE_CHIPS = 2;

const CalendarMonthView: React.FC<Props> = ({
  currentDate,
  selectedDate,
  events,
  locale,
  onDateSelect,
  onEventClick,
}) => {
  const { t } = useTranslation('calendar');
  const dateLocale = locale === 'el' ? el : enUS;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = [1, 2, 3, 4, 5, 6, 0].map((d) =>
    format(new Date(2024, 0, d), 'EEE', { locale: dateLocale })
  );

  return (
    <div className="cal-month">
      <div className="cal-month-header">
        {weekDays.map((day) => (
          <div key={day} className="cal-month-weekday">
            {day}
          </div>
        ))}
      </div>

      <div className="cal-month-grid" role="grid" aria-label={format(currentDate, 'MMMM yyyy', { locale: dateLocale })}>
        {days.map((day) => {
          const dayEvents = getEventsForDay(events, day);
          const inMonth = isSameMonth(day, currentDate);
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);
          const criticalCount = countCritical(dayEvents);
          const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_CHIPS);
          const hiddenCount = dayEvents.length - visibleEvents.length;

          return (
            <button
              key={day.toISOString()}
              type="button"
              role="gridcell"
              className={[
                'cal-month-day',
                !inMonth && 'cal-month-day--outside',
                isCurrentDay && 'cal-month-day--today',
                isSelected && 'cal-month-day--selected',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onDateSelect(day)}
              aria-current={isSelected ? 'date' : undefined}
              aria-label={format(day, 'EEEE d MMMM', { locale: dateLocale })}
            >
              <div className="cal-month-day-head">
                <span className="cal-month-day-num">{format(day, 'd')}</span>
                {criticalCount > 0 && (
                  <span className="cal-month-critical" title={t('criticalCount', { count: criticalCount })}>
                    {t('criticalShort', { count: criticalCount })}
                  </span>
                )}
              </div>

              <div className="cal-month-day-events">
                {visibleEvents.map((event) => (
                  <CalendarTaskChip
                    key={event.id}
                    label={shortenLabel(event.title)}
                    categoryColor={getEventCategoryColor(event)}
                    variant={getEventChipVariant(event)}
                    priority={event.priority}
                    title={`${event.title}${event.fieldName ? ` · ${event.fieldName}` : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  />
                ))}

                {hiddenCount > 0 && (
                  <span className="cal-month-more">{t('moreEvents', { count: hiddenCount })}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarMonthView;
