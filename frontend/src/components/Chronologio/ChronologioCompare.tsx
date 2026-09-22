import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
} from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import { formatGroveMassKg, formatGroveMassKgLabel } from '../../utils/groveTotals';
import {
  comparisonDriverMonths,
  costPerOilKg,
  fairYearPair,
  yearComparisonCopyKey,
  yearComparisonInsights,
} from '../../chronologio/yearPresentation';
import { agriculturalYearFor } from '../../chronologio/agriculturalYear';
import { formatMonthHeading } from '../../utils/taskFormDates';

type Props = {
  left: ChronologioPeriodSummary | null;
  right: ChronologioPeriodSummary | null;
  leftMonths: ChronologioMonthSummary[];
  rightMonths: ChronologioMonthSummary[];
  leftYear: number;
  rightYear: number;
  availableYears: number[];
  numberLocale: string;
  fieldNames: string[];
  onChangeYears: (pair: [number, number]) => void;
  onOpenMonth: (year: number, month: number) => void;
  onClose: () => void;
};

const ChronologioCompare: React.FC<Props> = ({
  left,
  right,
  leftMonths,
  rightMonths,
  leftYear,
  rightYear,
  availableYears,
  numberLocale,
  fieldNames,
  onChangeYears,
  onOpenMonth,
  onClose,
}) => {
  const { t, i18n } = useTranslation('chronologio');

  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { month: 'short', timeZone: 'UTC' });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(Date.UTC(2020, i, 1))));
  }, [i18n.language]);

  const insights = yearComparisonInsights(left, right, {
    currentMonths:
      left && right && left.periodYear >= right.periodYear
        ? leftMonths
        : rightMonths,
    previousMonths:
      left && right && left.periodYear >= right.periodYear
        ? rightMonths
        : leftMonths,
  });
  const liveYear = agriculturalYearFor(new Date());
  const comparesLive = leftYear === liveYear || rightYear === liveYear;
  const newerIsLeft = (left?.periodYear ?? leftYear) >= (right?.periodYear ?? rightYear);
  const newerSummary = newerIsLeft ? left : right;
  const olderSummary = newerIsLeft ? right : left;
  const newerMonths = newerIsLeft ? leftMonths : rightMonths;
  const olderMonths = newerIsLeft ? rightMonths : leftMonths;
  const newerYear = newerIsLeft ? (left?.periodYear ?? leftYear) : (right?.periodYear ?? rightYear);
  const olderYear = newerIsLeft ? (right?.periodYear ?? rightYear) : (left?.periodYear ?? leftYear);
  const fair = fairYearPair(newerSummary, olderSummary, {
    currentMonths: newerMonths,
    previousMonths: olderMonths,
  });
  const currency = left?.currency || right?.currency || 'EUR';
  const currentCost = fair ? costPerOilKg(fair.current.expenseTotal, fair.current.oilKg) : null;
  const previousCost = fair ? costPerOilKg(fair.previous.expenseTotal, fair.previous.oilKg) : null;
  const costForYear = (year: number): number | null => {
    if (!fair) return null;
    if (year === fair.current.periodYear) return currentCost;
    if (year === fair.previous.periodYear) return previousCost;
    return null;
  };
  const formatCost = (value: number | null) =>
    value == null ? '—' : formatChronologioMoney(value, currency, numberLocale);
  const drivers = comparisonDriverMonths(newerMonths, olderMonths, newerYear, olderYear);

  const rows = [
    ...(left?.expenseTotal || right?.expenseTotal
      ? [
          {
            label: t('yearSummary.expenses'),
            a:
              left?.expenseTotal && left.expenseTotal > 0
                ? formatChronologioMoney(left.expenseTotal, left.currency || 'EUR', numberLocale)
                : '—',
            b:
              right?.expenseTotal && right.expenseTotal > 0
                ? formatChronologioMoney(right.expenseTotal, right.currency || 'EUR', numberLocale)
                : '—',
          },
        ]
      : []),
    ...(left?.oliveKg || right?.oliveKg
      ? [
          {
            label: t('yearSummary.harvestKg'),
            a: left?.oliveKg && left.oliveKg > 0 ? formatGroveMassKgLabel(left.oliveKg, numberLocale) : '—',
            b: right?.oliveKg && right.oliveKg > 0 ? formatGroveMassKgLabel(right.oliveKg, numberLocale) : '—',
          },
        ]
      : []),
    ...(left?.oilKg || right?.oilKg
      ? [
          {
            label: t('yearSummary.oilKg'),
            a: left?.oilKg && left.oilKg > 0 ? formatGroveMassKgLabel(left.oilKg, numberLocale) : '—',
            b: right?.oilKg && right.oilKg > 0 ? formatGroveMassKgLabel(right.oilKg, numberLocale) : '—',
          },
        ]
      : []),
    ...(currentCost != null || previousCost != null
      ? [
          {
            label: t('yearView.compare.costPerKg'),
            a: formatCost(costForYear(leftYear)),
            b: formatCost(costForYear(rightYear)),
          },
        ]
      : []),
    ...(left?.oilYieldPercent != null || right?.oilYieldPercent != null
      ? [
          {
            label: t('living.yield'),
            a:
              left?.oilYieldPercent != null
                ? `${formatGroveMassKg(left.oilYieldPercent, numberLocale)}%`
                : '—',
            b:
              right?.oilYieldPercent != null
                ? `${formatGroveMassKg(right.oilYieldPercent, numberLocale)}%`
                : '—',
          },
        ]
      : []),
    ...(left?.taskCount || right?.taskCount
      ? [
          {
            label: t('yearSummary.completedWorks'),
            a: left?.taskCount ? String(left.taskCount) : '—',
            b: right?.taskCount ? String(right.taskCount) : '—',
          },
        ]
      : []),
  ];

  return (
    <div className="chrono-compare" role="region" aria-label={t('living.compare')}>
      <header className="chrono-compare-header">
        <h2>{t('living.compare')}</h2>
        <div className="chrono-compare-pickers">
          <label>
            <span className="sr-only">{t('living.compareLeft')}</span>
            <select
              value={leftYear}
              onChange={(e) => onChangeYears([Number(e.target.value), rightYear])}
            >
              {availableYears.map((y) => (
                <option key={`l-${y}`} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <span aria-hidden>⇄</span>
          <label>
            <span className="sr-only">{t('living.compareRight')}</span>
            <select
              value={rightYear}
              onChange={(e) => onChangeYears([leftYear, Number(e.target.value)])}
            >
              {availableYears.map((y) => (
                <option key={`r-${y}`} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" className="chronologio-clear-btn" onClick={onClose}>
          {t('living.closeCompare')}
        </button>
      </header>

      <table className="chrono-compare-table">
        <thead>
          <tr>
            <th scope="col">{t('living.metric')}</th>
            <th scope="col">{left?.key || leftYear}</th>
            <th scope="col">{right?.key || rightYear}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              <td>{r.a}</td>
              <td>{r.b}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="chrono-compare-scope">
        {fieldNames.length === 1
          ? t('yearView.compare.fieldsOne', { field: fieldNames[0] })
          : fieldNames.length > 1
            ? t('yearView.compare.fieldsAll', { fields: fieldNames.join(' · ') })
            : t('yearView.compare.fieldsEvery')}
      </p>
      {comparesLive ? (
        <p className="chrono-compare-conclusion">{t('yearView.compare.inProgress', { year: liveYear })}</p>
      ) : null}
      {currentCost != null && previousCost != null && fair ? (
        <p className="chrono-compare-conclusion">
          {t(currentCost >= previousCost ? 'yearView.compare.costUp' : 'yearView.compare.costDown', {
            context: fair.scope === 'ytd' ? 'ytd' : undefined,
            amount: formatChronologioMoney(Math.abs(currentCost - previousCost), currency, numberLocale),
            year: fair.previous.periodYear,
          })}
        </p>
      ) : null}
      {insights.length > 0 ? (
        <ul className="chrono-compare-insights">
          {insights.map((comparison) => (
            <li key={comparison.kind}>
              {t(yearComparisonCopyKey(comparison), {
                context: comparison.scope === 'ytd' ? 'ytd' : undefined,
                pct: Math.abs(comparison.percent).toLocaleString(numberLocale),
                points: comparison.percent.toLocaleString(numberLocale, {
                  signDisplay: 'exceptZero',
                  maximumFractionDigits: 1,
                }),
                year: comparison.previousYear,
              })}
            </li>
          ))}
        </ul>
      ) : null}
      {drivers.length > 0 ? (
        <div className="chrono-compare-drivers">
          <h3>{t('yearView.compare.drivers')}</h3>
          {drivers.map((link) => (
            <button
              key={`${link.year}-${link.month}`}
              type="button"
              onClick={() => onOpenMonth(link.year, link.month)}
            >
              {formatMonthHeading(link.year, link.month, i18n.language)}
              {' · '}
              {link.metric === 'oil'
                ? formatGroveMassKgLabel(link.amount, numberLocale)
                : formatChronologioMoney(link.amount, currency, numberLocale)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="chrono-compare-spines">
        <div>
          <h3>{left?.key || leftYear}</h3>
          <ul>
            {leftMonths
              .filter((m) => m.highlightTitles.length || m.taskCount)
              .map((m) => (
                <li key={m.key}>
                  {monthNames[m.month - 1]} — {m.highlightTitles[0] || t('living.monthWorks', { count: m.taskCount })}
                </li>
              ))}
          </ul>
        </div>
        <div>
          <h3>{right?.key || rightYear}</h3>
          <ul>
            {rightMonths
              .filter((m) => m.highlightTitles.length || m.taskCount)
              .map((m) => (
                <li key={m.key}>
                  {monthNames[m.month - 1]} — {m.highlightTitles[0] || t('living.monthWorks', { count: m.taskCount })}
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChronologioCompare;
