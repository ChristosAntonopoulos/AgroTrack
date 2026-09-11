import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Pin } from 'lucide-react';
import ChronologioCategoryIcon from './ChronologioCategoryIcon';
import type { ChronologioEntry, ChronologioCategory } from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import { taskStatusI18nKey } from '../../utils/categoryNormalize';
import {
  presentActorName,
  presentChronologioEvent,
  presentExpenseChip,
  presentHarvestQuality,
} from '../../chronologio/eventPresentation';
import type { SupportedLocale } from '../../i18n/config';
import { resolveFieldColor } from '../../utils/fieldColors';
import { eventAccentToken, eventCardSize } from '../../chronologio/eventCardLayout';
import WeatherMonthSnapshot from './WeatherMonthSnapshot';
import './Chronologio.css';

type Props = {
  entry: ChronologioEntry;
  showField: boolean;
  locale: SupportedLocale;
  onSelect?: (entry: ChronologioEntry) => void;
  selected?: boolean;
  /** Side-by-side multi-field weather tile — field first, minimal stats. */
  weatherTile?: boolean;
};

const categoryTone = (category: string, importance: string): string => {
  if (importance === 'critical') return 'is-critical';
  if (importance === 'warning') return 'is-warning';
  if (importance === 'positive') return 'is-positive';
  if (category === 'harvest') return 'is-harvest';
  if (category === 'expense' || category === 'income') return 'is-expense';
  if (category === 'task') return 'is-task';
  if (category === 'note') return 'is-note';
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
}) => {
  const { t, i18n } = useTranslation(['chronologio', 'common', 'fields']);
  const navigate = useNavigate();
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
  const note = entry.details.note;
  const expense = entry.details.expense;
  const weather = entry.details.weather;
  const intelligence = entry.details.intelligence;
  const lifecycle = entry.details.lifecycle;
  const media = entry.media?.filter((m) => m.thumbnailUrl || m.url).slice(0, 3) ?? [];

  const onActivate = () => {
    if (onSelect) {
      onSelect(entry);
      return;
    }
    if (
      (entry.sourceType === 'Task' || entry.sourceType === 'TaskExecution') &&
      (entry.details.task?.taskId || entry.sourceId)
    ) {
      navigate(`/tasks/${entry.details.task?.taskId || entry.sourceId}`);
      return;
    }
    if (entry.sourceType === 'Expense') {
      navigate(`/money?fieldId=${encodeURIComponent(entry.fieldId)}${entry.sourceId ? `&entry=${encodeURIComponent(entry.sourceId)}` : ''}`);
      return;
    }
    if (entry.sourceType === 'Harvest') {
      navigate('/this-harvest');
      return;
    }
    if (entry.sourceType === 'Note') {
      navigate('/chronologio');
      return;
    }
    if (entry.sourceType === 'WeatherReview') {
      navigate(`/fields/${entry.fieldId}/weather`);
      return;
    }
    setExpanded((v) => !v);
  };

  const isPeriodReview =
    entry.eventType === 'weather.monthReview' || entry.eventType === 'weather.yearReview';
  const fieldAccent = resolveFieldColor(entry.field?.color, entry.fieldId);
  const accent = eventAccentToken(category, String(entry.importance));
  const size = weatherTile ? 'compact' : eventCardSize(entry);
  const time = (() => {
    const d = new Date(entry.occurredAt);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', hour12: false });
  })();
  const photoCount = entry.media?.length || 0;

  const hasExtraDetails = Boolean(
    lifecycle?.message ||
      intelligence?.message ||
      intelligence?.recommendation ||
      (!isPeriodReview && weather?.source) ||
      harvest?.mill ||
      harvest?.quality ||
      expense?.description
  );

  return (
    <button
      type="button"
      className={`chronologio-event-card chronologio-event-card--${accent} is-${size}${tone ? ` ${tone}` : ''}${selected ? ' is-selected' : ''}${weatherTile ? ' is-weather-tile' : ''}${isPeriodReview && !weatherTile ? ' is-month-report' : ''}`}
      style={weatherTile ? ({ '--field-accent': fieldAccent } as React.CSSProperties) : undefined}
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
          {weatherTile ? (
            <div className="weather-pick-field">
              <span className="chrono-field-dot" style={{ background: fieldAccent }} aria-hidden />
              <h3 className="weather-pick-title">{entry.field?.name || presented.label}</h3>
            </div>
          ) : null}
          {!weatherTile ? (
            <div className="chronologio-card-meta">
              <span>
                {isPeriodReview
                  ? t(
                      entry.eventType === 'weather.yearReview'
                        ? 'chronologio:weatherReview.yearReport'
                        : 'chronologio:weatherReview.monthReport'
                    )
                  : presented.shortLabel}
              </span>
              {note?.pinned ? (
                <span>
                  <Pin size={11} aria-hidden /> {t('chronologio:pinned')}
                </span>
              ) : null}
              {!isPeriodReview && time ? <time dateTime={entry.occurredAt}>{time}</time> : null}
            </div>
          ) : null}
          {!weatherTile ? <h3 className="chronologio-card-title">{presented.label}</h3> : null}
          {category === 'harvest' && harvest ? (
            <div className="chronologio-harvest-stats">
              <div className="chronologio-harvest-stat">
                <strong>
                  {harvest.oliveKg.toLocaleString(numberLocale, { maximumFractionDigits: 0 })}
                </strong>
                <span>{t('chronologio:olivesUnit')}</span>
              </div>
              {harvest.oilKg != null ? (
                <div className="chronologio-harvest-stat">
                  <strong>
                    {harvest.oilKg.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}
                  </strong>
                  <span>{t('chronologio:oilUnit')}</span>
                </div>
              ) : null}
              {harvest.oilYieldPercent != null ? (
                <div className="chronologio-harvest-stat">
                  <strong>
                    {harvest.oilYieldPercent.toLocaleString(numberLocale, {
                      maximumFractionDigits: 1,
                    })}
                    %
                  </strong>
                  <span>{t('chronologio:yieldUnit')}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {category === 'expense' || category === 'income' || (category === 'task' && entry.amount) ? (
            <div className="chronologio-expense-row">
              {entry.amount ? (
                <span className="chronologio-card-amount">
                  {formatChronologioMoney(entry.amount.value, entry.amount.currency, numberLocale)}
                </span>
              ) : null}
              {presentExpenseChip(entry, i18n.language) &&
              presentExpenseChip(entry, i18n.language) !== presented.label ? (
                <span className="chronologio-expense-cat">
                  {presentExpenseChip(entry, i18n.language)}
                </span>
              ) : null}
              {category !== 'task' && expense?.relatedTaskTitle ? (
                <span className="chronologio-expense-cat">
                  {t('chronologio:relatedTask', { title: expense.relatedTaskTitle })}
                </span>
              ) : null}
              {expense?.relatedHarvestTitle ? (
                <span className="chronologio-expense-cat">
                  {t('chronologio:relatedHarvest', { title: expense.relatedHarvestTitle })}
                </span>
              ) : null}
            </div>
          ) : null}

          {category === 'task' ? (
            <>
              {entry.summary ? <p className="chronologio-card-summary">{entry.summary}</p> : null}
              {entry.details.task?.status ? (
                <span className="chronologio-task-status">
                  {t(taskStatusI18nKey(entry.details.task.status))}
                </span>
              ) : null}
            </>
          ) : null}

          {category === 'note' &&
          (note?.bodyPreview || entry.summary) &&
          (note?.bodyPreview || entry.summary) !== presented.label ? (
            <p className="chronologio-note-body">
              {note?.bodyPreview || entry.summary || ''}
            </p>
          ) : null}

          {category === 'weather' ? (
            <>
              {isPeriodReview && weather && weatherTile ? (
                <div className="weather-pick-metrics">
                  {weather.rainfallMm != null ? (
                    <div className="weather-pick-metric">
                      <strong>
                        {weather.rainfallMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 })}
                      </strong>
                      <span>{t('chronologio:weatherReview.rainMm')}</span>
                    </div>
                  ) : null}
                  {weather.temperatureMin != null && weather.temperatureMax != null ? (
                    <div className="weather-pick-metric">
                      <strong>
                        {weather.temperatureMin.toFixed(0)}°–{weather.temperatureMax.toFixed(0)}°
                      </strong>
                      <span>{t('chronologio:weatherReview.tempRange')}</span>
                    </div>
                  ) : null}
                  <div
                    className={`weather-pick-metric${
                      weather.waterBalanceMm == null
                        ? ''
                        : weather.waterBalanceMm < 0
                          ? ' is-deficit'
                          : ' is-surplus'
                    }`}
                  >
                    <strong>
                      {weather.waterBalanceMm == null
                        ? '—'
                        : `${weather.waterBalanceMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 })} mm`}
                    </strong>
                    <span>{t('chronologio:weatherReview.waterBalance')}</span>
                  </div>
                </div>
              ) : isPeriodReview && weather ? (
                <WeatherMonthSnapshot
                  weather={weather}
                  eventType={entry.eventType}
                  numberLocale={numberLocale}
                  locale={i18n.language}
                  variant="card"
                />
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
          category !== 'task' &&
          category !== 'note' &&
          category !== 'weather' &&
          entry.summary ? (
            <p className="chronologio-card-summary">{entry.summary}</p>
          ) : null}

          {(showField && !weatherTile && entry.field?.name) ||
          presentActorName(entry.actor?.displayName, i18n.language) ||
          photoCount > 0 ? (
            <div className="chronologio-card-foot">
              {showField && !weatherTile && entry.field?.name ? (
                <div className="chronologio-card-field">
                  <span className="chrono-field-dot" style={{ background: fieldAccent }} aria-hidden />
                  <span>{entry.field.name}</span>
                </div>
              ) : null}
              {presentActorName(entry.actor?.displayName, i18n.language) || photoCount > 0 ? (
                <div className="chronologio-card-actor">
                  {[
                    presentActorName(entry.actor?.displayName, i18n.language)
                      ? t('chronologio:fromActor', {
                          name: presentActorName(entry.actor?.displayName, i18n.language),
                        })
                      : null,
                    photoCount > 0 ? t('chronologio:living.photoCount', { count: photoCount }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              ) : null}
            </div>
          ) : null}

          {media.length > 0 ? (
            <div className="chronologio-media-row">
              {media.map((m) => (
                <img
                  key={m.id}
                  className="chronologio-media-thumb"
                  src={m.thumbnailUrl || m.url}
                  alt=""
                  loading="lazy"
                />
              ))}
            </div>
          ) : null}

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
