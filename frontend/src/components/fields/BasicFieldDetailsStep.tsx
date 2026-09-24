import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreateFieldDto } from '../../services/fieldService';
import FieldColorPicker from './FieldColorPicker';

type Mode = 'create' | 'edit' | 'appearance';

interface Props {
  formData: CreateFieldDto;
  fieldId?: string | null;
  mode?: Mode;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onColorChange?: (color: string) => void;
}

/** Name-only create/edit, or colour-only appearance step. */
const BasicFieldDetailsStep: React.FC<Props> = ({
  formData,
  fieldId,
  mode = 'create',
  onChange,
  onColorChange,
}) => {
  const { t } = useTranslation('fields');

  if (mode === 'appearance' && onColorChange) {
    return (
      <div className="field-form-panel" data-onboarding-target="grove-color">
        <h2>{t('createGrove.colorHeading')}</h2>
        <p className="field-form-panel-desc">{t('createGrove.colorHelper')}</p>
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

  return (
    <div className="field-form-panel">
      <h2>{isCreate ? t('createGrove.nameHeading') : t('form.editTitle')}</h2>
      <p className="field-form-panel-desc">
        {isCreate ? t('createGrove.nameHelper') : t('form.editSubtitle')}
      </p>

      <div className="form-group" data-onboarding-target="grove-name">
        <label htmlFor="name" className="grove-name-label-sr">
          {t('createGrove.nameLabel')}
        </label>
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
      </div>
    </div>
  );
};

export default BasicFieldDetailsStep;
