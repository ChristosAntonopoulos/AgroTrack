import React from 'react';
import { formatOfficialAmount, formatOfficialNet } from '../../finance/format';

type Props = {
  className: string;
  income: number | null | undefined;
  expenses: number | null | undefined;
  net: number | null | undefined;
  currency: string;
  locale: string;
  unknown: string;
  incomeLabel: string;
  expensesLabel: string;
  resultLabel: string;
  incomeEmpty?: string;
  netEmpty?: string;
};

/** Income / expenses / result facts. Same numbers as MoneySummaryGrid, compact for peeks. */
const MoneyTriadFacts: React.FC<Props> = ({
  className,
  income,
  expenses,
  net,
  currency,
  locale,
  unknown,
  incomeLabel,
  expensesLabel,
  resultLabel,
  incomeEmpty,
  netEmpty,
}) => (
  <dl className={className}>
    <div>
      <dt>{incomeLabel}</dt>
      <dd>{formatOfficialAmount(income, currency, locale, incomeEmpty || unknown)}</dd>
    </div>
    <div>
      <dt>{expensesLabel}</dt>
      <dd>{formatOfficialAmount(expenses, currency, locale, unknown)}</dd>
    </div>
    <div>
      <dt>{resultLabel}</dt>
      <dd>{formatOfficialNet(net, currency, locale, netEmpty || unknown)}</dd>
    </div>
  </dl>
);

export default MoneyTriadFacts;
