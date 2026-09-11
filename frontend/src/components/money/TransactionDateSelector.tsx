import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatLongDate, shiftIsoDate, todayIsoDate } from '../../finance/moneyUi';

type Props = {
  value: string;
  onChange: (isoDate: string) => void;
};

const TransactionDateSelector: React.FC<Props> = ({ value, onChange }) => {
  const { t, i18n } = useTranslation('capture');
  const today = todayIsoDate();
  const yesterday = shiftIsoDate(today, -1);
  const isCustom = value !== today && value !== yesterday;
  const [picking, setPicking] = useState(isCustom);

  return (
    <div>
      <div className="money-form-label">{t('money.whenDidItHappen')}</div>
      <div className="money-date-quick" role="group" aria-label={t('money.whenDidItHappen')}>
        <button
          type="button"
          className={`money-chip${value === today ? ' is-active' : ''}`}
          aria-pressed={value === today}
          onClick={() => {
            setPicking(false);
            onChange(today);
          }}
        >
          {t('today')}
        </button>
        <button
          type="button"
          className={`money-chip${value === yesterday ? ' is-active' : ''}`}
          aria-pressed={value === yesterday}
          onClick={() => {
            setPicking(false);
            onChange(yesterday);
          }}
        >
          {t('money.yesterday')}
        </button>
        <button
          type="button"
          className={`money-chip${picking || isCustom ? ' is-active' : ''}`}
          aria-pressed={picking || isCustom}
          onClick={() => setPicking(true)}
        >
          {t('money.pickDate')}
        </button>
      </div>
      <p className="money-summary-note">{formatLongDate(value, i18n.language)}</p>
      {picking || isCustom ? (
        <label className="money-form-label" style={{ marginTop: 8 }}>
          {t('dateLabel')}
          <input
            type="date"
            value={value}
            onChange={(e) => {
              if (!e.target.value) return;
              onChange(e.target.value);
            }}
          />
        </label>
      ) : null}
    </div>
  );
};

export default TransactionDateSelector;
