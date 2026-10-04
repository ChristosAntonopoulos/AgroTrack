import React from 'react';
import { useTranslation } from 'react-i18next';
import { CloudRain, DropletOff, Flame, Snowflake, ThermometerSnowflake } from 'lucide-react';
import type { ChronologioEntry } from '../../services/chronologioService';
import {
  extremeKindFromEventType,
  extremeMetricLine,
  extremeVisualTone,
  formatExtremeDateRange,
  type ExtremeVisualTone,
} from '../../chronologio/weatherExtreme';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import './Chronologio.css';

type Props = {
  entry: ChronologioEntry;
  showField?: boolean;
};

const iconFor = (tone: ExtremeVisualTone) => {
  switch (tone) {
    case 'heat':
      return <Flame size={13} strokeWidth={2.4} aria-hidden />;
    case 'drought':
      return <DropletOff size={13} strokeWidth={2.4} aria-hidden />;
    case 'rain':
      return <CloudRain size={13} strokeWidth={2.4} aria-hidden />;
    case 'frost':
      return <Snowflake size={13} strokeWidth={2.4} aria-hidden />;
    case 'cold':
      return <ThermometerSnowflake size={13} strokeWidth={2.4} aria-hidden />;
    default:
      return <Flame size={13} strokeWidth={2.4} aria-hidden />;
  }
};

/**
 * Compact hazard pill (NWS/WMO-style alert chip): solid high-contrast colour,
 * content-sized — sits in the timeline flow without filling the row.
 */
const ChronologioExtremeBanner: React.FC<Props> = ({ entry, showField = false }) => {
  const { t, i18n } = useTranslation('chronologio');
  const numberLocale = i18n.language?.startsWith('el')
    ? 'el-GR'
    : i18n.language?.startsWith('it')
      ? 'it-IT'
      : 'en-US';

  const weather = entry.details.weather;
  const kind =
    weather?.extremeKind || extremeKindFromEventType(entry.eventType) || 'heatwave';
  const tone = extremeVisualTone(kind);
  const kindLabel = t(`extremeWeather.kinds.${kind}`, { defaultValue: entry.title });
  const period = formatExtremeDateRange(
    weather?.extremeStartDate,
    weather?.extremeEndDate,
    i18n.language
  );
  const streak =
    weather?.streakDays != null && weather.streakDays > 0
      ? t('extremeWeather.days', { count: weather.streakDays })
      : null;
  const metrics = extremeMetricLine(weather, numberLocale, kind);
  const fieldName =
    showField && entry.field?.name ? friendlyFieldLabel(entry.field.name) : null;

  // Single-line meta: duration first (most salient), then temps/rain, period, field.
  const trail = [streak, metrics, period, fieldName].filter(Boolean) as string[];

  return (
    <div className="chrono-extreme-wrap">
      <article
        className={`chrono-extreme-pill is-${tone}`}
        aria-label={`${kindLabel}${trail.length ? `, ${trail.join(', ')}` : ''}`}
      >
        <span className="chrono-extreme-pill-icon">{iconFor(tone)}</span>
        <span className="chrono-extreme-pill-kind">{kindLabel}</span>
        {trail.map((part) => (
          <React.Fragment key={part}>
            <span className="chrono-extreme-pill-dot" aria-hidden>
              ·
            </span>
            <span className="chrono-extreme-pill-meta">{part}</span>
          </React.Fragment>
        ))}
      </article>
    </div>
  );
};

export default ChronologioExtremeBanner;
