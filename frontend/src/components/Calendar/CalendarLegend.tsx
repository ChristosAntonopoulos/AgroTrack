import React from 'react';
import { useTranslation } from 'react-i18next';
import { TaskTemplateCategory } from '../../types/oliveTaskTemplate';
import { CATEGORY_STYLES, TASK_CATEGORIES } from '../../utils/taskTemplateUtils';
import './CalendarLegend.css';

const CalendarLegend: React.FC = () => {
  const { t } = useTranslation('calendar');

  const categories = TASK_CATEGORIES.filter(
    (c): c is TaskTemplateCategory => c !== 'All'
  ).slice(0, 6);

  return (
    <div className="calendar-legend" aria-label={t('legend')}>
      <span className="calendar-legend-title">{t('legend')}</span>
      <div className="calendar-legend-items">
        {categories.map((category) => {
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
          <span className="calendar-legend-swatch calendar-legend-swatch--dashed" aria-hidden />
          <span>{t('legendRecommended')}</span>
        </div>
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
