import React from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { CalendarEvent } from '../../services/calendarService';
import { Field } from '../../services/fieldService';
import { RecommendedTemplateEntry } from '../../utils/calendarRecommendations';
import {
  getEventCategoryColor,
  getEventChipVariant,
  groupEventsByField,
} from '../../utils/calendarViewUtils';
import CalendarTaskChip from './CalendarTaskChip';
import './CalendarFieldView.css';

type Props = {
  events: CalendarEvent[];
  fields: Field[];
  recommended: RecommendedTemplateEntry[];
  locale: string;
  onEventClick: (event: CalendarEvent) => void;
  onScheduleTemplate?: (templateId: string, fieldId: string) => void;
};

const CalendarFieldView: React.FC<Props> = ({
  events,
  fields,
  recommended,
  locale,
  onEventClick,
  onScheduleTemplate,
}) => {
  const { t } = useTranslation('calendar');
  const dateLocale = locale === 'el' ? el : enUS;
  const fieldMap = new Map(fields.map((f) => [f.id, f.name]));
  const grouped = groupEventsByField(events, fieldMap);

  if (grouped.length === 0 && recommended.length === 0) {
    return (
      <div className="cal-field-view cal-field-view--empty">
        <p>{t('fieldViewEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="cal-field-view">
      {grouped.map(({ fieldId, fieldName, events: fieldEvents }) => (
        <section key={fieldId} className="cal-field-group">
          <h3 className="cal-field-group-title">{fieldName}</h3>
          <ul className="cal-field-list">
            {fieldEvents.map((event) => (
              <li key={event.id}>
                <button type="button" className="cal-field-item" onClick={() => onEventClick(event)}>
                  <span className="cal-field-item-date">
                    {format(new Date(event.start), 'EEE d MMM', { locale: dateLocale })}
                  </span>
                  <CalendarTaskChip
                    as="span"
                    label={event.title}
                    categoryColor={getEventCategoryColor(event)}
                    variant={getEventChipVariant(event)}
                    priority={event.priority}
                  />
                  {event.priority && <span className="cal-field-priority">{event.priority}</span>}
                </button>
              </li>
            ))}
          </ul>

          {recommended.length > 0 && onScheduleTemplate && (
            <div className="cal-field-recs">
              <h4>{t('recommendedForField')}</h4>
              {recommended
                .filter((r) => r.recommended)
                .slice(0, 3)
                .map((entry) => (
                  <button
                    key={entry.template.id}
                    type="button"
                    className="cal-field-rec-btn"
                    onClick={() => onScheduleTemplate(entry.template.id, fieldId)}
                  >
                    <CalendarTaskChip
                      as="span"
                      label={entry.template.title}
                      categoryColor={entry.categoryBorder}
                      variant="recommended"
                      priority={entry.template.priority}
                    />
                  </button>
                ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
};

export default CalendarFieldView;
