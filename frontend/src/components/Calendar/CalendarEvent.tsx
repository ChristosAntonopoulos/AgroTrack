import React from 'react';
import { CalendarEvent as CalendarEventType } from '../../services/calendarService';
import './CalendarEvent.css';

interface CalendarEventProps {
  event: CalendarEventType;
  onClick: () => void;
}

const CalendarEventComponent: React.FC<CalendarEventProps> = ({ event, onClick }) => {
  const getEventTypeLabel = () => {
    switch (event.type) {
      case 'task':
        return 'Task';
      case 'deadline':
        return 'Deadline';
      case 'lifecycle':
        return 'Lifecycle';
      default:
        return 'Event';
    }
  };

  return (
    <div
      className={`calendar-event calendar-event-${event.type}`}
      style={{ borderLeftColor: event.color || '#6c757d' }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={event.title}
    >
      <div className="calendar-event-title">{event.title}</div>
      {event.fieldName && (
        <div className="calendar-event-field">{event.fieldName}</div>
      )}
    </div>
  );
};

export default CalendarEventComponent;
