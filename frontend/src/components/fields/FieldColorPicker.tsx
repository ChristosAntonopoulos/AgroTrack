import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import {
  FIELD_COLOR_NAMES,
  FIELD_COLOR_PRESETS,
  fieldColorNameKey,
  resolveFieldColor,
} from '../../utils/fieldColors';
import './FieldColorPicker.css';

type Props = {
  value?: string | null;
  fieldId?: string | null;
  onChange: (color: string) => void;
  disabled?: boolean;
  /** Hide title/hint when the parent panel already explains colour. */
  showLabel?: boolean;
};

const FieldColorPicker: React.FC<Props> = ({
  value,
  fieldId,
  onChange,
  disabled,
  showLabel = true,
}) => {
  const { t } = useTranslation('fields');
  const selected = resolveFieldColor(value, fieldId);
  const selectedName = t(fieldColorNameKey(selected), { defaultValue: selected });
  const lightSwatch = (hex: string) => {
    const n = Number.parseInt(hex.replace('#', ''), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return r * 0.299 + g * 0.587 + b * 0.114 > 170;
  };

  return (
    <div className="field-color-picker">
      {showLabel ? (
        <>
          <span className="field-color-picker-label">
            {t('form.color', { defaultValue: 'Field color' })}
          </span>
          <p className="field-color-picker-hint">
            {t('form.colorHint', {
              defaultValue: 'Used on History cards so you can spot this grove quickly.',
            })}
          </p>
        </>
      ) : null}
      <div
        className="field-color-picker-swatches"
        role="radiogroup"
        aria-label={t('form.color', { defaultValue: 'Field color' })}
      >
        {FIELD_COLOR_PRESETS.map((color) => {
          const active = selected.toUpperCase() === color.toUpperCase();
          const name =
            t(`form.colorNames.${color.slice(1)}`, {
              defaultValue: FIELD_COLOR_NAMES[color],
            }) || FIELD_COLOR_NAMES[color];
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={name}
              disabled={disabled}
              className={`field-color-swatch${active ? ' is-active' : ''}${lightSwatch(color) ? ' is-light' : ''}`}
              style={{ background: color }}
              onClick={() => onChange(color)}
              title={name}
            >
              {active ? <Check size={16} strokeWidth={3} aria-hidden /> : null}
            </button>
          );
        })}
      </div>
      <p className="field-color-picker-chosen">{selectedName}</p>
    </div>
  );
};

export default FieldColorPicker;
