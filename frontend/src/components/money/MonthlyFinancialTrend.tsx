import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { MonthlyFinancialResult } from '../../services/financialSummaryService';
import { formatOfficialAmount } from '../../finance/format';
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
  const recorded = months.filter((month) => month.hasRecords);
  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) =>
        new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(year, index, 1))
      ),
    [locale, year]
  );
  if (!recorded.length) {
    return (
      <section className="money-card">
        <h2>{t('trendTitle')}</h2>
        <p className="money-summary-note">{t('trendEmpty')}</p>
      </section>
    );
  }

  const max = Math.max(1, ...recorded.flatMap((month) => [month.income || 0, month.expenses || 0]));
  const barWidth = 18;
  const gap = 14;
  const chartWidth = 12 * (barWidth * 2 + gap);
  const height = 240;

  return (
    <section className="money-card">
      <h2>{t('trendTitle')}</h2>
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
        <svg viewBox={`0 0 ${chartWidth} ${height + 28}`} role="img" aria-label={t('monthlyAria')}>
          {months.map((month, index) => {
            const x = index * (barWidth * 2 + gap);
            const inH = ((month.income || 0) / max) * height;
            const outH = ((month.expenses || 0) / max) * height;
            const active = selectedMonth === month.month;
            return (
              <g key={month.month}>
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
                <text x={x + barWidth} y={height + 20} textAnchor="middle" fontSize="11" fill="currentColor">
                  {monthNames[index].slice(0, 3)}
                </text>
                <rect
                  x={x}
                  y={0}
                  width={barWidth * 2 + 4}
                  height={height}
                  fill="transparent"
                  role="button"
                  tabIndex={0}
                  aria-label={`${monthNames[index]}: ${t('income')} ${formatOfficialAmount(month.income, currency, locale, '—')}, ${t('expenses')} ${formatOfficialAmount(month.expenses, currency, locale, '—')}`}
                  onClick={() => onSelectMonth(active ? null : month.month)}
                />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="money-month-list">
        {recorded.map((month) => (
          <button
            key={month.month}
            type="button"
            className={selectedMonth === month.month ? 'is-active' : ''}
            onClick={() => onSelectMonth(selectedMonth === month.month ? null : month.month)}
          >
            <strong>{monthNames[month.month - 1]}</strong>
            <span>
              {t('income')} {formatOfficialAmount(month.income, currency, locale, '—')}
              {' · '}
              {t('expenses')} {formatOfficialAmount(month.expenses, currency, locale, '—')}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default MonthlyFinancialTrend;
