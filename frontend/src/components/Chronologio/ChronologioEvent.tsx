import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckSquare,
  Wallet,
  Wheat,
  StickyNote,
  CloudRain,
  Sparkles,
  Leaf,
  Users,
  Activity,
  Camera,
} from 'lucide-react';
import type { ChronologioEntry, ChronologioCategory } from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import ChronologioEntryCard from './ChronologioEntryCard';
import ChronologioThumbnail from './ChronologioThumbnail';
import { pickRealMediaUrl } from '../../chronologio/mediaGuard';
import { presentChronologioEvent } from '../../chronologio/eventPresentation';
import type { SupportedLocale } from '../../i18n/config';

export type EventDensity = 'summary' | 'compact' | 'card';

type Props = {
  entry: ChronologioEntry;
  density?: EventDensity;
  showField?: boolean;
  locale?: SupportedLocale;
  selected?: boolean;
  weatherTile?: boolean;
  onSelect?: (entry: ChronologioEntry) => void;
};

const iconFor = (category: string) => {
  switch (category) {
    case 'task':
      return <CheckSquare size={14} />;
    case 'expense':
      return <Wallet size={14} />;
    case 'harvest':
      return <Wheat size={14} />;
    case 'note':
      return <StickyNote size={14} />;
    case 'weather':
      return <CloudRain size={14} />;
    case 'intelligence':
      return <Sparkles size={14} />;
    case 'lifecycle':
      return <Leaf size={14} />;
    case 'collaborator':
      return <Users size={14} />;
    case 'photo':
      return <Camera size={14} />;
    default:
      return <Activity size={14} />;
  }
};

/** 24h clock — avoids broken π.μ. / μ.μ. line breaks in Greek locales. */
const formatEventTime = (iso: string, lang: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(lang, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const ChronologioEvent: React.FC<Props> = ({
  entry,
  density = 'card',
  showField = false,
  locale = 'el',
  selected = false,
  weatherTile = false,
  onSelect,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const numberLocale = i18n.language?.startsWith('el')
    ? 'el-GR'
    : i18n.language?.startsWith('it')
      ? 'it-IT'
      : 'en-US';
  const presented = presentChronologioEvent(entry, i18n.language);
  const category = entry.category as ChronologioCategory;
  const harvest = entry.details.harvest;
  const time = formatEventTime(entry.occurredAt, i18n.language);
  const thumb = pickRealMediaUrl(
    (entry.media || []).flatMap((m) => [m.thumbnailUrl, m.url])
  );
  const extraPhotos = Math.max(0, (entry.media?.length || 0) - 1);

  if (density === 'summary') {
    return (
      <button
        type="button"
        className={`chrono-event-summary chrono-cat-${category}${selected ? ' is-selected' : ''}`}
        onClick={() => onSelect?.(entry)}
      >
        <span className="chrono-event-summary-icon" aria-hidden>
          {iconFor(category)}
        </span>
        <span className="chrono-event-summary-label">{presented.shortLabel}</span>
        <span>{presented.label}</span>
      </button>
    );
  }

  if (density === 'compact') {
    const money =
      (category === 'expense' || category === 'income' || entry.amount) && entry.amount
        ? formatChronologioMoney(entry.amount.value, entry.amount.currency, numberLocale)
        : null;
    return (
      <button
        type="button"
        className={`chrono-event-compact chrono-cat-${category}${selected ? ' is-selected' : ''}`}
        onClick={() => onSelect?.(entry)}
      >
        <span className="chrono-event-compact-time">{time}</span>
        <span className="chrono-event-compact-body">
          <span className="chrono-event-compact-cat">
            <span className="chrono-event-compact-icon" aria-hidden>
              {iconFor(category)}
            </span>
            {presented.shortLabel}
          </span>
          <span className="chrono-event-compact-title">{presented.label}</span>
          {showField && entry.field?.name ? (
            <span className="chrono-event-compact-field">{entry.field.name}</span>
          ) : null}
        </span>
        {money ? <span className="chrono-event-compact-value">{money}</span> : null}
        {category === 'harvest' && harvest && harvest.oliveKg > 0 ? (
          <span className="chrono-event-compact-value">
            {harvest.oliveKg.toLocaleString(numberLocale, { maximumFractionDigits: 0 })} kg
          </span>
        ) : null}
        {thumb ? (
          <ChronologioThumbnail
            src={thumb}
            className="chrono-event-compact-thumb"
            extraCount={extraPhotos}
          />
        ) : null}
      </button>
    );
  }

  return (
    <div className={`chrono-event-card-wrap${selected ? ' is-selected' : ''}`}>
      <ChronologioEntryCard
        entry={entry}
        showField={showField}
        locale={locale}
        selected={selected}
        weatherTile={weatherTile}
        onSelect={onSelect}
      />
    </div>
  );
};

export default ChronologioEvent;
