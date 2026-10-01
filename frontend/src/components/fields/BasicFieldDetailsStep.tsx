import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { CreateFieldDto } from '../../services/fieldService';
import FieldColorPicker from './FieldColorPicker';

type Mode = 'create' | 'edit' | 'appearance';

interface Props {
  formData: CreateFieldDto;
  fieldId?: string | null;
  mode?: Mode;
  /** Page heading already asks the question. */
  hidePrompt?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onColorChange?: (color: string) => void;
}

/** Name-only create/edit, or colour-only appearance step. */
const BasicFieldDetailsStep: React.FC<Props> = ({
  formData,
  fieldId,
  mode = 'create',
  hidePrompt = false,
  onChange,
  onColorChange,
}) => {
  const { t } = useTranslation('fields');

  if (mode === 'appearance' && onColorChange) {
    return (
      <div className="field-form-panel" data-onboarding-target="grove-color">
        <h2>{t('createGrove.colorHeading')}</h2>
        <FieldColorPicker
          value={formData.color}
          fieldId={fieldId}
          onChange={onColorChange}
          showLabel={false}
        />
      </div>
    );
  }

  const isCreate = mode === 'create';
  const suggestions = (
    t('createGrove.nameSuggestions', { returnObjects: true }) as string[]
  ).filter((item) => typeof item === 'string' && item.trim());

  const applySuggestion = (value: string) => {
    onChange({
      target: { name: 'name', value, type: 'text' },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  const nameInput = (
    <input
      type="text"
      id="name"
      name="name"
      value={formData.name}
      onChange={onChange}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && formData.name.trim().length >= 2) {
          e.preventDefault();
          (e.currentTarget.form || e.currentTarget.closest('.field-form-card'))
            ?.querySelector<HTMLButtonElement>('.grove-create-nav .btn-primary')
            ?.click();
        }
      }}
      placeholder={t('form.namePlaceholder')}
      required
      aria-invalid={formData.name.trim().length > 0 && formData.name.trim().length < 2}
      aria-required="true"
      autoComplete="off"
    />
  );

  if (isCreate) {
    return (
      <div className="field-form-panel">
        <div className="grove-name-box" data-onboarding-target="grove-name">
          {hidePrompt ? (
            <label htmlFor="name" className="grove-name-label-sr">
              {t('createGrove.nameHeading')}
            </label>
          ) : (
            <label htmlFor="name" className="grove-name-prompt">
              {t('createGrove.nameHeading')}
            </label>
          )}
          <div className="grove-name-field">{nameInput}</div>
          {suggestions.length > 0 ? (
            <div
              className="grove-name-suggestions"
              role="group"
              aria-label={t('createGrove.nameSuggestionsLabel')}
            >
              {suggestions.map((suggestion) => {
                const selected = formData.name.trim() === suggestion;
                return (
                  <button
                    key={suggestion}
                    type="button"
                    className={`grove-name-suggestion${selected ? ' is-selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => applySuggestion(suggestion)}
                  >
                    {selected ? <Check size={14} strokeWidth={3} aria-hidden /> : null}
                    {suggestion}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="field-form-panel">
      <h2>{t('form.editTitle')}</h2>
      <p className="field-form-panel-desc">{t('form.editSubtitle')}</p>

      <div className="form-group">
        <label htmlFor="name">{t('createGrove.nameLabel')}</label>
        {nameInput}
      </div>
    </div>
  );
};

export default BasicFieldDetailsStep;
