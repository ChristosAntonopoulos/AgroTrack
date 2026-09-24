import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreateFieldDto } from '../../services/fieldService';
import FieldColorPicker from './FieldColorPicker';
import LocationSearchField from './LocationSearchField';
import CropDetailsStep from './CropDetailsStep';

type Mode = 'create' | 'edit' | 'appearance';

interface Props {
  formData: CreateFieldDto;
  fieldId?: string | null;
  mode?: Mode;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onLocationChange?: (next: { locationText: string; latitude?: number; longitude?: number }) => void;
  onColorChange?: (color: string) => void;
}

const BasicFieldDetailsStep: React.FC<Props> = ({
  formData,
  fieldId,
  mode = 'create',
  onChange,
  onLocationChange,
  onColorChange,
}) => {
  const { t } = useTranslation('fields');

  if (mode === 'appearance' && onColorChange) {
    return (
      <div className="field-form-panel">
        <h2>{t('createGrove.appearance.title')}</h2>
        <p className="field-form-panel-desc">{t('createGrove.appearance.subtitle')}</p>
        <p className="grove-appearance-auto">{t('createGrove.appearance.autoHint')}</p>
        <FieldColorPicker value={formData.color} fieldId={fieldId} onChange={onColorChange} />
      </div>
    );
  }

  return (
    <div className="field-form-panel">
      <h2>{mode === 'create' ? t('createGrove.nameHeading') : t('createGrove.levels.name')}</h2>
      <p className="field-form-panel-desc">
        {mode === 'create' ? t('createGrove.nameHelper') : t('form.editSubtitle')}
      </p>

      <div className="form-group">
        <label htmlFor="name">{t('createGrove.nameLabel')} *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={onChange}
          placeholder={t('form.namePlaceholder')}
          required
          aria-invalid={formData.name.trim().length > 0 && formData.name.trim().length < 2}
          aria-required="true"
        />
      </div>

      {mode === 'edit' && onLocationChange ? (
        <div className="form-group">
          <LocationSearchField value={formData.locationText || ''} onChange={onLocationChange} />
        </div>
      ) : null}

      {mode === 'edit' ? <CropDetailsStep formData={formData} onChange={onChange} nested /> : null}

      {mode === 'edit' && onColorChange ? (
        <div className="form-group grove-appearance-inline">
          <h3>{t('createGrove.appearance.title')}</h3>
          <p className="field-form-hint">{t('createGrove.appearance.autoHint')}</p>
          <FieldColorPicker value={formData.color} fieldId={fieldId} onChange={onColorChange} />
        </div>
      ) : null}
    </div>
  );
};

export default BasicFieldDetailsStep;
