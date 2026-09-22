import React from 'react';
import { useTranslation } from 'react-i18next';
import { amountPlaceholderForLocale, decimalSeparatorForLocale } from '../../finance/decimalEntry';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
  labelledBy?: string;
  describedBy?: string;
  invalid?: boolean;
};

const TransactionAmountInput: React.FC<Props> = ({
  value,
  onChange,
  onBlur,
  inputRef,
  describedBy,
  invalid,
}) => {
  const { t, i18n } = useTranslation(['capture', 'money']);
  const separator = decimalSeparatorForLocale(i18n.language);
  return (
    <label className="money-form-label">
      {t('money.amount')}
      <div className="money-amount-input">
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
      <span className="capture-hint money-decimal-hint">
        {t('money:decimalHint', {
          separator: separator === ',' ? t('money:decimalComma') : t('money:decimalPeriod'),
        })}
      </span>
    </label>
  );
};

export default TransactionAmountInput;
