import React from 'react';
import { useTranslation } from 'react-i18next';
import type {
  ChronologioEntry,
  ChronologioMonthSummary,
  ChronologioWeatherDetails,
} from '../../services/chronologioService';
import {
  buildMonthWeatherView,
  type MonthChapterFocus,
} from '../../chronologio/monthPresentation';
import { monthFocusKey } from '../../chronologio/timelineRail';
import { periodEventCount } from '../../chronologio/summaryFacts';
import { formatMonthHeading } from '../../utils/taskFormDates';
import type { SupportedLocale } from '../../i18n/config';
import ChronologioGlanceFacts from './ChronologioGlanceFacts';

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

/**
 * One month in the Μήνες view: a chapter with a few totals.
 * Opening it drops into that month's days — the days are not listed here.
 */
const ChronologioMonthSection: React.FC<Props> = ({
  month,
  weather,
  weatherReviews = [],
  numberLocale,
  missingWeatherFields = [],
  active,
  isCurrent,
  empty,
  onOpenDays,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const title = formatMonthHeading(month.year, month.month, i18n.language);
  const weatherView = buildMonthWeatherView(month, weather);
  const focus = monthFocusKey({
    harvest: month.harvestCount,
    work: month.taskCount,
    observation: month.noteCount,
    money: month.expenseCount,
  });
  const recordCount = periodEventCount(month);

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
  const waterAbs =
    water == null ? '' : Math.abs(water).toLocaleString(numberLocale, { maximumFractionDigits: 0 });
  const waterLabel =
    water == null
      ? null
      : Math.abs(water) < 5
        ? t('weatherReview.balanceEven')
        : water < 0
          ? t('weatherReview.balanceShortDeficit', { mm: waterAbs })
          : t('weatherReview.balanceShortSurplus', { mm: waterAbs });
  const weatherLine = [rain, temps, waterLabel].filter(Boolean).join(' · ');
  const fieldCount = weatherReviews.length;

  if (empty) {
    return (
      <section
        className={`chrono-month-chapter is-empty${active ? ' is-active' : ''}`}
        data-month-key={`${month.year}-${month.month}`}
        id={`chrono-chapter-${month.year}-${month.month}`}
      >
        <h3 className="chrono-month-chapter-title">{title}</h3>
        <p className="chrono-month-chapter-quiet">{t('monthView.noRecords')}</p>
      </section>
    );
  }

  return (
    <section
      className={`chrono-month-chapter${active ? ' is-active' : ''}${isCurrent ? ' is-current' : ''}`}
      data-month-key={`${month.year}-${month.month}`}
      id={`chrono-chapter-${month.year}-${month.month}`}
    >
      <div
        role="button"
        tabIndex={0}
        className="chrono-month-chapter-open"
        onClick={onOpenDays}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpenDays();
          }
        }}
      >
        <span className="chrono-month-chapter-head">
          <h3 className="chrono-month-chapter-title">{title}</h3>
          {isCurrent ? <span className="chrono-month-now">{t('yearView.here')}</span> : null}
          {focus ? <span className="chrono-month-chapter-focus">{t(`primaryCategories.${focus}`)}</span> : null}
        </span>
        <ChronologioGlanceFacts
          oilKg={month.oilKg}
          oliveKg={month.oliveKg}
          expenseTotal={month.expenseTotal}
          currency={month.currency}
          recordCount={recordCount}
          numberLocale={numberLocale}
        />
        {weatherLine ? <p className="chrono-month-chapter-wx">{weatherLine}</p> : null}
        {fieldCount > 1 ? (
          <p className="chrono-month-chapter-wx">
            {t('weatherReview.fieldsCompare', { count: fieldCount })}
          </p>
        ) : null}
        {missingWeatherFields.length > 0 ? (
          <p className="chrono-month-chapter-quiet">
            {missingWeatherFields.map((name) => t('weatherReview.fieldNoWeather', { field: name })).join(' · ')}
          </p>
        ) : null}
        <span className="chrono-month-chapter-cta">{t('monthView.openMonth')}</span>
      </div>
    </section>
  );
};

export default ChronologioMonthSection;
