import React from 'react';
import { useTranslation } from 'react-i18next';
import { SatelliteDate } from '../../services/geospatialService';
import { formatSatellitePassLabel, groupSatelliteDatesByYear } from '../../utils/sentinelStatus';
import './SatelliteDateSelector.css';

interface Props {
  dates: SatelliteDate[];
  selectedId?: string;
  onSelect: (observationId: string) => void;
  compareId?: string;
  onCompareSelect: (observationId: string | undefined) => void;
  idleHint?: boolean;
}

/**
 * Date filmstrip for satellite overlays. Compare mode picks a second pass and
 * the map swipe (EOSDA / Sentinel Hub pattern) shows the two dates side by side.
 */
const SatelliteDateSelector: React.FC<Props> = ({
  dates,
  selectedId,
  onSelect,
  compareId,
  onCompareSelect,
  idleHint = false,
}) => {
  const { t, i18n } = useTranslation(['fields', 'common']);
  const compareMode = Boolean(compareId);
  const locale = i18n.language;
  const yearGroups = groupSatelliteDatesByYear(dates);

  if (!dates.length) {
    return (
      <div className="satellite-dates satellite-dates--empty">
        {t('fields:mapLayers.noSatelliteDates')}
      </div>
    );
  }

  const comparableDates = dates.filter((d) => d.isUsable && d.observationId !== selectedId);
  const selectedDate = dates.find((d) => d.observationId === selectedId);
  const compareDate = dates.find((d) => d.observationId === compareId);

  const toggleCompare = () => {
    if (compareMode) {
      onCompareSelect(undefined);
      return;
    }
    onCompareSelect(comparableDates[0]?.observationId);
  };

  const formatChip = (date: SatelliteDate) =>
    formatSatellitePassLabel(date, locale, { includeNdvi: true, includeCloud: true });

  return (
    <div className={`satellite-dates${compareMode ? ' satellite-dates--compare' : ''}`}>
      <div className="satellite-dates-header">
        <span>{t('fields:mapLayers.observationDate')}</span>
        <div className="satellite-dates-mode" role="group" aria-label={t('fields:mapLayers.compare')}>
          <button
            type="button"
            className={!compareMode ? 'active' : ''}
            onClick={() => onCompareSelect(undefined)}
          >
            {t('fields:mapLayers.singleDate')}
          </button>
          <button
            type="button"
            className={compareMode ? 'active' : ''}
            onClick={toggleCompare}
            disabled={!compareMode && comparableDates.length === 0}
          >
            {t('fields:mapLayers.compareDates')}
          </button>
        </div>
      </div>

      {compareMode && selectedDate && compareDate ? (
        <p className="satellite-dates-pair">
          <span className="satellite-dates-chip satellite-dates-chip--a">
            {t('fields:mapLayers.dateA')} · {formatChip(selectedDate)}
          </span>
          <span className="satellite-dates-pair-sep" aria-hidden>
            ↔
          </span>
          <span className="satellite-dates-chip satellite-dates-chip--b">
            {t('fields:mapLayers.dateB')} · {formatChip(compareDate)}
          </span>
        </p>
      ) : null}

      {yearGroups.map((group) => (
        <div key={group.year} className="satellite-dates-year">
          {yearGroups.length > 1 ? (
            <p className="satellite-dates-year-label">{group.year}</p>
          ) : null}
          <div className="satellite-dates-strip" role="listbox" aria-label={`${t('fields:mapLayers.observationDate')} ${group.year}`}>
            {group.dates.map((date) => {
              const isSelected = date.observationId === selectedId;
              const isCompare = date.observationId === compareId;
              const classes = ['satellite-date'];
              if (isSelected) classes.push('satellite-date--selected');
              if (isCompare) classes.push('satellite-date--compare');
              if (!date.isUsable) classes.push('satellite-date--unusable');

              const ndviLabel =
                date.ndviMean != null
                  ? date.ndviMean.toLocaleString(locale, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : t('fields:mapLayers.noData');

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
                  disabled={!date.isUsable}
                  title={
                    date.isUsable
                      ? t('fields:mapLayers.dateUsable', {
                          cloud: Math.round(date.fieldCloudCoverPercent ?? date.cloudCoverPercent),
                          usable: Math.round(date.usablePixelPercent ?? 0),
                        })
                      : t('fields:mapLayers.dateUnusable', {
                          cloud: Math.round(date.fieldCloudCoverPercent ?? date.cloudCoverPercent),
                        })
                  }
                >
                  {isSelected ? <span className="satellite-date-tag">A</span> : null}
                  {isCompare ? <span className="satellite-date-tag satellite-date-tag--b">B</span> : null}
                  <span className="satellite-date-day">
                    {new Date(date.observationDate).toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="satellite-date-ndvi">{ndviLabel}</span>
                  {date.isUsable ? (
                    <span className="satellite-date-cloud">
                      {Math.round(date.fieldCloudCoverPercent ?? date.cloudCoverPercent ?? 0)}%
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {idleHint && !compareMode ? (
        <p className="satellite-dates-hint">{t('fields:mapLayers.looks.pickDate')}</p>
      ) : null}

      {compareMode ? (
        <p className="satellite-dates-hint">{t('fields:mapLayers.comparePick')}</p>
      ) : null}
    </div>
  );
};

export default SatelliteDateSelector;
