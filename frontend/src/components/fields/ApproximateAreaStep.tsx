import React from 'react';
import { useTranslation } from 'react-i18next';

export type AreaUnit = 'stremmata' | 'hectares';

type Props = {
  value: string;
  unit: AreaUnit;
  onChange: (next: { value: string; unit: AreaUnit }) => void;
};

const ApproximateAreaStep: React.FC<Props> = ({ value, unit, onChange }) => {
  const { t, i18n } = useTranslation('fields');
  const preferStremmata = i18n.language.startsWith('el');

  return (
    <div className="field-form-panel approximate-area-step">
      <h2>{t('createGrove.area.title')}</h2>
      <p className="field-form-panel-desc">{t('createGrove.area.subtitle')}</p>

      <div className="form-group">
        <label htmlFor="approx-area">{t('createGrove.area.label')}</label>
        <div className="approximate-area-row">
          <input
            id="approx-area"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={value}
            onChange={(e) => onChange({ value: e.target.value, unit })}
            placeholder={t('createGrove.area.placeholder')}
            autoFocus
          />
          <select
            aria-label={t('createGrove.area.unitAria')}
            value={unit}
            onChange={(e) => onChange({ value, unit: e.target.value as AreaUnit })}
          >
            {preferStremmata ? (
              <>
                <option value="stremmata">{t('createGrove.area.stremmata')}</option>
                <option value="hectares">{t('createGrove.area.hectares')}</option>
              </>
            ) : (
              <>
                <option value="hectares">{t('createGrove.area.hectares')}</option>
                <option value="stremmata">{t('createGrove.area.stremmata')}</option>
              </>
            )}
          </select>
        </div>
        <p className="field-form-hint">{t('createGrove.area.hint')}</p>
      </div>
    </div>
  );
};

export default ApproximateAreaStep;
