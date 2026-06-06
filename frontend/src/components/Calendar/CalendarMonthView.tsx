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
import { RecommendedTemplateEntry, getCategoryColorsForMonth, getEventsForDay } from '../../utils/calendarRecommendations';
import CalendarEventComponent from './CalendarEvent';
import './CalendarMonthView.css';

type Props = {
  currentDate: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  recommended: RecommendedTemplateEntry[];
  locale: string;
  onDateSelect: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
};

const CalendarMonthView: React.FC<Props> = ({
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

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = [1, 2, 3, 4, 5, 6, 0].map((d) =>
    format(new Date(2024, 0, d), 'EEE', { locale: dateLocale })
  );

  const categoryColors = getCategoryColorsForMonth(recommended);
  const hasSeasonal = recommended.length > 0;

  return (
    <div className={`cal-month${hasSeasonal ? ' cal-month--seasonal' : ''}`}>
      {hasSeasonal && (
        <div
          className="cal-month-season-glow"
          style={{
            background: categoryColors.length
              ? `linear-gradient(90deg, ${categoryColors.map((c) => `${c}22`).join(', ')})`
              : undefined,
          }}
          aria-hidden
        />
      )}

      <div className="cal-month-header">
        {weekDays.map((day) => (
          <div key={day} className="cal-month-weekday">
            {day}
          </div>
        ))}
      </div>

      <div className="cal-month-grid">
        {days.map((day) => {
          const dayEvents = getEventsForDay(events, day);
          const inMonth = isSameMonth(day, currentDate);
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              className={[
                'cal-month-day',
                !inMonth && 'cal-month-day--outside',
                isCurrentDay && 'cal-month-day--today',
                isSelected && 'cal-month-day--selected',
                hasSeasonal && inMonth && 'cal-month-day--recommended',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onDateSelect(day)}
            >
              {hasSeasonal && inMonth && categoryColors.length > 0 && (
                <div className="cal-month-day-strip" aria-hidden>
                  {categoryColors.slice(0, 4).map((color) => (
                    <span key={color} style={{ background: color }} />
                  ))}
                </div>
              )}

              <span className="cal-month-day-num">{format(day, 'd')}</span>

              <div className="cal-month-day-events">
                {dayEvents.slice(0, 3).map((event) => (
                  <CalendarEventComponent
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick(event)}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <span className="cal-month-more">
                    {t('calendar:moreEvents', { count: dayEvents.length - 3 })}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {hasSeasonal && (
        <p className="cal-month-season-hint">
          {t('calendar:seasonHint', { month: format(currentDate, 'MMMM', { locale: dateLocale }) })}
        </p>
      )}
    </div>
  );
};

export default CalendarMonthView;
