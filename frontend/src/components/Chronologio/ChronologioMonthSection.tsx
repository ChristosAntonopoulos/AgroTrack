import React from 'react';
import { useTranslation } from 'react-i18next';
import type {
  ChronologioEntry,
  ChronologioMonthSummary,
  ChronologioWeatherDetails,
} from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import { formatGroveMassKg } from '../../utils/groveTotals';
import {
  buildMonthWeatherView,
  harvestHasResult,
  isMeaningfulHighlight,
  weatherReviewsShareReading,
  type MonthChapterFocus,
} from '../../chronologio/monthPresentation';
import { isFeaturedChronologioCard } from '../../chronologio/eventCardLayout';
import { periodEventCount } from '../../chronologio/summaryFacts';
import { formatMonthHeading } from '../../utils/taskFormDates';
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
  /** Field names in scope that lack a weather review for this month. */
  missingWeatherFields?: string[];
  selectedEntryId?: string | null;
  active?: boolean;
  isCurrent?: boolean;
  empty?: boolean;
  onOpenMonth: (focus?: MonthChapterFocus) => void;
  onOpenDays: () => void;
  onSelect?: (entry: ChronologioEntry) => void;
  onClearSelection?: () => void;
  onPeekWeather?: () => void;
};

const isMonthReview = (entry: ChronologioEntry) =>
  entry.eventType === 'weather.monthReview' || entry.eventType === 'weather.yearReview';

const pickSpotlight = (entries: ChronologioEntry[]): ChronologioEntry | undefined =>
  entries.find((entry) => isFeaturedChronologioCard(entry));

