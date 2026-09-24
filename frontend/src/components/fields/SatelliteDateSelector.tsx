import React from 'react';
import { useTranslation } from 'react-i18next';
import { SatelliteDate } from '../../services/geospatialService';
import { groupSatelliteDatesByYear } from '../../utils/sentinelStatus';
import './SatelliteDateSelector.css';

interface Props {
  dates: SatelliteDate[];
  selectedId?: string;
  onSelect: (observationId: string) => void;
  compareId?: string;
  onCompareSelect: (observationId: string | undefined) => void;
}

/**
 * Clear days the satellite could see the field. Choosing a day updates the map
 * to that visit.
 */
const SatelliteDateSelector: React.FC<Props> = ({
  dates,
  selectedId,
  onSelect,
  compareId,
  onCompareSelect,
}) => {
  const { t, i18n } = useTranslation(['fields', 'common']);
  const compareMode = Boolean(compareId);
  const locale = i18n.language;
  const usable = [...dates.filter((date) => date.isUsable)].sort(
    (a, b) => new Date(b.observationDate).getTime() - new Date(a.observationDate).getTime()
  );
  const yearGroups = groupSatelliteDatesByYear(usable);

  if (!usable.length) {
    return (
      <div className="satellite-dates satellite-dates--empty">
        {t('fields:mapLayers.noSatelliteDates')}
      </div>
    );
  }

  const comparableDates = usable.filter((d) => d.observationId !== selectedId);
  const selectedDate = usable.find((d) => d.observationId === selectedId);
  const compareDate = usable.find((d) => d.observationId === compareId);

  const dayLabel = (date: SatelliteDate) =>
    new Date(date.observationDate).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
    });

  return (
    <div className={`satellite-dates${compareMode ? ' satellite-dates--compare' : ''}`}>
      <div className="satellite-dates-header">
        <span>{t('fields:mapLayers.observationDate')}</span>
        <button
          type="button"
          className={`satellite-dates-compare${compareMode ? ' is-on' : ''}`}
          onClick={() =>
            compareMode
              ? onCompareSelect(undefined)
              : onCompareSelect(comparableDates[0]?.observationId)
          }
          disabled={!compareMode && comparableDates.length === 0}
        >
          {compareMode ? t('fields:mapLayers.singleDate') : t('fields:mapLayers.compareDates')}
        </button>
      </div>

      {compareMode ? (
        <p className="satellite-dates-hint">{t('fields:mapLayers.comparePick')}</p>
      ) : null}

      {compareMode && selectedDate && compareDate ? (
        <p className="satellite-dates-pair">
          <span className="satellite-dates-chip satellite-dates-chip--a">
            {t('fields:mapLayers.dateA')} · {dayLabel(selectedDate)}
          </span>
          <span className="satellite-dates-pair-sep" aria-hidden>
            ↔
          </span>
          <span className="satellite-dates-chip satellite-dates-chip--b">
            {t('fields:mapLayers.dateB')} · {dayLabel(compareDate)}
          </span>
        </p>
      ) : null}

      {yearGroups.map((group) => (
        <div key={group.year} className="satellite-dates-year">
          {yearGroups.length > 1 ? (
            <p className="satellite-dates-year-label">{group.year}</p>
          ) : null}
          <div
            className="satellite-dates-strip"
            role="listbox"
            aria-label={`${t('fields:mapLayers.observationDate')} ${group.year}`}
          >
            {group.dates.map((date) => {
              const isSelected = date.observationId === selectedId;
              const isCompare = date.observationId === compareId;
              const classes = ['satellite-date'];
              if (isSelected) classes.push('satellite-date--selected');
              if (isCompare) classes.push('satellite-date--compare');

              return (
                <button
                  key={date.observationId}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={classes.join(' ')}
                  onClick={() =>
                    compareMode && !isSelected
                      ? onCompareSelect(date.observationId)
                      : onSelect(date.observationId)
                  }
                >
                  <span className="satellite-date-day">{dayLabel(date)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SatelliteDateSelector;
