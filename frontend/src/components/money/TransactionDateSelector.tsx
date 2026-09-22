import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { shiftIsoDate, todayIsoDate } from '../../finance/moneyUi';

type Props = {
  value: string;
  onChange: (isoDate: string) => void;
  hideLabel?: boolean;
};

const TransactionDateSelector: React.FC<Props> = ({ value, onChange, hideLabel }) => {
  const { t } = useTranslation('capture');
  const today = todayIsoDate();
  const yesterday = shiftIsoDate(today, -1);
  const isCustom = value !== today && value !== yesterday;
  const [picking, setPicking] = useState(isCustom);

  return (
    <div className="money-when">
      <div className="money-form-label" id="money-when-label">
        {hideLabel ? <span className="money-sr-only">{t('money.whenDidItHappen')}</span> : t('money.whenDidItHappen')}
      </div>
      <div className="money-choice" role="group" aria-labelledby="money-when-label">
        <button
          type="button"
          className={value === today && !picking ? 'is-active' : ''}
          aria-pressed={value === today && !picking}
          onClick={() => {
            setPicking(false);
            onChange(today);
          }}
        >
          {t('today')}
        </button>
        <button
          type="button"
          className={value === yesterday && !picking ? 'is-active' : ''}
          aria-pressed={value === yesterday && !picking}
          onClick={() => {
            setPicking(false);
            onChange(yesterday);
          }}
        >
          {t('money.yesterday')}
        </button>
        <button
          type="button"
          className={picking || isCustom ? 'is-active' : ''}
          aria-pressed={picking || isCustom}
          onClick={() => setPicking(true)}
        >
          {t('money.pickDate')}
        </button>
      </div>
      {picking || isCustom ? (
        <label className="money-form-label money-when__date">
          <span className="money-sr-only">{t('dateLabel')}</span>
          <input
            type="date"
            value={value}
            aria-label={t('dateLabel')}
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