const ChronologioMonthSection: React.FC<Props> = ({
  month,
  weather,
  weatherReviews = [],
  entries = [],
  numberLocale,
  locale,
  fieldId: _fieldId,
  showField = false,
  missingWeatherFields = [],
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

  const selectEntry = (entry: ChronologioEntry) => {
    onSelect?.(entry);
  };

  const title = formatMonthHeading(month.year, month.month, i18n.language);
  const weatherView = buildMonthWeatherView(month, weather);
  const highlight =
    (month.highlightTitles || []).find(isMeaningfulHighlight) ||
    (isMeaningfulHighlight(month.observationHighlight) ? month.observationHighlight : undefined);
  const journal = entries.filter((entry) => !isMonthReview(entry));
  const fieldPicks = showField ? weatherReviews.filter((entry) => entry.eventType === 'weather.monthReview') : [];
  const showPicks = fieldPicks.length > 1;
  const singleReview = !showPicks ? weatherReviews[0] : undefined;
  const eventCount = periodEventCount(month) + fieldPicks.length;
  const spotlight = pickSpotlight(journal);
  const sharedWeather = showPicks && weatherReviewsShareReading(fieldPicks);
  const openCategory = (
    focus: MonthChapterFocus,
    match: (entry: ChronologioEntry) => boolean,
    count: number
  ) => {
    const rows = journal.filter(match);
    if (count <= 1 && rows[0]) {
      selectEntry(rows[0]);
      return;
    }
    onOpenMonth(focus);
  };

  if (empty) {
    return (
      <section className={`chrono-day-group chrono-month-group is-empty is-compact${active ? ' is-active' : ''}`}>
        <header className="chrono-month-head">
          <div className="chrono-month-head-main">
            <button type="button" className="chrono-month-heading-btn" onClick={onOpenDays}>
              <h3 className="chrono-day-heading">{title}</h3>
            </button>
          </div>
          <p className="chrono-month-count">{t('monthView.noRecords')}</p>
        </header>
      </section>
    );
  }

  const rain =
    weatherView.rainMm == null
      ? null
      : t('weatherReview.rainChip', {
          mm: weatherView.rainMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 }),
          defaultValue: `Rain ${weatherView.rainMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 })} mm`,
        });
  const temps =
    weatherView.tempMin != null && weatherView.tempMax != null
      ? t('weatherReview.tempChip', {
          min: Math.round(weatherView.tempMin),
          max: Math.round(weatherView.tempMax),
          defaultValue: `Temperature ${Math.round(weatherView.tempMin)}–${Math.round(weatherView.tempMax)}°C`,
        })
      : null;
  const water = weather?.waterBalanceMm;
  const waterLabel =
    water == null
      ? null
      : t('weatherReview.balanceChip', {
          mm: water.toLocaleString(numberLocale, { maximumFractionDigits: 0 }),
          defaultValue: `Balance ${water.toLocaleString(numberLocale, { maximumFractionDigits: 0 })} mm`,
        });
  const openWeather = () => {
    if (singleReview) {
      selectEntry(singleReview);
      return;
    }
    onPeekWeather?.();
  };
  const hasWeather = !showPicks && (rain || temps || waterLabel);
  const fieldPickNames = fieldPicks
    .map((entry) => entry.field?.name)
    .filter(Boolean)
    .join(' · ');

  const hasSummaryChips =
    month.taskCount > 0 ||
    month.noteCount > 0 ||
    month.expenseCount > 0 ||
    month.expenseTotal > 0 ||
    harvestHasResult(month);

  return (
      <section
        className={`chrono-day-group chrono-month-group is-summary${active ? ' is-active' : ''}${isCurrent ? ' is-current' : ''}`}
      >
        <header className="chrono-month-head">
          <div className="chrono-month-head-main">
            <button type="button" className="chrono-month-heading-btn" onClick={onOpenDays}>
              <h3 className="chrono-day-heading">{title}</h3>
            </button>
            {isCurrent ? <span className="chrono-month-now">{t('yearView.here')}</span> : null}
          </div>
          {eventCount > 0 ? (
            <p className="chrono-month-count">{t('timeline.entryCount', { count: eventCount })}</p>
          ) : null}
          {hasWeather ? (
            <button type="button" className="chrono-month-wx" onClick={openWeather}>
              {rain ? <span className="chrono-month-wx-chip">{rain}</span> : null}
              {temps ? <span className="chrono-month-wx-chip">{temps}</span> : null}
              {waterLabel ? (
                <span className={`chrono-month-wx-chip ${water != null && water < 0 ? 'is-deficit' : 'is-surplus'}`}>
                  {waterLabel}
                </span>
              ) : null}
            </button>
          ) : null}
        </header>

        {showPicks ? (
          <div className="chrono-weather-cluster">
            <p className="chrono-weather-cluster-kicker">
              {sharedWeather
                ? t('weatherReview.sharedFields', {
                    names: fieldPickNames,
                    defaultValue: 'Weather for {{names}}',
                  })
                : fieldPickNames
                  ? t('weatherReview.fieldsCompareNamed', {
                      count: fieldPicks.length,
                      names: fieldPickNames,
                      defaultValue: '{{count}} fields · {{names}}',
                    })
                  : t('weatherReview.fieldsCompare', { count: fieldPicks.length })}
            </p>
            <div className="chrono-weather-cluster-row" role="list">
              {(sharedWeather ? fieldPicks.slice(0, 1) : fieldPicks).map((entry) => (
                <div key={entry.id} className="chrono-day-event-cell is-field-pick" role="listitem">
                  <ChronologioEvent
                    entry={entry}
                    density="card"
                    showField={!sharedWeather}
                    locale={locale}
                    selected={selectedEntryId === entry.id}
                    weatherTile
                    onSelect={selectEntry}
                  />
                </div>
              ))}
            </div>
            {missingWeatherFields && missingWeatherFields.length > 0
              ? missingWeatherFields.map((name) => (
                  <p key={name} className="chrono-weather-missing">
                    {t('weatherReview.fieldNoWeather', { field: name })}
                  </p>
                ))
              : null}
          </div>
        ) : null}

        {hasSummaryChips ? (
          <div className="chrono-day-event-grid chrono-month-summary-grid">
            {month.taskCount > 0 ? (
              <SummaryCard
                category="task"
                kicker={t('monthView.work')}
                title={t('monthView.workShort', { count: month.taskCount })}
                onClick={() =>
                  openCategory('work', (entry) => entry.category === 'task', month.taskCount)
                }
              />
            ) : null}
            {month.noteCount > 0 ? (
              <SummaryCard
                category="note"
                kicker={t('monthView.observationShortLabel')}
                title={highlight || t('monthView.notesShort', { count: month.noteCount })}
                onClick={() =>
                  openCategory(
                    'observation',
                    (entry) => entry.category === 'note' || entry.category === 'photo',
                    month.noteCount
                  )
                }
              />
            ) : null}
            {month.expenseCount > 0 || month.expenseTotal > 0 ? (
              <SummaryCard
                category="expense"
                kicker={t('monthView.money')}
                title={t('monthView.expensesShort', {
                  amount: formatChronologioMoney(month.expenseTotal, month.currency, numberLocale),
                })}
                onClick={() =>
                  openCategory(
                    'money',
                    (entry) => entry.category === 'expense' || entry.category === 'income',
                    month.expenseCount
                  )
                }
              />
            ) : null}
            {harvestHasResult(month) ? (
              <SummaryCard
                category="harvest"
                kicker={t('monthView.harvest')}
                title={
                  month.oilKg > 0
                    ? `${formatGroveMassKg(month.oilKg, numberLocale)} ${t('oilUnit')}`
                    : `${formatGroveMassKg(month.oliveKg, numberLocale)} ${t('olivesUnit')}`
                }
                onClick={() =>
                  openCategory('harvest', (entry) => entry.category === 'harvest', month.harvestCount)
                }
              />
            ) : null}
          </div>
        ) : null}

        {spotlight ? (
          <div className="chrono-day-event-grid chrono-month-spotlight">
            <div className="chrono-day-event-cell is-featured">
              <ChronologioEvent
                entry={spotlight}
                density="card"
                showField={showField}
                locale={locale}
                selected={selectedEntryId === spotlight.id}
                onSelect={selectEntry}
              />
            </div>
          </div>
        ) : null}

        <div className="chrono-month-cta-row">
          <button type="button" className="chrono-quiet-btn is-primary" onClick={onOpenDays}>
            {t('monthView.openMonth')}
          </button>
        </div>
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
