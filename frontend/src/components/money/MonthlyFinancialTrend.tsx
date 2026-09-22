import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { MonthlyFinancialResult } from '../../services/financialSummaryService';
import { shortMonthLabel } from '../../finance/display';
import { formatOfficialAmount } from '../../finance/format';
import { orderHarvestYearMonths } from '../../finance/harvestYear';
import './Money.css';

type Props = {
  year: number;
  months: MonthlyFinancialResult[];
  currency: string;
  locale: string;
  selectedMonth?: number;
  onSelectMonth: (month: number | null) => void;
};

const MonthlyFinancialTrend: React.FC<Props> = ({
  year,
  months,
  currency,
  locale,
  selectedMonth,
  onSelectMonth,
}) => {
  const { t } = useTranslation('money');
  const ordered = useMemo(() => orderHarvestYearMonths(year, months), [months, year]);
  const recorded = ordered.filter((item) => item.row?.hasRecords && item.row);
  const monthTitle = (calendarYear: number, month: number) =>
    new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
      new Date(calendarYear, month - 1, 1)
    );

  if (!recorded.length) {
    return (
      <section className="money-card">
        <h2>{t('trendTitle')}</h2>
        <p className="money-summary-note">{t('trendEmpty')}</p>
      </section>
    );
  }

  const max = Math.max(
    1,
    ...recorded.flatMap((item) => [item.row?.income || 0, item.row?.expenses || 0])
  );
  const barWidth = 18;
  const gap = 14;
  const slot = barWidth * 2 + gap;
  const chartWidth = 12 * slot;
  const height = 220;
  const totalIncome = recorded.reduce((sum, item) => sum + (item.row?.income || 0), 0);
  const totalExpenses = recorded.reduce((sum, item) => sum + (item.row?.expenses || 0), 0);
  const peak = recorded.reduce((best, item) => {
    const activity = (item.row?.income || 0) + (item.row?.expenses || 0);
    const bestActivity = (best.row?.income || 0) + (best.row?.expenses || 0);
    return activity > bestActivity ? item : best;
  }, recorded[0]);
  const trendSummary = t('trendSummary', {
    income: formatOfficialAmount(totalIncome, currency, locale, '—'),
    expenses: formatOfficialAmount(totalExpenses, currency, locale, '—'),
    peakMonth: monthTitle(peak.calendarYear, peak.month),
  });

  return (
    <section className="money-card">
      <h2>{t('trendTitle')}</h2>
      <p className="money-summary-note">{trendSummary}</p>
      <p className="money-legend">
        <span>
          <i className="is-in" />
          {t('income')}
        </span>
        <span>
          <i className="is-out" />
          {t('expenses')}
        </span>
      </p>
      <div className="money-trend">
        <svg viewBox={`0 0 ${chartWidth} ${height + 36}`} role="img" aria-label={trendSummary}>
          {ordered.map((item, index) => {
            const x = index * slot;
            const income = item.row?.income || 0;
            const expenses = item.row?.expenses || 0;
            const inH = (income / max) * height;
            const outH = (expenses / max) * height;
            const active = selectedMonth === item.month;
            const short = shortMonthLabel(item.calendarYear, item.month - 1, locale);
            const yearMark = String(item.calendarYear).slice(-2);
            const title = monthTitle(item.calendarYear, item.month);
            return (
              <g key={`${item.calendarYear}-${item.month}`}>
                <rect
                  x={x}
                  y={height - inH}
                  width={barWidth}
                  height={inH}
                  rx="4"
                  fill={active ? '#6f895f' : '#9bb787'}
                />
                <rect
                  x={x + barWidth + 4}
                  y={height - outH}
                  width={barWidth}
                  height={outH}
                  rx="4"
                  fill={active ? '#b8845c' : '#d19a72'}
                />
                <text x={x + barWidth} y={height + 16} textAnchor="middle" fontSize="11" fill="currentColor">
                  {short}
                </text>
                <text x={x + barWidth} y={height + 30} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.7">
                  {yearMark}
                </text>
                {item.row?.hasRecords ? (
                  <rect
                    x={x}
                    y={0}
                    width={barWidth * 2 + 4}
                    height={height}
                    fill="transparent"
                    role="button"
                    tabIndex={0}
                    aria-label={`${title}: ${t('income')} ${formatOfficialAmount(item.row?.income, currency, locale, '—')}, ${t('expenses')} ${formatOfficialAmount(item.row?.expenses, currency, locale, '—')}`}
                    onClick={() => onSelectMonth(active ? null : item.month)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectMonth(active ? null : item.month);
                      }
                    }}
                  />
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="money-month-list">
        {recorded.map((item) => (
          <button
            key={`${item.calendarYear}-${item.month}`}
            type="button"
            className={selectedMonth === item.month ? 'is-active' : ''}
            aria-pressed={selectedMonth === item.month}
            onClick={() => onSelectMonth(selectedMonth === item.month ? null : item.month)}
          >
            <strong>{monthTitle(item.calendarYear, item.month)}</strong>
            <span>
              {t('income')} {formatOfficialAmount(item.row?.income, currency, locale, '—')}
              {' · '}
              {t('expenses')} {formatOfficialAmount(item.row?.expenses, currency, locale, '—')}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default MonthlyFinancialTrend;
