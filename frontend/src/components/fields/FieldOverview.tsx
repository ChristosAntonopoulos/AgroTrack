import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import type { FieldOverviewDto } from '../../services/fieldOverviewService';
import type { FieldWeather } from '../../services/geospatialService';
import FieldDetailMap from './FieldDetailMap';
import FieldYearGlance from './FieldYearGlance';
import FieldPhotosStrip from './FieldPhotosStrip';
import GroveEnrichmentCards from './GroveEnrichmentCards';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';

type Props = {
  field: Field;
  overview: FieldOverviewDto | null;
  weather: FieldWeather | null;
  onOpenChronologio: (entryId?: string) => void;
  onOpenMap: () => void;
  canViewMoney?: boolean;
  canEdit?: boolean;
};

const FieldOverview: React.FC<Props> = ({
  field,
  overview,
  weather,
  onOpenChronologio,
  onOpenMap,
  canViewMoney = true,
  canEdit = false,
}) => {
  const { t } = useTranslation('fields');
  const { formatRelativeTime, formatDate } = useLocaleFormatters();
  const attention = overview?.current.primaryAttention;
  const latest = overview?.current.latestRecord;
  const hasAttention = Boolean(attention && attention.severity === 'warning');

  const whenLabel = (iso: string) => {
    try {
      return formatRelativeTime(iso);
    } catch {
      return formatDate(iso);
    }
  };

  return (
    <div className="field-overview">
      <GroveEnrichmentCards field={field} canEdit={canEdit} />

      <section
        className={`field-priority-card ${hasAttention ? 'field-priority-card--warn' : 'field-priority-card--ok'}`}
        aria-labelledby="field-priority-title"
      >
        {hasAttention && attention ? (
          <>
            <p className="field-priority-kicker">{t('overview.priority.needsNow')}</p>
            <h2 id="field-priority-title">{attention.label}</h2>
            <p>{attention.detail}</p>
            {attention.href ? (
              <Link className="field-attention-secondary" to={attention.href}>
                {t('overview.priority.open')}
              </Link>
            ) : null}
          </>
        ) : (
          <>
            <p className="field-priority-kicker">{t('overview.priority.allOk')}</p>
            <h2 id="field-priority-title">{t('overview.priority.nothingUrgent')}</h2>
            {latest ? (
              <p>
                {t('overview.priority.lastRecord', {
                  title: latest.title,
                  when: whenLabel(latest.occurredAt),
                })}
              </p>
            ) : (
              <p>{t('overview.statusStrip.noRecording')}</p>
            )}
          </>
        )}
      </section>

      {field.capabilities?.canViewEnvironmentalData !== false ? (
        <section className="field-overview-map-card" aria-labelledby="field-map-peek-title">
          <h2 id="field-map-peek-title">{t('overview.mapPeek.title')}</h2>
          <FieldDetailMap
            field={field}
            heightPx={220}
            variant="peek"
            weather={weather}
            onOpenMapTab={onOpenMap}
          />
          <p className="field-overview-map-meta">
            {overview?.field.areaStremmata != null
              ? t('overview.mapPeek.areaBoundary', {
                  area: overview.field.areaStremmata.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  }),
                  boundary:
                    overview.field.boundaryStatus === 'complete'
                      ? t('overview.mapPeek.boundaryComplete')
                      : t('overview.mapPeek.boundaryMissing'),
                })
              : null}
          </p>
          <button type="button" className="field-weather-more" onClick={onOpenMap}>
            {t('overview.mapPeek.openMap')}
          </button>
        </section>
      ) : null}

      {overview?.weather ? (
        <section className="field-overview-weather-short" aria-labelledby="field-weather-short">
          <h2 id="field-weather-short">{t('overview.weather.today')}</h2>
          <p className="field-weather-headline">{overview.weather.headline}</p>
          {overview.weather.recommendation ? <p>{overview.weather.recommendation}</p> : null}
          {overview.weather.sourceLabel ? (
            <p className="field-weather-source">{overview.weather.sourceLabel}</p>
          ) : null}
          <button type="button" className="field-weather-more" onClick={onOpenMap}>
            {t('overview.weather.seeEnvironment')}
          </button>
        </section>
      ) : null}

      <div className="field-overview-lower">
        {overview ? <FieldYearGlance overview={overview} canViewMoney={canViewMoney} /> : null}

        {field.capabilities?.canViewChronologio !== false && overview ? (
          <section className="field-recent-history" aria-labelledby="field-recent-history-title">
            <h2 id="field-recent-history-title">{t('overview.recentHistory')}</h2>
            {overview.recentHistory.length === 0 ? (
              <p className="fd-empty">{t('overview.statusStrip.noRecording')}</p>
            ) : (
              <ul className="field-recent-history-list">
                {overview.recentHistory.map((item) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => onOpenChronologio(item.id)}>
                      <span className="field-recent-when">{whenLabel(item.occurredAt)}</span>
                      <strong>{item.title}</strong>
                      {item.summary ? <span>{item.summary}</span> : null}
                      {item.amount != null ? (
                        <em>
                          {item.amount.toLocaleString(undefined, {
                            style: 'currency',
                            currency: item.currency || 'EUR',
                          })}
                        </em>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>

      {field.capabilities?.canViewPhotos !== false ? (
        <FieldPhotosStrip fieldId={field.id} photos={overview?.photos ?? null} />
      ) : null}
    </div>
  );
};

export default FieldOverview;
