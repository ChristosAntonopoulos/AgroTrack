import React from 'react';
import { useTranslation } from 'react-i18next';
import { RecommendedTemplateEntry } from '../../utils/calendarRecommendations';
import './CalendarSeasonRibbon.css';

type Props = {
  entries: RecommendedTemplateEntry[];
  onSelect?: (templateId: string) => void;
};

const CalendarSeasonRibbon: React.FC<Props> = ({ entries, onSelect }) => {
  const { t } = useTranslation('calendar');

  if (entries.length === 0) {
    return (
      <p className="cal-season-empty">{t('calendar:noRecommendedMonth')}</p>
    );
  }

  return (
    <div className="cal-season-ribbon">
      <span className="cal-season-label">{t('calendar:seasonRibbon')}</span>
      <div className="cal-season-scroll">
        {entries.map(({ template, categoryBg, categoryColor, categoryBorder, recommended }) => (
          <button
            key={template.id}
            type="button"
            className={`cal-season-chip${recommended ? ' cal-season-chip--active' : ''}`}
            style={{
              background: categoryBg,
              color: categoryColor,
              borderColor: categoryBorder,
              boxShadow: recommended ? `0 0 0 2px ${categoryBorder}44` : undefined,
            }}
            onClick={() => onSelect?.(template.id)}
            title={template.shortDescription}
          >
            <span className="cal-season-chip-dot" style={{ background: categoryBorder }} />
            {template.title}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CalendarSeasonRibbon;
