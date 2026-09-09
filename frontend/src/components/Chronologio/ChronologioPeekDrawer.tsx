import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X, ExternalLink, ChevronRight } from 'lucide-react';
import Button from '../Common/Button';
import type {
  ChronologioEntry,
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
} from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import {
  majorMonthsForYear,
  monthChapterFacts,
  periodEventCount,
  weatherFactBits,
  yearFixedMetrics,
} from '../../chronologio/summaryFacts';
import {
  resolveFieldColor,
  resolveWeatherMood,
  WEATHER_MOOD_COLORS,
} from '../../utils/fieldColors';
import WeatherReviewSummary from './WeatherReviewSummary';

export type ChronologioPeekTarget =
  | { mode: 'event'; entry: ChronologioEntry }
  | {
      mode: 'month';
      summary: ChronologioMonthSummary;
      recent: ChronologioEntry[];
      loadingRecent?: boolean;
    }
  | {
      mode: 'year';
      summary: ChronologioPeriodSummary;
      months: ChronologioMonthSummary[];
    }
  | {
      mode: 'monthWeather';
      year: number;
      month: number;
      reviews: ChronologioEntry[];
      loading?: boolean;
    };

type Props = {
  peek: ChronologioPeekTarget | null;
  numberLocale: string;
  onClose: () => void;
  onDrillToMonths?: (periodYear: number) => void;
  onDrillToDays?: (year: number, month: number) => void;
  onSelectRecent?: (entry: ChronologioEntry) => void;
};

