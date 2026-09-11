import React from 'react';
import { useTranslation } from 'react-i18next';
import type {
  ChronologioEntry,
  ChronologioMonthSummary,
  ChronologioWeatherDetails,
} from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import { useCaptureOptional } from '../../context/CaptureContext';
import {
  buildMonthWeatherView,
  harvestHasResult,
  isMeaningfulHighlight,
} from '../../chronologio/monthPresentation';
import { monthSeasonStage } from '../../chronologio/yearPresentation';
import { eventCardSpan } from '../../chronologio/eventCardLayout';
import type { SupportedLocale } from '../../i18n/config';
import ChronologioEvent from './ChronologioEvent';
import ChronologioCategoryIcon from './ChronologioCategoryIcon';

type Props = {
  month: ChronologioMonthSummary;
  weather?: ChronologioWeatherDetails | null;
  weatherReviews?: ChronologioEntry[];
  entries?: ChronologioEntry[];
  numberLocale: string;
  locale: SupportedLocale;
  fieldId?: string;
  showField?: boolean;
  selectedEntryId?: string | null;
  active?: boolean;
  isCurrent?: boolean;
  empty?: boolean;
  onOpenMonth: () => void;
  onOpenDays: () => void;
  onSelect?: (entry: ChronologioEntry) => void;
  onPeekWeather?: () => void;
};

const isMonthReview = (entry: ChronologioEntry) =>
  entry.eventType === 'weather.monthReview' || entry.eventType === 'weather.yearReview';

