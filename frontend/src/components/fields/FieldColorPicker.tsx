import React from 'react';
import { useTranslation } from 'react-i18next';
import { FIELD_COLOR_PRESETS, resolveFieldColor } from '../../utils/fieldColors';
import './FieldColorPicker.css';

type Props = {
  value?: string | null;
  fieldId?: string | null;
  onChange: (color: string) => void;
  disabled?: boolean;
};

const FieldColorPicker: React.FC<Props> = ({ value, fieldId, onChange, disabled }) => {
  const { t } = useTranslation('fields');
  const selected = resolveFieldColor(value, fieldId);

  return (
    <div className="field-color-picker">
      <span className="field-color-picker-label">{t('form.color', { defaultValue: 'Field color' })}</span>
      <p className="field-color-picker-hint">
        {t('form.colorHint', {
          defaultValue: 'Used on Chronologio cards so you can spot this grove quickly.',
        })}
      </p>
      <div className="field-color-picker-swatches" role="radiogroup" aria-label={t('form.color')}>
        {FIELD_COLOR_PRESETS.map((color) => {
          const active = selected.toUpperCase() === color.toUpperCase();
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              className={`field-color-swatch ${active ? 'is-active' : ''}`}
              style={{ background: color }}
              onClick={() => onChange(color)}
              title={color}
            />
          );
        })}
      </div>
    </div>
  );
};

export default FieldColorPicker;
