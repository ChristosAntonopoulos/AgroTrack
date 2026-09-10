import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import { unassignedFieldLabel } from '../../finance/display';
import { friendlyFieldLabel } from '../../utils/fieldLabels';

type Props = {
  value: string;
  fields: Field[];
  onChange: (fieldId: string) => void;
};

const TransactionFieldSelector: React.FC<Props> = ({ value, fields, onChange }) => {
  const { t, i18n } = useTranslation('capture');
  return (
    <label className="money-form-label">
      {t('money.whichField')}
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={t('fieldPrompt')}>
        <option value="">{unassignedFieldLabel(i18n.language)}</option>
        {fields.map((field) => (
          <option key={field.id} value={field.id}>
            {friendlyFieldLabel(field.name)}
            {field.variety ? ` · ${field.variety}` : ''}
            {field.areaHectares
              ? ` · ${field.areaHectares.toLocaleString(i18n.language, { maximumFractionDigits: 2 })} ha`
              : ''}
          </option>
        ))}
      </select>
    </label>
  );
};

export default TransactionFieldSelector;
