import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
} from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';

type Props = {
  left: ChronologioPeriodSummary | null;
  right: ChronologioPeriodSummary | null;
  leftMonths: ChronologioMonthSummary[];
  rightMonths: ChronologioMonthSummary[];
  leftYear: number;
  rightYear: number;
  availableYears: number[];
  numberLocale: string;
  onChangeYears: (pair: [number, number]) => void;
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
  onChangeYears,
  onClose,
}) => {
  const { t, i18n } = useTranslation('chronologio');

  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { month: 'short', timeZone: 'UTC' });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(Date.UTC(2020, i, 1))));
  }, [i18n.language]);

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
            a: left?.oliveKg && left.oliveKg > 0 ? `${Math.round(left.oliveKg).toLocaleString(numberLocale)} kg` : '—',
            b: right?.oliveKg && right.oliveKg > 0 ? `${Math.round(right.oliveKg).toLocaleString(numberLocale)} kg` : '—',
          },
        ]
      : []),
    ...(left?.oilKg || right?.oilKg
      ? [
          {
            label: t('yearSummary.oilKg'),
            a: left?.oilKg && left.oilKg > 0 ? `${Math.round(left.oilKg).toLocaleString(numberLocale)} kg` : '—',
            b: right?.oilKg && right.oilKg > 0 ? `${Math.round(right.oilKg).toLocaleString(numberLocale)} kg` : '—',
          },
        ]
      : []),
    ...(left?.oilYieldPercent != null || right?.oilYieldPercent != null
      ? [
          {
            label: t('living.yield'),
            a: left?.oilYieldPercent != null ? `${left.oilYieldPercent}%` : '—',
            b: right?.oilYieldPercent != null ? `${right.oilYieldPercent}%` : '—',
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
