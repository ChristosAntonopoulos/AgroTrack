import React from 'react';
import { useTranslation } from 'react-i18next';
import { UNASSIGNED_FIELD_QUERY } from '../../finance/buildYearSummary';
import { unassignedFieldLabel } from '../../finance/display';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import type { Field } from '../../services/fieldService';
import './Money.css';

type Props = {
  year: number;
  fieldId: string;
  fields: Field[];
  onYearChange: (year: number) => void;
  onFieldChange: (fieldId: string) => void;
};

const MoneyContextBar: React.FC<Props> = ({ year, fieldId, fields, onYearChange, onFieldChange }) => {
  const { t, i18n } = useTranslation('money');
  return (
    <div className="money-context-bar">
      <div className="year-control">
        <button type="button" aria-label={t('prevYear')} onClick={() => onYearChange(year - 1)}>
          ‹
        </button>
        <strong aria-live="polite">{year}</strong>
        <button type="button" aria-label={t('nextYear')} onClick={() => onYearChange(year + 1)}>
          ›
        </button>
      </div>
      <label className="money-sr-only" htmlFor="money-field">
        {t('fieldAria')}
      </label>
      <select
        id="money-field"
        className="money-select"
        value={fieldId}
        onChange={(e) => onFieldChange(e.target.value)}
      >
        <option value="">{t('allFields')}</option>
        {fields.map((field) => (
          <option key={field.id} value={field.id}>
            {friendlyFieldLabel(field.name)}
          </option>
        ))}
        <option value={UNASSIGNED_FIELD_QUERY}>{unassignedFieldLabel(i18n.language)}</option>
      </select>
    </div>
  );
};

export default MoneyContextBar;
