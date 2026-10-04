import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import ChronologioCategoryIcon from './ChronologioCategoryIcon';
import { ChronologioMediaImage } from './ChronologioThumbnail';
import type { ChronologioEntry, ChronologioCategory } from '../../services/chronologioService';
import { formatChronologioMoney, formatChronologioMoneySigned } from '../../utils/chronologioGrouping';
import { taskStatusI18nKey } from '../../utils/categoryNormalize';
import {
  presentActorName,
  presentChronologioEvent,
  presentExpenseChip,
  presentHarvestQuality,
  presentMetaLabel,
} from '../../chronologio/eventPresentation';
import type { SupportedLocale } from '../../i18n/config';
import { resolveFieldColor } from '../../utils/fieldColors';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { eventAccentToken, eventCardSize } from '../../chronologio/eventCardLayout';
import { isDateOnlyTimestamp } from '../../chronologio/clockLabel';
import { chronologioWebDestination, isChronologioMergedHarvestDay } from '../../chronologio/entryDestination';
import { waterGapCopy } from '../../utils/weatherReviewDisplay';
import HarvestDayJourney from './HarvestDayJourney';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import {
  chronologioScrollKey,
  saveChronologioFocus,
  saveChronologioJournalScroll,
  type ChronologioReturnState,
} from '../../chronologio/chronologioViewState';
import type { ChronologioZoom } from '../../chronologio/livingTypes';
import { isWeatherExtremeEventType } from '../../chronologio/weatherExtreme';
import ChronologioExtremeBanner from './ChronologioExtremeBanner';
import './Chronologio.css';

type Props = {
  entry: ChronologioEntry;
  showField: boolean;
  locale: SupportedLocale;
  onSelect?: (entry: ChronologioEntry) => void;
  selected?: boolean;
  /** Side-by-side multi-field weather tile — field first, minimal stats. */
  weatherTile?: boolean;
  /** Optional journal context so deep-links can restore date + scroll. */
  journalContext?: {
    zoom: ChronologioZoom;
    focusDate: string;
    fieldId?: string;
    scrollTop?: number;
  };
};

const categoryTone = (category: string, importance: string): string => {
  if (importance === 'critical') return 'is-critical';
  if (importance === 'warning') return 'is-warning';
  if (importance === 'positive') return 'is-positive';
  if (category === 'harvest') return 'is-harvest';
  if (category === 'expense' || category === 'income') return 'is-expense';
  if (category === 'task') return 'is-task';
  if (category === 'note' || category === 'photo') return 'is-note';
  if (category === 'weather') return 'is-weather';
  if (category === 'intelligence') return 'is-intelligence';
  return '';
};

