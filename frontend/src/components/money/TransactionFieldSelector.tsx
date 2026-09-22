import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import type { Field } from '../../services/fieldService';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';

type Props = {
  value: string;
  fields: Field[];
  onChange: (fieldId: string) => void;
  hideLabel?: boolean;
  /** When false, hide the “no field” option (oil sales that already know their groves). */
  allowUnassigned?: boolean;
  unassignedLabel?: string;
  hint?: string;
};

const TransactionFieldSelector: React.FC<Props> = ({
  value,
  fields,
  onChange,
  hideLabel,
  allowUnassigned = true,
  unassignedLabel,
  hint,
}) => {
  const { t } = useTranslation('capture');

  return (
    <div className="money-field-block">
      <div className="money-form-label" id="money-field-label">
        {hideLabel ? <span className="money-sr-only">{t('money.whichField')}</span> : t('money.whichField')}
      </div>
      {hint ? <p className="capture-hint">{hint}</p> : null}
      <div className="money-field-list" role="radiogroup" aria-labelledby={hideLabel ? 'money-step-title' : 'money-field-label'}>
        {fields.map((field) => {
          const name = friendlyFieldLabel(field.name);
          const color = resolveFieldColor(field.color, field.id);
          const selected = value === field.id;
          return (
            <button
              key={field.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`money-field-choice${selected ? ' is-selected' : ''}`}
              style={{ ['--field-accent' as string]: color }}
              onClick={() => onChange(field.id)}
            >
              <span className="money-field-swatch" style={{ background: color }} aria-hidden />
              <span className="money-field-choice__name">{name}</span>
              <ChevronRight className="money-field-choice__go" size={18} aria-hidden />
            </button>
          );
        })}
        {allowUnassigned ? (
          <button
            type="button"
            role="radio"
            aria-checked={value === ''}
            className={`money-field-choice is-unassigned${value === '' ? ' is-selected' : ''}`}
            onClick={() => onChange('')}
          >
            <span className="money-field-swatch is-empty" aria-hidden />
            <span className="money-field-choice__name">
              {unassignedLabel || t('money.noSpecificField')}
            </span>
            <ChevronRight className="money-field-choice__go" size={18} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default TransactionFieldSelector;