const ChronologioPeekDrawer: React.FC<Props> = ({
  peek,
  numberLocale,
  onClose,
  onDrillToMonths,
  onDrillToDays,
  onSelectRecent,
}) => {
  const { t, i18n } = useTranslation(['chronologio', 'common']);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const tt = (key: string, opts?: Record<string, string | number>) =>
    t(key, opts as Record<string, unknown>);

  useEffect(() => {
    if (!peek) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, peek]);

  const entry = peek?.mode === 'event' ? peek.entry : null;
  const weather = entry?.details.weather;
  const isPeriodReview =
    entry?.eventType === 'weather.monthReview' || entry?.eventType === 'weather.yearReview';
  const fieldAccent = entry
    ? resolveFieldColor(entry.field?.color, entry.fieldId)
    : undefined;
  const weatherAccent =
    isPeriodReview && weather
      ? WEATHER_MOOD_COLORS[resolveWeatherMood(weather)]
      : undefined;

  const openFull = () => {
    if (!entry) return;
    if (entry.sourceType === 'Task') navigate(`/tasks/${entry.sourceId}`);
    else if (entry.sourceType === 'Expense')
      navigate(`/money?fieldId=${encodeURIComponent(entry.fieldId)}`);
    else if (entry.sourceType === 'Harvest') navigate(`/fields/${entry.fieldId}`);
    else if (entry.sourceType === 'WeatherReview') navigate(`/fields/${entry.fieldId}/weather`);
  };

  const monthTitle = (m: ChronologioMonthSummary) =>
    new Date(Date.UTC(m.year, m.month - 1, 1)).toLocaleDateString(i18n.language, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

  const weatherMonthTitle =
    peek?.mode === 'monthWeather'
      ? new Date(Date.UTC(peek.year, peek.month - 1, 1)).toLocaleDateString(i18n.language, {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : '';

  const headerTitle =
    peek?.mode === 'event'
      ? peek.entry.title
      : peek?.mode === 'month'
        ? monthTitle(peek.summary)
        : peek?.mode === 'year'
          ? String(peek.summary.periodYear)
          : peek?.mode === 'monthWeather'
            ? weatherMonthTitle
            : '';

  const headerMeta =
    peek?.mode === 'event'
      ? t(`categoryLabel.${peek.entry.category}`, {
          defaultValue: peek.entry.category,
        })
      : peek?.mode === 'month'
        ? t('living.peekMonth')
        : peek?.mode === 'year'
          ? t('living.peekYear')
          : peek?.mode === 'monthWeather'
            ? t('living.peekMonthWeather')
            : '';

  return (
    <AnimatePresence>
      {peek ? (
        <>
          <motion.button
            type="button"
            className="chrono-drawer-backdrop"
            aria-label={t('common:close', { defaultValue: 'Close' })}
            onClick={onClose}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
          />
          <motion.aside
            className="chrono-event-drawer chrono-peek-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={headerTitle}
            style={
              {
                ['--accent-color' as string]: fieldAccent,
                ['--accent-secondary' as string]: weatherAccent || 'transparent',
              } as React.CSSProperties
            }
            initial={reduceMotion ? false : { x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { x: 24, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
          >
            <header className="chrono-drawer-header">
              <div>
                <p className="chrono-drawer-meta">{headerMeta}</p>
                <h2>{headerTitle}</h2>
                {peek.mode === 'event' ? (
                  <p className="chrono-drawer-when">
                    {new Date(peek.entry.occurredAt).toLocaleDateString(i18n.language, {
                      dateStyle: 'long',
                    })}
                    {' · '}
                    {new Date(peek.entry.occurredAt).toLocaleTimeString(i18n.language, {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </p>
                ) : null}
                {peek.mode === 'event' && peek.entry.field?.name ? (
                  <div className="accent-card-field-chip chrono-drawer-field-chip">
                    <span className="accent-card-field-dot" aria-hidden />
                    <span>{peek.entry.field.name}</span>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="chrono-icon-btn"
                onClick={onClose}
                aria-label={t('common:close', { defaultValue: 'Close' })}
              >
                <X size={18} />
              </button>
            </header>

            <div className="chrono-drawer-body">
              {peek.mode === 'event' ? (
                <>
                  {peek.entry.details.harvest ? (
                    <div className="chronologio-harvest-stats">
                      <div className="chronologio-harvest-stat">
                        <strong>
                          {peek.entry.details.harvest.oliveKg.toLocaleString(numberLocale, {
                            maximumFractionDigits: 0,
                          })}
                        </strong>
                        <span>{t('olivesUnit')}</span>
                      </div>
                      {peek.entry.details.harvest.oilKg != null ? (
                        <div className="chronologio-harvest-stat">
                          <strong>
                            {peek.entry.details.harvest.oilKg.toLocaleString(numberLocale, {
                              maximumFractionDigits: 1,
                            })}
                          </strong>
                          <span>{t('oilUnit')}</span>
                        </div>
                      ) : null}
                      {peek.entry.details.harvest.oilYieldPercent != null ? (
                        <div className="chronologio-harvest-stat">
                          <strong>{peek.entry.details.harvest.oilYieldPercent}%</strong>
                          <span>{t('yieldUnit')}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {isPeriodReview && weather ? (
                    <div className="chrono-drawer-weather">
                      <WeatherReviewSummary
                        weather={weather}
                        eventType={peek.entry.eventType}
                        size="lg"
                        showSource
                        numberLocale={numberLocale}
                        locale={i18n.language}
                      />
                    </div>
                  ) : null}

                  {peek.entry.amount ? (
                    <p className="chrono-drawer-amount">
                      {formatChronologioMoney(
                        peek.entry.amount.value,
                        peek.entry.amount.currency,
                        numberLocale
                      )}
                    </p>
                  ) : null}

                  {!isPeriodReview &&
                  (peek.entry.summary || peek.entry.details.note?.bodyPreview) ? (
                    <p className="chrono-drawer-notes">
                      {peek.entry.summary || peek.entry.details.note?.bodyPreview}
                    </p>
                  ) : null}

                  <dl className="chrono-drawer-facts">
                    <div>
                      <dt>{t('living.field')}</dt>
                      <dd>{peek.entry.field?.name || '—'}</dd>
                    </div>
                    {peek.entry.actor?.displayName ? (
                      <div>
                        <dt>{t('living.actor')}</dt>
                        <dd>{peek.entry.actor.displayName}</dd>
                      </div>
                    ) : null}
                    {peek.entry.details.harvest?.mill ? (
                      <div>
                        <dt>{t('mill')}</dt>
                        <dd>{peek.entry.details.harvest.mill}</dd>
                      </div>
                    ) : null}
                    {peek.entry.details.harvest?.workers ? (
                      <div>
                        <dt>{t('workers')}</dt>
                        <dd>{peek.entry.details.harvest.workers}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {peek.entry.media?.length ? (
                    <div className="chrono-drawer-media">
                      <h3>{t('living.photos')}</h3>
                      <div className="chrono-drawer-media-grid">
                        {peek.entry.media.map((m) => (
                          <img
                            key={m.id}
                            src={m.url || m.thumbnailUrl}
                            alt=""
                            loading="lazy"
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              {peek.mode === 'month' ? (
                <>
                  <ul className="chrono-year-metrics chrono-peek-metrics">
                    {yearFixedMetrics(peek.summary, numberLocale, tt).map((m) => (
                      <li key={m.label}>
                        <span className="chrono-metric-value">{m.value}</span>
                        <span className="chrono-metric-label">{m.label}</span>
                      </li>
                    ))}
                  </ul>
                  {monthChapterFacts(peek.summary, numberLocale, tt).length > 0 ? (
                    <p className="chrono-peek-facts">
                      {monthChapterFacts(peek.summary, numberLocale, tt).join(' · ')}
                    </p>
                  ) : (
                    <p className="chrono-year-empty-hint">{t('living.emptyPeriod')}</p>
                  )}
                  {weatherFactBits(peek.summary, tt).length > 0 ? (
                    <section className="chrono-peek-section">
                      <h3>{t('living.peekWeather')}</h3>
                      <p>{weatherFactBits(peek.summary, tt).join(' · ')}</p>
                      {peek.summary.temperatureMax != null ||
                      peek.summary.temperatureMin != null ? (
                        <p className="chrono-peek-sub">
                          {peek.summary.temperatureMin != null
                            ? `${Math.round(peek.summary.temperatureMin)}°`
                            : '—'}
                          {' – '}
                          {peek.summary.temperatureMax != null
                            ? `${Math.round(peek.summary.temperatureMax)}°`
                            : '—'}
                        </p>
                      ) : null}
                    </section>
                  ) : null}
                  {(peek.summary.highlightTitles?.length ||
                    peek.summary.observationHighlight) && (
                    <section className="chrono-peek-section">
                      <h3>{t('living.peekHighlights')}</h3>
                      <p>
                        {(peek.summary.highlightTitles || []).filter(Boolean).slice(0, 2).join(' · ') ||
                          peek.summary.observationHighlight}
                      </p>
                      {peek.summary.observationHighlight &&
                      peek.summary.highlightTitles?.length ? (
                        <p className="chrono-peek-sub">{peek.summary.observationHighlight}</p>
                      ) : null}
                    </section>
                  )}
                  <section className="chrono-peek-section">
                    <h3>{t('living.peekRecent')}</h3>
                    {peek.loadingRecent ? (
                      <p className="chrono-peek-sub">{t('living.loadingOlder')}</p>
                    ) : peek.recent.length === 0 ? (
                      <p className="chrono-peek-sub">{t('living.emptyPeriod')}</p>
                    ) : (
                      <ul className="chrono-peek-recent">
                        {peek.recent.slice(0, 5).map((e) => (
                          <li key={e.id}>
                            <button
                              type="button"
                              className="chrono-peek-recent-btn"
                              onClick={() => onSelectRecent?.(e)}
                            >
                              <span className="chrono-peek-recent-title">{e.title}</span>
                              <span className="chrono-peek-recent-when">
                                {new Date(e.occurredAt).toLocaleDateString(i18n.language, {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              ) : null}

              {peek.mode === 'year' ? (
                <>
                  <ul className="chrono-year-metrics chrono-peek-metrics">
                    {yearFixedMetrics(peek.summary, numberLocale, tt).map((m) => (
                      <li key={m.label}>
                        <span className="chrono-metric-value">{m.value}</span>
                        <span className="chrono-metric-label">{m.label}</span>
                      </li>
                    ))}
                  </ul>
                  {weatherFactBits(peek.summary, tt).length > 0 ? (
                    <section className="chrono-peek-section">
                      <h3>{t('living.peekWeather')}</h3>
                      <p>{weatherFactBits(peek.summary, tt).join(' · ')}</p>
                    </section>
                  ) : null}
                  {(peek.summary.highlightTitles || []).filter(Boolean).length > 0 ? (
                    <section className="chrono-peek-section">
                      <h3>{t('living.peekHighlights')}</h3>
                      <p>
                        {(peek.summary.highlightTitles || []).filter(Boolean).slice(0, 3).join(' · ')}
                      </p>
                    </section>
                  ) : null}
                  <section className="chrono-peek-section">
                    <h3>{t('living.peekMajorMonths')}</h3>
                    {majorMonthsForYear(peek.months).length === 0 ? (
                      <p className="chrono-peek-sub">{t('living.emptyPeriod')}</p>
                    ) : (
                      <ul className="chrono-peek-recent">
                        {majorMonthsForYear(peek.months).map((m) => (
                          <li key={m.key}>
                            <span className="chrono-peek-recent-title">{monthTitle(m)}</span>
                            <span className="chrono-peek-recent-when">
                              {t('living.monthWorks', {
                                count: periodEventCount(m),
                              })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              ) : null}

              {peek.mode === 'monthWeather' ? (
                <div className="chrono-month-weather-list">
                  {peek.loading ? (
                    <p className="chrono-peek-sub">{t('living.loadingOlder')}</p>
                  ) : peek.reviews.length === 0 ? (
                    <p className="chrono-peek-sub">{t('living.emptyMonthWeather')}</p>
                  ) : (
                    peek.reviews.map((review) => {
                      const w = review.details.weather;
                      if (!w) return null;
                      const accent = resolveFieldColor(review.field?.color, review.fieldId);
                      const mood = resolveWeatherMood(w);
                      return (
                        <button
                          key={review.id}
                          type="button"
                          className="chrono-month-weather-block"
                          style={
                            {
                              ['--accent-color' as string]: accent,
                              ['--accent-secondary' as string]: WEATHER_MOOD_COLORS[mood],
                            } as React.CSSProperties
                          }
                          onClick={() => onSelectRecent?.(review)}
                        >
                          {review.field?.name ? (
                            <div className="accent-card-field-chip chrono-drawer-field-chip">
                              <span className="accent-card-field-dot" aria-hidden />
                              <span>{review.field.name}</span>
                            </div>
                          ) : null}
                          <WeatherReviewSummary
                            weather={w}
                            eventType={review.eventType}
                            size="md"
                            showSource
                            numberLocale={numberLocale}
                            locale={i18n.language}
                          />
                        </button>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>

            <footer className="chrono-drawer-footer">
              {peek.mode === 'event' ? (
                <Button variant="outline" icon={<ExternalLink size={14} />} onClick={openFull}>
                  {isPeriodReview
                    ? t('weatherReview.openCharts')
                    : t('living.openFull')}
                </Button>
              ) : null}
              {peek.mode === 'month' ? (
                <Button
                  variant="primary"
                  icon={<ChevronRight size={14} />}
                  onClick={() => onDrillToDays?.(peek.summary.year, peek.summary.month)}
                >
                  {t('living.drillToDays', {
                    month: monthTitle(peek.summary),
                  })}
                </Button>
              ) : null}
              {peek.mode === 'year' ? (
                <Button
                  variant="primary"
                  icon={<ChevronRight size={14} />}
                  onClick={() => onDrillToMonths?.(peek.summary.periodYear)}
                >
                  {t('living.drillToMonths', {
                    year: peek.summary.periodYear,
                  })}
                </Button>
              ) : null}
            </footer>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
};

export default ChronologioPeekDrawer;
