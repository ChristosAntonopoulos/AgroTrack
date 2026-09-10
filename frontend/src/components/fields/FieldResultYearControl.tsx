import React from 'react';
import { useTranslation } from 'react-i18next';
import './FieldPageShell.css';

type Props = {
  year: number;
  onYearChange: (year: number) => void;
};

const FieldResultYearControl: React.FC<Props> = ({ year, onYearChange }) => {
  const { t } = useTranslation('fields');

  return (
    <div className="field-year-control" role="group" aria-label={t('page.yearAria')}>
      <button type="button" aria-label={t('page.prevYear')} onClick={() => onYearChange(year - 1)}>
        ‹
      </button>
      <strong aria-live="polite">{year}</strong>
      <button type="button" aria-label={t('page.nextYear')} onClick={() => onYearChange(year + 1)}>
        ›
      </button>
    </div>
  );
};

export default FieldResultYearControl;
