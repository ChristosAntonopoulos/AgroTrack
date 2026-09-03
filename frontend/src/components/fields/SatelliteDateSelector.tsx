import React from 'react';
import { useTranslation } from 'react-i18next';
import { SatelliteDate } from '../../services/geospatialService';
import './SatelliteDateSelector.css';

interface Props {
  dates: SatelliteDate[];
  selectedId?: string;
  onSelect: (observationId: string) => void;
  compareId?: string;
  onCompareSelect: (observationId: string | undefined) => void;
}

/**
 * Date strip for satellite overlays. Cloud-affected dates stay visible but are marked
 * unusable, because a missing date is otherwise indistinguishable from a missing pass.
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

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });

  if (!dates.length) {
    return (
      <div className="satellite-dates satellite-dates--empty">
        {t('fields:mapLayers.noSatelliteDates')}
      </div>
    );
  }

  const comparableDates = dates.filter((d) => d.isUsable && d.observationId !== selectedId);

  const toggleCompare = () => {
    if (compareMode) {
      onCompareSelect(undefined);
      return;
    }
    // Default to the most recent other usable pass, which is the comparison a grower wants.
    onCompareSelect(comparableDates[0]?.observationId);
  };

  return (
    <div className="satellite-dates">
      <div className="satellite-dates-header">
        <span>{t('fields:mapLayers.observationDate')}</span>
        <button
          type="button"
          className={compareMode ? 'active' : ''}
          onClick={toggleCompare}
          disabled={!compareMode && comparableDates.length === 0}
        >
          {t('fields:mapLayers.compare')}
        </button>
      </div>

      <div className="satellite-dates-strip" role="listbox" aria-label={t('fields:mapLayers.observationDate')}>
        {dates.map((date) => {
          const isSelected = date.observationId === selectedId;
          const isCompare = date.observationId === compareId;
          const classes = ['satellite-date'];
          if (isSelected) classes.push('satellite-date--selected');
          if (isCompare) classes.push('satellite-date--compare');
          if (!date.isUsable) classes.push('satellite-date--unusable');

          return (
            <button
              key={date.observationId}
              type="button"
              role="option"
              aria-selected={isSelected}
              className={classes.join(' ')}
              onClick={() => (compareMode && !isSelected ? onCompareSelect(date.observationId) : onSelect(date.observationId))}
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
              <span className="satellite-date-day">{formatDate(date.observationDate)}</span>
              {date.ndviMean != null ? (
                <span className="satellite-date-ndvi">{date.ndviMean.toFixed(2)}</span>
              ) : (
                <span className="satellite-date-ndvi">
                  {Math.round(date.fieldCloudCoverPercent ?? date.cloudCoverPercent)}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {compareMode ? (
        <p className="satellite-dates-hint">{t('fields:mapLayers.compareHint')}</p>
      ) : null}
    </div>
  );
};

export default SatelliteDateSelector;
