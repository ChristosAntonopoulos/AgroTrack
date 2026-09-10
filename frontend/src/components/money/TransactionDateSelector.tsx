import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatLongDate, shiftIsoDate, todayIsoDate } from '../../finance/moneyUi';

type Props = {
  value: string;
  onChange: (isoDate: string) => void;
};

const TransactionDateSelector: React.FC<Props> = ({ value, onChange }) => {
  const { t, i18n } = useTranslation('capture');
  const [picking, setPicking] = useState(false);
  const today = todayIsoDate();
  const yesterday = shiftIsoDate(today, -1);

  return (
    <div>
      <div className="money-form-label">{t('money.whenDidItHappen')}</div>
      <div className="money-date-quick">
        <button
          type="button"
          className={`money-chip${value === today ? ' is-active' : ''}`}
          onClick={() => onChange(today)}
        >
          {t('today')}
        </button>
        <button
          type="button"
          className={`money-chip${value === yesterday ? ' is-active' : ''}`}
          onClick={() => onChange(yesterday)}
        >
          {t('money.yesterday')}
        </button>
        <button type="button" className="money-chip" onClick={() => setPicking(true)}>
          {t('money.pickDate')}
        </button>
      </div>
      <p className="money-summary-note">{formatLongDate(value, i18n.language)}</p>
      {picking ? (
        <label className="money-form-label">
          {t('dateLabel')}
          <input
            type="date"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setPicking(false);
            }}
          />
        </label>
      ) : null}
    </div>
  );
};

export default TransactionDateSelector;