const ChronologioEntryCard: React.FC<Props> = ({
  entry,
  showField,
  onSelect,
  selected = false,
  weatherTile = false,
  journalContext,
}) => {
  const { t, i18n } = useTranslation(['chronologio', 'common', 'fields']);
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const numberLocale = i18n.language?.startsWith('el')
    ? 'el-GR'
    : i18n.language?.startsWith('it')
      ? 'it-IT'
      : 'en-US';

  const presented = presentChronologioEvent(entry, i18n.language);
  const category = entry.category as ChronologioCategory;
  const tone = categoryTone(category, String(entry.importance));
  const harvest = entry.details.harvest;
  const expense = entry.details.expense;
  const weather = entry.details.weather;
  const intelligence = entry.details.intelligence;
  const lifecycle = entry.details.lifecycle;
  const media = entry.media?.filter((m) => m.thumbnailUrl || m.url).slice(0, 3) ?? [];
  const resolvedMedia = media.map((m) => ({
    ...m,
    thumbnailUrl: resolvePublicAssetUrl(m.thumbnailUrl || m.url) || m.thumbnailUrl || m.url,
    url: resolvePublicAssetUrl(m.url) || m.url,
  }));

  const persistReturnContext = () => {
    if (!journalContext) return;
    const key = chronologioScrollKey(journalContext);
    if (typeof journalContext.scrollTop === 'number') {
      saveChronologioJournalScroll(key, journalContext.scrollTop);
    }
    saveChronologioFocus({
      focusDate: journalContext.focusDate,
      zoom: journalContext.zoom,
      fieldId: journalContext.fieldId,
    });
  };

  const onActivate = () => {
    if (onSelect) {
      onSelect(entry);
      return;
    }
    const dest = chronologioWebDestination(entry);
    if (dest.kind === 'path') {
      persistReturnContext();
      const returnState: ChronologioReturnState = {
        search: location.search,
        scrollTop: journalContext?.scrollTop,
        focusDate: journalContext?.focusDate,
        zoom: journalContext?.zoom,
      };
      navigate(dest.path, { state: { chronologioReturn: returnState } });
      return;
    }
    if (dest.kind === 'noteEdit') {
      persistReturnContext();
      navigate('/chronologio');
      return;
    }
    setExpanded((v) => !v);
  };

  const isPeriodReview =
    entry.eventType === 'weather.monthReview' || entry.eventType === 'weather.yearReview';
  const waterGap =
    weather?.waterBalanceMm == null ? null : waterGapCopy(weather.waterBalanceMm, numberLocale, t);
  const isExtreme = isWeatherExtremeEventType(entry.eventType);

  // Extreme weather: compact colour strip only — not a selectable event card.
  if (isExtreme && !weatherTile) {
    return <ChronologioExtremeBanner entry={entry} showField={showField} />;
  }

  const fieldAccent = resolveFieldColor(entry.field?.color, entry.fieldId);
  const accent = eventAccentToken(category, String(entry.importance));
  const size = weatherTile ? 'compact' : eventCardSize(entry);
  const time = (() => {
    const money = category === 'expense' || category === 'income';
    if (money && isDateOnlyTimestamp(entry.occurredAt)) return '';
    const d = new Date(entry.occurredAt);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', hour12: false });
  })();
  const photoCount = entry.media?.length || 0;
  const actorName = presentActorName(entry.actor?.displayName, i18n.language);
  const fieldLabel =
    showField && entry.field?.name ? friendlyFieldLabel(entry.field.name) : null;
  const typeLabel = presentMetaLabel(
    isPeriodReview
      ? t(
          entry.eventType === 'weather.yearReview'
            ? 'chronologio:weatherReview.yearReport'
            : 'chronologio:weatherReview.monthReport'
        )
      : presented.shortLabel,
    i18n.language
  );
  const title = weatherTile
    ? entry.field?.name
      ? friendlyFieldLabel(entry.field.name)
      : presented.label
    : presented.label;
  const monthFact =
    isPeriodReview && weather && !weatherTile
      ? [
          weather.rainfallMm != null
            ? t('chronologio:weatherReview.rainChip', {
                mm: weather.rainfallMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 }),
              })
            : null,
          weather.temperatureMin != null && weather.temperatureMax != null
            ? t('chronologio:weatherReview.tempChip', {
                min: Math.round(weather.temperatureMin),
                max: Math.round(weather.temperatureMax),
              })
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : '';

  const isHarvestDay = isChronologioMergedHarvestDay(entry);
  const hasExtraDetails = Boolean(
    lifecycle?.message ||
      intelligence?.message ||
      intelligence?.recommendation ||
      (!isPeriodReview && weather?.source) ||
      (!isHarvestDay && (harvest?.mill || harvest?.quality)) ||
      expense?.description
  );

  const linkedParts = [
    category !== 'task' && expense?.relatedTaskTitle
      ? t('chronologio:relatedTask', { title: expense.relatedTaskTitle })
      : null,
    expense?.relatedHarvestTitle
      ? t('chronologio:relatedHarvest', { title: expense.relatedHarvestTitle })
      : null,
  ].filter(Boolean) as string[];

  const statusLabel =
    category === 'task' && entry.details.task?.status
      ? t(taskStatusI18nKey(entry.details.task.status))
      : null;

  return (
    <button
      type="button"
      className={`chronologio-event-card chronologio-event-card--${accent} is-${size}${tone ? ` ${tone}` : ''}${selected ? ' is-selected' : ''}${weatherTile ? ' is-weather-tile' : ''}${isPeriodReview && !weatherTile ? ' is-month-report' : ''}${category === 'harvest' ? ' is-harvest-day' : ''}${category === 'photo' ? ' chrono-cat-photo' : ''}`}
      style={
        weatherTile || category === 'harvest'
          ? ({ '--field-accent': fieldAccent } as React.CSSProperties)
          : undefined
      }
      aria-pressed={weatherTile ? selected : undefined}
      onClick={onActivate}
    >
      <div className="chronologio-card-top">
        {!weatherTile ? (
          <div className={`chronologio-card-icon ${tone}`}>
            <ChronologioCategoryIcon category={category} />
          </div>
        ) : null}
        <div className="chronologio-card-body">
          {/* 1. type */}
          <div className="chronologio-card-type chronologio-card-meta">
            {weatherTile ? (
              <span className="weather-pick-field">
                <span className="chrono-field-dot" style={{ background: fieldAccent }} aria-hidden />
                {typeLabel}
              </span>
            ) : (
              <span>{typeLabel}</span>
            )}
          </div>

          {/* 2. title — skip when it only repeats the category meta label */}
          {title && title.toLowerCase() !== typeLabel.toLowerCase() ? (
            <h3 className={`chronologio-card-title${weatherTile ? ' weather-pick-title' : ''}`}>
              {title}
            </h3>
          ) : null}

          {/* Type-specific metrics sit between title and shared meta slots */}
          {category === 'harvest' && harvest ? (
            <HarvestDayJourney
              compact
              harvest={harvest}
              numberLocale={numberLocale}
              fieldName={entry.field?.name}
              fieldAccent={fieldAccent}
            />
          ) : null}
          {isHarvestDay && presented.description ? (
            <p className="chronologio-harvest-day-summary">{presented.description}</p>
          ) : null}
          {presented.description && (category === 'note' || category === 'photo') ? (
            <p className="chronologio-card-summary is-clamped">{presented.description}</p>
          ) : null}

          {category === 'expense' || category === 'income' || (category === 'task' && entry.amount) ? (
            <div className="chronologio-expense-row">
              {entry.amount ? (
                <span className="chronologio-card-amount">
                  {category === 'expense' || category === 'income'
                    ? formatChronologioMoneySigned(
                        entry.amount.value,
                        entry.amount.currency,
                        numberLocale,
                        category
                      )
                    : formatChronologioMoney(entry.amount.value, entry.amount.currency, numberLocale)}
                </span>
              ) : null}
              {presentExpenseChip(entry, i18n.language) &&
              presentExpenseChip(entry, i18n.language) !== presented.label ? (
                <span className="chronologio-expense-cat">
                  {presentExpenseChip(entry, i18n.language)}
                </span>
              ) : null}
            </div>
          ) : null}

          {category === 'task' && entry.summary ? (
            <p className="chronologio-card-summary">{entry.summary}</p>
          ) : null}

          {category === 'weather' ? (
            <>
              {isPeriodReview && weather && weatherTile ? (
                <div className="weather-pick-metrics">
                  {weather.rainfallMm != null ? (
                    <div className="weather-pick-metric is-rain">
                      <strong>
                        {weather.rainfallMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 })} mm
                      </strong>
                      <span>{t('chronologio:weatherReview.rainMm')}</span>
                    </div>
                  ) : null}
                  {weather.temperatureMin != null && weather.temperatureMax != null ? (
                    <div className="weather-pick-metric is-temp">
                      <strong>
                        {weather.temperatureMin.toFixed(0)}°–{weather.temperatureMax.toFixed(0)}°
                      </strong>
                      <span>{t('chronologio:weatherReview.tempRange')}</span>
                    </div>
                  ) : null}
                  <div className={`weather-pick-metric${waterGap ? ` is-${waterGap.tone}` : ''}`}>
                    <strong>{waterGap ? waterGap.value : '—'}</strong>
                    <span>{waterGap ? waterGap.label : t('chronologio:weatherReview.waterMissing')}</span>
                  </div>
                </div>
              ) : monthFact ? (
                <p className="chronologio-card-summary">{monthFact}</p>
              ) : (
                <>
                  {entry.summary ? <p className="chronologio-card-summary">{entry.summary}</p> : null}
                  <span className="chronologio-weather-badge">
                    {weather?.rainfallMm != null
                      ? `${weather.rainfallMm} mm`
                      : t('chronologio:categoryLabel.weather')}
                  </span>
                </>
              )}
            </>
          ) : null}

          {category !== 'harvest' &&
          category !== 'expense' &&
          category !== 'income' &&
          category !== 'task' &&
          category !== 'note' &&
          category !== 'photo' &&
          category !== 'weather' &&
          entry.summary ? (
            <p className="chronologio-card-summary">{entry.summary}</p>
          ) : null}

          {/* 3. field · 4. date/time · 5. owner */}
          {(fieldLabel && !weatherTile) || (!isPeriodReview && time) || actorName ? (
            <div className="chronologio-card-foot">
              {fieldLabel && !weatherTile ? (
                <div className="chronologio-card-field">
                  <span className="chrono-field-dot" style={{ background: fieldAccent }} aria-hidden />
                  <span>{fieldLabel}</span>
                </div>
              ) : null}
              {!isPeriodReview && time ? (
                <time className="chronologio-card-when" dateTime={entry.occurredAt}>
                  {time}
                </time>
              ) : null}
              {actorName ? (
                <div className="chronologio-card-owner chronologio-card-actor">
                  {t('chronologio:fromActor', { name: actorName })}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* 6. status */}
          {statusLabel ? <span className="chronologio-card-status chronologio-task-status">{statusLabel}</span> : null}

          {/* 7. linked records */}
          {linkedParts.length > 0 ? (
            <div className="chronologio-card-linked">
              {linkedParts.map((part) => (
                <span key={part} className="chronologio-expense-cat">
                  {part}
                </span>
              ))}
            </div>
          ) : null}

          {photoCount > 0 && !resolvedMedia.length ? (
            <div className="chronologio-card-linked">
              {t('chronologio:living.photoCount', { count: photoCount })}
            </div>
          ) : null}

          {resolvedMedia.length > 0 ? (
            <div className={`chronologio-media-row${category === 'photo' ? ' is-photo' : ''}`}>
              {resolvedMedia.map((m, index) => (
                <ChronologioMediaImage
                  key={m.id}
                  className="chronologio-media-thumb"
                  src={m.thumbnailUrl || m.url || ''}
                  alt=""
                  retryLabel={t('chronologio:drawer.mediaRetry')}
                  unavailableLabel={
                    (m.url || m.thumbnailUrl || '').split('/').pop()?.split('?')[0] ||
                    t('chronologio:drawer.mediaUnavailable', { index: index + 1 })
                  }
                />
              ))}
            </div>
          ) : null}

          {/* 8. primary action is the card itself; optional expand for extras */}
          <AnimatePresence initial={false}>
            {expanded && hasExtraDetails ? (
              <motion.div
                className="chronologio-details"
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: 4 }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
              >
                {lifecycle?.message ? <p>{lifecycle.message}</p> : null}
                {intelligence?.message ? <p>{intelligence.message}</p> : null}
                {intelligence?.recommendation ? <p>{intelligence.recommendation}</p> : null}
                {weather?.source ? (
                  <p>
                    {t('chronologio:dataSource')}: {weather.source}
                  </p>
                ) : null}
                {harvest?.mill ? (
                  <p>
                    {t('chronologio:mill')}: {harvest.mill}
                  </p>
                ) : null}
                {presentHarvestQuality(harvest?.quality, i18n.language) ? (
                  <p>
                    {t('chronologio:quality')}: {presentHarvestQuality(harvest?.quality, i18n.language)}
                  </p>
                ) : null}
                {expense?.description ? <p>{expense.description}</p> : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </button>
  );
};

export default ChronologioEntryCard;