const ChronologioMonthSection: React.FC<Props> = ({
  month,
  weather,
  weatherReviews = [],
  entries = [],
  numberLocale,
  locale,
  fieldId,
  showField = false,
  selectedEntryId,
  active,
  isCurrent,
  empty,
  onOpenMonth,
  onOpenDays,
  onSelect,
  onPeekWeather,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const capture = useCaptureOptional();
  const title = new Date(Date.UTC(month.year, month.month - 1, 1)).toLocaleDateString(i18n.language, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const weatherView = buildMonthWeatherView(month, weather);
  const phase = monthSeasonStage(month.month);
  const highlight =
    (month.highlightTitles || []).find(isMeaningfulHighlight) ||
    (isMeaningfulHighlight(month.observationHighlight) ? month.observationHighlight : undefined);
  const journal = entries.filter((entry) => !isMonthReview(entry));
  const fieldPicks = showField ? weatherReviews.filter((entry) => entry.eventType === 'weather.monthReview') : [];
  const showPicks = fieldPicks.length > 1;
  const singleReview = !showPicks ? weatherReviews[0] : undefined;

  if (empty) {
    return (
      <section className={`chrono-day-group chrono-month-group is-empty${active ? ' is-active' : ''}`}>
        <header className="chrono-day-header">
          <button type="button" className="chrono-month-heading-btn" onClick={onOpenDays}>
            <h3 className="chrono-day-heading">{title}</h3>
          </button>
          <p className="chrono-day-meta">
            <span>{t('monthView.noRecords')}</span>
          </p>
        </header>
        <button
          type="button"
          className="chrono-quiet-btn"
          onClick={() => capture?.openCapture({ fieldId }) ?? onOpenMonth()}
        >
          + {t('monthView.addRecord')}
        </button>
      </section>
    );
  }

  const rain =
    weatherView.rainMm == null
      ? null
      : `${weatherView.rainMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 })} mm`;
  const temps =
    weatherView.tempMin != null && weatherView.tempMax != null
      ? `${Math.round(weatherView.tempMin)}°–${Math.round(weatherView.tempMax)}°`
      : null;
  const water = weather?.waterBalanceMm;
  const openWeather = () => {
    if (singleReview && onSelect) {
      onSelect(singleReview);
      return;
    }
    onPeekWeather?.();
  };

  return (
    <section
      className={`chrono-day-group chrono-month-group${active ? ' is-active' : ''}${isCurrent ? ' is-current' : ''}`}
    >
      <header className="chrono-day-header">
        <div>
          <button type="button" className="chrono-month-heading-btn" onClick={onOpenDays}>
            <h3 className="chrono-day-heading">{title}</h3>
          </button>
          <p className="chrono-month-group-phase">
            {t(`yearView.stages.${phase}`)}
            {isCurrent ? ` · ${t('monthView.currentMonth')}` : ''}
          </p>
        </div>
        <p className="chrono-day-meta">
          {!showPicks && (rain || temps || water != null) ? (
            <button type="button" className="chrono-month-wx" onClick={openWeather}>
              {rain ? <span>{rain}</span> : null}
              {temps ? <span>{temps}</span> : null}
              {water != null ? (
                <span className={water < 0 ? 'is-deficit' : 'is-surplus'}>
                  {`${water.toLocaleString(numberLocale, { maximumFractionDigits: 0 })} mm`}
                </span>
              ) : null}
            </button>
          ) : null}
          <span>
            {t('timeline.entryCount', { count: journal.length + fieldPicks.length })}
          </span>
        </p>
      </header>

      {showPicks ? (
        <div className="chrono-weather-cluster">
          <p className="chrono-weather-cluster-kicker">{t('weatherReview.pickGrove')}</p>
          <div className="chrono-weather-cluster-row" role="list">
            {fieldPicks.map((entry) => (
              <div key={entry.id} className="chrono-day-event-cell is-field-pick" role="listitem">
                <ChronologioEvent
                  entry={entry}
                  density="card"
                  showField
                  locale={locale}
                  selected={selectedEntryId === entry.id}
                  weatherTile
                  onSelect={onSelect}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {journal.length > 0 ? (
        <div className="chrono-day-event-grid">
          {journal.map((entry) => {
            const featured = journal.length === 1 || eventCardSpan(entry) === 2;
            return (
              <div
                key={entry.id}
                className={`chrono-day-event-cell${featured ? ' is-featured' : ''}`}
              >
                <ChronologioEvent
                  entry={entry}
                  density="card"
                  showField={showField}
                  locale={locale}
                  selected={selectedEntryId === entry.id}
                  onSelect={onSelect}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="chrono-day-event-grid">
          {month.taskCount > 0 ? (
            <SummaryCard
              category="task"
              kicker={t('monthView.work')}
              title={t('monthView.workShort', { count: month.taskCount })}
              onClick={onOpenMonth}
            />
          ) : null}
          {month.noteCount > 0 ? (
            <SummaryCard
              category="note"
              kicker={t('monthView.observationShortLabel')}
              title={highlight || t('monthView.notesShort', { count: month.noteCount })}
              onClick={onOpenMonth}
            />
          ) : null}
          {month.expenseCount > 0 || month.expenseTotal > 0 ? (
            <SummaryCard
              category="expense"
              kicker={t('monthView.money')}
              title={t('monthView.expensesShort', {
                amount: formatChronologioMoney(month.expenseTotal, month.currency, numberLocale),
              })}
              onClick={onOpenMonth}
            />
          ) : null}
          {harvestHasResult(month) ? (
            <SummaryCard
              category="harvest"
              kicker={t('monthView.harvest')}
              title={
                month.oilKg > 0
                  ? `${month.oilKg.toLocaleString(numberLocale, { maximumFractionDigits: 1 })} ${t('oilUnit')}`
                  : `${Math.round(month.oliveKg).toLocaleString(numberLocale)} ${t('olivesUnit')}`
              }
              onClick={onOpenMonth}
            />
          ) : null}
        </div>
      )}
    </section>
  );
};

const SummaryCard: React.FC<{
  category: 'task' | 'note' | 'expense' | 'harvest';
  kicker: string;
  title: string;
  onClick: () => void;
}> = ({ category, kicker, title, onClick }) => (
  <div className="chrono-day-event-cell">
    <button
      type="button"
      className={`chronologio-event-card chronologio-event-card--${
        category === 'task' ? 'work' : category === 'note' ? 'observation' : category
      } is-compact`}
      onClick={onClick}
    >
      <div className="chronologio-card-top">
        <div className={`chronologio-card-icon is-${category === 'task' ? 'task' : category}`}>
          <ChronologioCategoryIcon category={category} />
        </div>
        <div className="chronologio-card-body">
          <div className="chronologio-card-meta">
            <span>{kicker}</span>
          </div>
          <h3 className="chronologio-card-title">{title}</h3>
        </div>
      </div>
    </button>
  </div>
);

export default ChronologioMonthSection;
