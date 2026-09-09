import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FieldFinancialSummary } from '../../services/financialEntryService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import { formatSignedMoney, numberLocaleFor } from '../../utils/fieldDisplay';
import './FieldOverviewBlocks.css';

type Props = {
  fieldId: string;
  summary: FieldFinancialSummary | null;
};

const FieldFinanceSummary: React.FC<Props> = ({ fieldId, summary }) => {
  const { t, i18n } = useTranslation('fields');
  const locale = numberLocaleFor(i18n.language);
  const currency = summary?.currency || 'EUR';
  const income = summary?.totalIncome ?? 0;
  const expenses = summary?.totalExpenses ?? 0;
  const net = summary?.net ?? income - expenses;

  return (
    <section className="fd-block">
      <h2>{t('overview.financeTitle')}</h2>
      <dl className="fd-finance">
        <div>
          <dt>{t('overview.income')}</dt>
          <dd className="is-in">+ {formatChronologioMoney(income, currency, locale)}</dd>
        </div>
        <div>
          <dt>{t('overview.expenses')}</dt>
          <dd className="is-out">− {formatChronologioMoney(expenses, currency, locale)}</dd>
        </div>
        <div className="fd-finance-result">
          <dt>{t('overview.result')}</dt>
          <dd className={net >= 0 ? 'is-in' : 'is-out'}>{formatSignedMoney(net, currency, locale)}</dd>
        </div>
      </dl>
      <Link className="fd-text-link" to={`/money?fieldId=${encodeURIComponent(fieldId)}`}>
        {t('overview.seeFinance')}
      </Link>
    </section>
  );
};

export default FieldFinanceSummary;
