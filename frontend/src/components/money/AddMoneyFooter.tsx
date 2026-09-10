import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FinancialTransactionType } from '../../finance/display';

type Props = {
  type: FinancialTransactionType;
  amountLabel: string;
  quantityLine?: string | null;
  canSubmit: boolean;
  disabledReason?: string | null;
  submitting: boolean;
  onSubmit: () => void;
  onDraft: () => void;
};

const AddMoneyFooter: React.FC<Props> = ({
  type,
  amountLabel,
  quantityLine,
  canSubmit,
  disabledReason,
  submitting,
  onSubmit,
  onDraft,
}) => {
  const { t } = useTranslation('capture');
  return (
    <footer className="money-drawer__footer">
      <p className="money-footer-summary">
        {quantityLine ? <span>{quantityLine}</span> : null}
        {type === 'income' ? t('money.incomeTotal') : t('money.expenseTotal')}
        <strong>{amountLabel}</strong>
      </p>
      <div className="money-footer-actions">
        <button type="button" className="money-primary-action" disabled={submitting || !canSubmit} onClick={onSubmit}>
          {submitting
            ? t('saving')
            : type === 'income'
              ? t('money.saveIncome')
              : t('money.saveExpense')}
        </button>
        <button type="button" className="money-text-link" disabled={submitting} onClick={onDraft}>
          {t('money.saveDraft')}
        </button>
      </div>
      {!canSubmit && disabledReason ? <p className="money-disabled-reason">{disabledReason}</p> : null}
    </footer>
  );
};

export default AddMoneyFooter;
