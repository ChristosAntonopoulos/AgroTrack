import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreateFieldDto } from '../../services/fieldService';
import FieldColorPicker from './FieldColorPicker';
import LocationSearchField from './LocationSearchField';

interface Props {
  formData: CreateFieldDto;
  fieldId?: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onLocationChange: (next: { locationText: string; latitude?: number; longitude?: number }) => void;
  onColorChange: (color: string) => void;
}

const BasicFieldDetailsStep: React.FC<Props> = ({
  formData,
  fieldId,
  onChange,
  onLocationChange,
  onColorChange,
}) => {
  const { t } = useTranslation('fields');

  return (
    <div className="field-form-panel">
      <h2>{t('addField.steps.basics')}</h2>
      <p className="field-form-panel-desc">{t('addField.basicsDesc')}</p>

      <div className="form-group">
        <label htmlFor="name">{t('form.name')} *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={onChange}
          placeholder={t('form.namePlaceholder')}
          required
        />
      </div>

      <div className="form-group">
        <LocationSearchField
          value={formData.locationText || ''}
          onChange={onLocationChange}
        />
      </div>

      <div className="form-group">
        <FieldColorPicker value={formData.color} fieldId={fieldId} onChange={onColorChange} />
      </div>
    </div>
  );
};

export default BasicFieldDetailsStep;
