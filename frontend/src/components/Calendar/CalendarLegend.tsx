import React from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORY_STYLES, LEGEND_CATEGORIES } from '../../utils/taskCategoryColors';
import './CalendarLegend.css';

const CalendarLegend: React.FC = () => {
  const { t } = useTranslation('calendar');

  return (
    <div className="calendar-legend" aria-label={t('legend')}>
      <span className="calendar-legend-title">{t('legend')}</span>
      <div className="calendar-legend-items">
        {LEGEND_CATEGORIES.map((category) => {
          const style = CATEGORY_STYLES[category];
          return (
            <div key={category} className="calendar-legend-item">
              <span
                className="calendar-legend-swatch calendar-legend-swatch--solid"
                style={{ borderColor: style.border, background: style.chipBg }}
                aria-hidden
              />
              <span>{category}</span>
            </div>
          );
        })}
        <div className="calendar-legend-item">
          <span className="calendar-legend-swatch calendar-legend-swatch--overdue" aria-hidden />
          <span>{t('legendOverdue')}</span>
        </div>
        <div className="calendar-legend-item">
          <span className="calendar-legend-swatch calendar-legend-swatch--done" aria-hidden />
          <span>{t('legendCompleted')}</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarLegend;
