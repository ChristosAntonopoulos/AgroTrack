import React from 'react';
import { useTranslation } from 'react-i18next';
import { amountPlaceholderForLocale } from '../../finance/decimalEntry';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
  labelledBy?: string;
  describedBy?: string;
  invalid?: boolean;
  /** The surrounding step already asks the question. */
  hideLabel?: boolean;
};

const TransactionAmountInput: React.FC<Props> = ({
  value,
  onChange,
  onBlur,
  inputRef,
  describedBy,
  invalid,
  hideLabel,
}) => {
  const { t, i18n } = useTranslation('capture');
  return (
    <label className="money-form-label money-amount-label">
      {hideLabel ? <span className="money-sr-only">{t('money.amount')}</span> : t('money.amount')}
      <div className={`money-amount-input${invalid ? ' is-invalid' : ''}`}>
        <input
          ref={inputRef}
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={amountPlaceholderForLocale(i18n.language)}
          aria-label={t('money.amount')}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        />
        <span aria-hidden>€</span>
      </div>
    </label>
  );
};

export default TransactionAmountInput;
