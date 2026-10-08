import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  ChevronRight,
  Droplets,
  Leaf,
  MapPinned,
  Users} from 'lucide-react';
import type { Field } from '../../services/fieldService';
import type { FieldOverviewDto } from '../../services/fieldOverviewService';
import type { FieldWeather } from '../../services/geospatialService';
import FieldDetailMap from './FieldDetailMap';
import FieldYearGlance from './FieldYearGlance';
import FieldPeopleStrip from './FieldPeopleStrip';
import GroveEnrichmentCards from './GroveEnrichmentCards';
import ChronologioCategoryIcon from '../Chronologio/ChronologioCategoryIcon';
import { presentGroveWeather } from '../../weather/presentGroveWeather';
import { myOilPath } from '../../navigation/intents';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';

type Props = {
  field: Field;
  overview: FieldOverviewDto | null;
  weather: FieldWeather | null;
  onOpenChronologio: (entryId?: string) => void;
  onOpenMap: () => void;
  onOpenStatus: () => void;
  canViewMoney?: boolean;
  canEdit?: boolean;
};

const FieldOverview: React.FC<Props> = ({
  field,
  overview,
  weather,
  onOpenChronologio,
  onOpenMap,
  onOpenStatus,
  canViewMoney = true,
  canEdit = false}) => {
  const { t } = useTranslation(['fields', 'chronologio']);
  const { formatRelativeTime, formatDate } = useLocaleFormatters();
  const latest = overview?.current.latestRecord;
  const showMap = field.capabilities?.canViewEnvironmentalData !== false;
  const showHistory = field.capabilities?.canViewChronologio !== false && Boolean(overview);
  const weatherView = presentGroveWeather({ field: weather });
  const weatherLine =
    weatherView.mood === 'missing'
      ? overview?.weather?.headline || null
      : [
          weatherView.temperature != null ? `${weatherView.temperature}°` : null,
          t(`chronologio:weatherCard.condition.${weatherView.conditionKey}`, {
            defaultValue: weatherView.conditionKey,
          }),
        ]
          .filter(Boolean)
          .join(' · ');

  const whenLabel = (iso: string) => {
    try {
      return formatRelativeTime(iso);
    } catch {
      return formatDate(iso);
    }
  };

  const peopleHref = `/partners?fieldId=${encodeURIComponent(field.id)}`;
  const cellar = overview?.production.oilCurrentlyInCellarLitres;

  return (
    <div className="field-overview field-overview--v2">
      <GroveEnrichmentCards field={field} canEdit={canEdit} />

      <section className="field-today-strip" aria-labelledby="field-today-strip-title">
        <h2 id="field-today-strip-title" className="field-overview-kicker">
          {t('overview.weather.today')}
        </h2>
        {weatherLine ? <p className="field-today-weather">{weatherLine}</p> : null}
        <p className="field-today-task">
          {t('overview.today.noTask')}
        </p>
        {latest ? (
          <p className="field-today-last">
            {t('overview.today.last', {
              title: latest.title,
              when: whenLabel(latest.occurredAt),
            })}
          </p>
        ) : (
          <p className="field-today-last field-today-last--muted">
            {t('overview.statusStrip.noRecording')}
          </p>
        )}
      </section>

      {showMap ? (
        <section className="field-overview-map-card field-overview-map-card--solo" aria-labelledby="field-map-peek-title">
          <button type="button" className="field-overview-section-link" onClick={onOpenMap}>
            <h2 id="field-map-peek-title">
              <MapPinned size={16} strokeWidth={2} aria-hidden />
              {t('overview.mapPeek.title')}
            </h2>
            <ChevronRight size={18} aria-hidden />
          </button>
          <div className="field-overview-map-stage">
            <FieldDetailMap
              field={field}
              heightPx={280}
              variant="peek"
              weather={weather}
              onOpenMapTab={onOpenMap}
            />
            <button type="button" className="field-overview-layers-btn" onClick={onOpenMap}>
              {t('overview.mapPeek.layers')}
            </button>
          </div>
        </section>
      ) : null}

      <button type="button" className="field-status-row" onClick={onOpenStatus}>
        <span className="field-status-row-icon" aria-hidden>
          <Leaf size={18} strokeWidth={2} />
        </span>
        <span className="field-status-row-body">
          <strong>{t('overview.statusCard.title')}</strong>
          <span>{t('overview.statusCard.hint')}</span>
        </span>
        <ChevronRight size={18} aria-hidden />
      </button>

      {overview ? <FieldYearGlance overview={overview} canViewMoney={canViewMoney} /> : null}

      <FieldPeopleStrip fieldId={field.id} />

      {showHistory && overview ? (
        <section className="field-recent-history" aria-labelledby="field-recent-history-title">
          <div className="field-overview-section-head">
            <h2 id="field-recent-history-title">{t('overview.recentHistory')}</h2>
            <button
              type="button"
              className="field-overview-cta field-overview-cta--ghost"
              onClick={() => onOpenChronologio()}
            >
              {t('overview.seeAllChronologioShort')}
              <ChevronRight size={15} aria-hidden />
            </button>
          </div>
          {overview.recentHistory.length === 0 ? (
            <p className="field-empty-line">{t('overview.statusStrip.noRecording')}</p>
          ) : (
            <ul className="field-recent-history-list">
              {overview.recentHistory.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => onOpenChronologio(item.id)}>
                    <span className="field-recent-icon" aria-hidden>
                      <ChronologioCategoryIcon category={item.type} size={16} />
                    </span>
                    <span className="field-recent-body">
                      <strong>{item.title}</strong>
                      {item.summary ? <span className="field-recent-summary">{item.summary}</span> : null}
                    </span>
                    <span className="field-recent-when">{whenLabel(item.occurredAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <nav className="field-overview-more" aria-label={t('overview.more.aria')}>
        <p className="field-overview-kicker">{t('overview.more.title')}</p>
        <ul>
          <li>
            <button type="button" onClick={() => onOpenChronologio()}>
              <BookOpen size={16} aria-hidden />
              <span>
                <strong>{t('detail.timeline')}</strong>
                {latest ? <em>{latest.title}</em> : null}
              </span>
              <ChevronRight size={16} aria-hidden />
            </button>
          </li>
          <li>
            <Link to={peopleHref}>
              <Users size={16} aria-hidden />
              <span>
                <strong>{t('overview.people.title')}</strong>
              </span>
              <ChevronRight size={16} aria-hidden />
            </Link>
          </li>
          <li>
            <Link to={myOilPath({ field: field.id })}>
              <Droplets size={16} aria-hidden />
              <span>
                <strong>{t('overview.more.cellar')}</strong>
                {cellar != null && cellar > 0.05 ? (
                  <em>
                    {cellar.toLocaleString(undefined, { maximumFractionDigits: 0 })} L
                  </em>
                ) : null}
              </span>
              <ChevronRight size={16} aria-hidden />
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default FieldOverview;
