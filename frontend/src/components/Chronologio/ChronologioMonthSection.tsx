import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Circle, CloudRain, Euro, Thermometer, Wheat } from 'lucide-react';
import type {
  ChronologioEntry,
  ChronologioMonthSummary,
  ChronologioWeatherDetails,
} from '../../services/chronologioService';
import {
  buildMonthWeatherView,
  type MonthChapterFocus,
} from '../../chronologio/monthPresentation';
import { periodEventCount } from '../../chronologio/summaryFacts';
import { pickRealMediaUrl } from '../../chronologio/mediaGuard';
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { formatGroveMassKg } from '../../utils/groveTotals';
import { formatMonthHeading } from '../../utils/taskFormDates';
import type { SupportedLocale } from '../../i18n/config';
import ChronologioThumbnail from './ChronologioThumbnail';

type Props = {
  month: ChronologioMonthSummary;
  weather?: ChronologioWeatherDetails | null;
  weatherReviews?: ChronologioEntry[];
  entries?: ChronologioEntry[];
  numberLocale: string;
  locale: SupportedLocale;
  fieldId?: string;
  showField?: boolean;
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

const isStoryEntry = (entry: ChronologioEntry) =>
  entry.category !== 'weather' && entry.eventType !== 'weather.monthReview' && entry.eventType !== 'weather.yearReview';

/**
 * One month in the Μήνες view: a short memory of the month.
 * Opening it drops into that month's days.
 */
const ChronologioMonthSection: React.FC<Props> = ({
  month,
  weather,
  entries = [],
  numberLocale,
  showField = false,
  active,
  isCurrent,
  empty,
  onOpenDays,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const title = formatMonthHeading(month.year, month.month, i18n.language);
  const weatherView = buildMonthWeatherView(month, weather);
  const recordCount = periodEventCount(month);
  const story = entries.filter(isStoryEntry);
  const highlight = story[0];
  const highlightTitle =
    month.dominantWorkLabel || month.highlightTitles[0] || month.observationHighlight || highlight?.title || '';
  const highlightWhen = highlight
    ? new Date(highlight.occurredAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })
    : '';
  const highlightField =
    showField && highlight?.field?.name ? friendlyFieldLabel(highlight.field.name) : '';

  const photos = story.flatMap((entry) =>
    (entry.media || [])
      .map((item) => {
        const raw = pickRealMediaUrl([item.thumbnailUrl, item.url]);
        return raw ? resolvePublicAssetUrl(raw) || raw : '';
      })
      .filter(Boolean)
  );
  if (photos.length === 0 && month.heroMediaUrl) {
    const raw = pickRealMediaUrl([month.heroMediaUrl]);
    const resolved = raw ? resolvePublicAssetUrl(raw) || raw : '';
    if (resolved) photos.push(resolved);
  }
  const thumbs = photos.slice(0, 3);
  const extraPhotos = Math.max(0, photos.length - thumbs.length);

  const rain =
    weatherView.rainMm != null
      ? `${weatherView.rainMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 })} mm`
      : null;
  const temps =
    weatherView.tempMin != null && weatherView.tempMax != null
      ? `${Math.round(weatherView.tempMin)}–${Math.round(weatherView.tempMax)}°`
      : null;

  const chips: Array<{ key: string; icon: React.ReactElement; label: string }> = [];
  if (month.taskCount > 0) {
    chips.push({
      key: 'work',
      icon: <Check size={14} aria-hidden />,
      label: t('monthView.workShort', { count: month.taskCount }),
    });
  }
  if (month.noteCount > 0) {
    chips.push({
      key: 'notes',
      icon: <Circle size={12} aria-hidden />,
      label: t('monthView.notesShort', { count: month.noteCount }),
    });
  }
  if (month.expenseCount > 0) {
    chips.push({
      key: 'money',
      icon: <Euro size={14} aria-hidden />,
      label: t('monthView.moneyCount', { count: month.expenseCount }),
    });
  }

  const harvestLine =
    month.oliveKg > 0 || month.oilKg > 0
      ? [
          month.oliveKg > 0 ? `${formatGroveMassKg(month.oliveKg, numberLocale)} ${t('olivesUnit')}` : null,
          month.oilKg > 0 ? `${formatGroveMassKg(month.oilKg, numberLocale)} ${t('oilUnit')}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null;

  if (empty) return null;

  return (
    <section
      className={`chrono-month-chapter chrono-month-snapshot${active ? ' is-active' : ''}${isCurrent ? ' is-current' : ''}${month.harvestCount > 0 || month.oliveKg > 0 ? ' is-harvest' : ''}`}
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
          {recordCount > 0 ? (
            <span className="chrono-month-count">{t('timeline.entryCount', { count: recordCount })}</span>
          ) : isCurrent ? (
            <span className="chrono-month-now">{t('yearView.here')}</span>
          ) : null}
        </span>

        {rain || temps ? (
          <p className="chrono-month-wx-quiet">
            {rain ? (
              <span>
                <CloudRain size={14} aria-hidden />
                {rain}
              </span>
            ) : null}
            {temps ? (
              <span>
                <Thermometer size={14} aria-hidden />
                {temps}
              </span>
            ) : null}
          </p>
        ) : null}

        {harvestLine ? (
          <p className="chrono-month-harvest-line">
            <Wheat size={15} aria-hidden />
            <span>
              {isCurrent
                ? `${t('monthView.harvest')} ${t('seasonRail.inProgress').toLocaleLowerCase(i18n.language)}`
                : t('monthView.harvest')}
              <strong>{harvestLine}</strong>
            </span>
          </p>
        ) : null}

        {thumbs.length > 0 ? (
          <div className="chrono-month-photos">
            {thumbs.map((src, index) => (
              <ChronologioThumbnail
                key={src}
                src={src}
                className="chrono-month-photo"
                extraCount={index === thumbs.length - 1 ? extraPhotos : 0}
              />
            ))}
          </div>
        ) : null}

        {chips.length > 0 ? (
          <ul className="chrono-month-chips">
            {chips.map((chip) => (
              <li key={chip.key}>
                {chip.icon}
                {chip.label}
              </li>
            ))}
          </ul>
        ) : null}

        {highlightTitle ? (
          <p className="chrono-month-highlight">
            <strong>{highlightTitle}</strong>
            {highlightField || highlightWhen ? (
              <span>{[highlightField, highlightWhen].filter(Boolean).join(' · ')}</span>
            ) : null}
          </p>
        ) : null}

        <span className="chrono-month-chapter-cta">{t('monthView.openMonth')} →</span>
      </div>
    </section>
  );
};

export default ChronologioMonthSection;
