import React from 'react';
import { useTranslation } from 'react-i18next';
import '../money/Money.css';

type Props = {
  onCapture?: () => void;
};

const MoneyPageHeader: React.FC<Props> = ({ onCapture }) => {
  const { t } = useTranslation(['money', 'capture']);
  return (
    <header className="money-page-header">
      <div>
        <h1>{t('money:title')}</h1>
        <p>{t('money:subtitle')}</p>
      </div>
      {onCapture ? (
        <button type="button" className="money-primary-action" onClick={onCapture}>
          {t('capture:money.ctaPlus')}
        </button>
      ) : null}
    </header>
  );
};

export default MoneyPageHeader;
