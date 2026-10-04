import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FinancialTransactionType } from '../../finance/display';

type Props = {
  type: FinancialTransactionType;
  amountLabel: string;
  quantityLine?: string | null;
  canSubmit: boolean;
  canDraft?: boolean;
  disabledReason?: string | null;
  draftDisabledReason?: string | null;
  submitting: boolean;
  onSubmit: () => void;
  onDraft: () => void;
};

const AddMoneyFooter: React.FC<Props> = ({
  type,
  amountLabel,
  quantityLine,
  canSubmit,
  canDraft = canSubmit,
  disabledReason,
  draftDisabledReason,
  submitting,
  onSubmit,
  onDraft,
}) => {
  const { t } = useTranslation('capture');
  const reason =
    !canDraft && draftDisabledReason
      ? draftDisabledReason
      : !canSubmit && disabledReason
        ? disabledReason
        : null;

  const hasAmount = amountLabel !== '—';

  return (
    <footer className={`money-drawer__footer is-${type}`}>
      {hasAmount ? (
        <p className="money-footer-summary">
          {quantityLine ? <span className="money-footer-qty">{quantityLine}</span> : null}
          <span>{type === 'income' ? t('money.incomeTotal') : t('money.expenseTotal')}</span>
          <strong>{amountLabel}</strong>
        </p>
      ) : null}
      <div className="money-footer-actions">
        <button type="button" className="money-primary-action" disabled={submitting || !canSubmit} onClick={onSubmit}>
          {submitting
            ? t('saving')
            : type === 'income'
              ? t('money.saveIncome')
              : t('money.saveExpense')}
        </button>
        <button
          type="button"
          className="money-quiet-link"
          disabled={submitting || !canDraft}
          onClick={onDraft}
        >
          {t('money.saveDraft')}
        </button>
      </div>
      {reason ? <p className="money-sr-only">{reason}</p> : null}
    </footer>
  );
};

export default AddMoneyFooter;
