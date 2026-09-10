import React from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
  labelledBy?: string;
};

const TransactionAmountInput: React.FC<Props> = ({ value, onChange, onBlur, inputRef }) => {
  const { t } = useTranslation('capture');
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
          placeholder="0,00"
          aria-label={t('money.amount')}
        />
        <span aria-hidden>€</span>
      </div>
    </label>
  );
};

export default TransactionAmountInput;
