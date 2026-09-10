import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../../services/fieldService';
import { formatFieldArea } from '../../../utils/area';
import { getFieldShortLocation } from '../../../utils/shortLocation';
import type { SupportedLocale } from '../../../i18n/config';

interface FieldSelectorProps {
  fields: Field[];
  value: string;
  onChange: (fieldId: string) => void;
}

const FieldSelector: React.FC<FieldSelectorProps> = ({ fields, value, onChange }) => {
  const { t, i18n } = useTranslation('tasks');

  return (
    <div className="task-form-field">
      <p className="task-form-label" id="task-field-label">
        {t('fieldWork.form.fieldQuestion')}
      </p>
      <div className="task-field-list" role="listbox" aria-labelledby="task-field-label">
        {fields.map((field) => {
          const locale: SupportedLocale = i18n.language.startsWith('el')
            ? 'el'
            : i18n.language.startsWith('it')
              ? 'it'
              : 'en';
          const area = formatFieldArea(field, { locale });
          const location = getFieldShortLocation(field);
          const selected = value === field.id;
          return (
            <button
              key={field.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={`task-field-option${selected ? ' is-selected' : ''}`}
              onClick={() => onChange(field.id)}
            >
              <strong>{field.name}</strong>
              <span>
                {[area !== '—' ? area : '', location].filter(Boolean).join(' · ')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FieldSelector;
