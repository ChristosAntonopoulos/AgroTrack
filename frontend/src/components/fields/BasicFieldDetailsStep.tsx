import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreateFieldDto } from '../../services/fieldService';
import FieldColorPicker from './FieldColorPicker';

interface Props {
  formData: CreateFieldDto;
  kaekInput: string;
  showKaek?: boolean;
  fieldId?: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onKaekChange: (value: string) => void;
  onColorChange: (color: string) => void;
}

const BasicFieldDetailsStep: React.FC<Props> = ({
  formData,
  kaekInput,
  showKaek,
  fieldId,
  onChange,
  onKaekChange,
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
        <label htmlFor="locationText">{t('locationLabel')}</label>
        <input
          type="text"
          id="locationText"
          name="locationText"
          value={formData.locationText || ''}
          onChange={onChange}
          placeholder={t('addField.locationPlaceholder')}
        />
      </div>

      <div className="form-group">
        <FieldColorPicker value={formData.color} fieldId={fieldId} onChange={onColorChange} />
      </div>

      {showKaek ? (
        <div className="form-group">
          <label htmlFor="kaek">{t('addField.kaek')}</label>
          <input
            type="text"
            id="kaek"
            value={kaekInput}
            onChange={(e) => onKaekChange(e.target.value)}
            placeholder="362621142088/0/0"
          />
          <p className="field-form-hint">{t('addField.kaekHint')}</p>
        </div>
      ) : null}
    </div>
  );
};

export default BasicFieldDetailsStep;
