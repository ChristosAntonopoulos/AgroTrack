import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FinancialTransactionType } from '../../finance/display';

type Props = {
  value: FinancialTransactionType;
  onChange: (type: FinancialTransactionType) => void;
  canRecordIncome: boolean;
  canRecordExpense: boolean;
};

const MoneyTypeToggle: React.FC<Props> = ({
  value,
  onChange,
  canRecordIncome,
  canRecordExpense,
}) => {
  const { t } = useTranslation('capture');
  return (
    <div className="money-type-toggle" role="tablist" aria-label={t('money.chooserTitle')}>
      {canRecordIncome ? (
        <button
          type="button"
          role="tab"
          className="is-income"
          aria-selected={value === 'income'}
          onClick={() => onChange('income')}
        >
          {t('types.income.title')}
        </button>
      ) : null}
      {canRecordExpense ? (
        <button
          type="button"
          role="tab"
          className="is-expense"
          aria-selected={value === 'expense'}
          onClick={() => onChange('expense')}
        >
          {t('types.expense.title')}
        </button>
      ) : null}
    </div>
  );
};

export default MoneyTypeToggle;
