import React from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { CalendarEvent } from '../../services/calendarService';
import {
  AGENDA_GROUP_ORDER,
  getEventCategoryColor,
  getEventChipVariant,
  groupEventsByAgenda,
} from '../../utils/calendarViewUtils';
import CalendarTaskChip from './CalendarTaskChip';
import './CalendarAgendaView.css';

type Props = {
  events: CalendarEvent[];
  locale: string;
  referenceDate?: Date;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
};

const CalendarAgendaView: React.FC<Props> = ({
  events,
  locale,
  referenceDate = new Date(),
  onEventClick,
  onDateClick,
}) => {
  const { t } = useTranslation('calendar');
  const dateLocale = locale === 'el' ? el : enUS;
  const groups = groupEventsByAgenda(events, referenceDate);

  const groupLabels: Record<(typeof AGENDA_GROUP_ORDER)[number], string> = {
    today: t('agendaToday'),
    tomorrow: t('agendaTomorrow'),
    thisWeek: t('agendaThisWeek'),
    later: t('agendaLater'),
  };

  const hasAny = AGENDA_GROUP_ORDER.some((key) => groups[key].length > 0);

  if (!hasAny) {
    return (
      <div className="cal-agenda cal-agenda--empty">
        <p>{t('agendaEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="cal-agenda">
      {AGENDA_GROUP_ORDER.map((groupKey) => {
        const groupEvents = groups[groupKey];
        if (groupEvents.length === 0) return null;

        return (
          <section key={groupKey} className="cal-agenda-group">
            <h3 className="cal-agenda-group-title">{groupLabels[groupKey]}</h3>
            <ul className="cal-agenda-list">
              {groupEvents.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    className="cal-agenda-item"
                    onClick={() => onEventClick(event)}
                  >
                    <div className="cal-agenda-item-date">
                      <button
                        type="button"
                        className="cal-agenda-date-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDateClick(new Date(event.start));
                        }}
                      >
                        {format(new Date(event.start), 'EEE d MMM', { locale: dateLocale })}
                      </button>
                      <span>{format(new Date(event.start), 'HH:mm')}</span>
                    </div>
                    <div className="cal-agenda-item-main">
                      <CalendarTaskChip
                        as="span"
                        label={event.title}
                        categoryColor={getEventCategoryColor(event)}
                        variant={getEventChipVariant(event)}
                        priority={event.priority}
                      />
                      <div className="cal-agenda-item-meta">
                        {event.fieldName && <span>{event.fieldName}</span>}
                        {event.priority && <span>{event.priority}</span>}
                        {event.status && <span>{event.status.replace('_', ' ')}</span>}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export default CalendarAgendaView;
