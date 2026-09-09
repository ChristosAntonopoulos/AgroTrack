import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreateFieldDto } from '../../services/fieldService';

interface Props {
  formData: CreateFieldDto;
  kaekInput: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onKaekChange: (value: string) => void;
}

const BasicFieldDetailsStep: React.FC<Props> = ({ formData, kaekInput, onChange, onKaekChange }) => {
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

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="cropType">{t('addField.cropType')} *</label>
          <select id="cropType" name="cropType" value={formData.cropType || 'Olive'} onChange={onChange}>
            <option value="Olive">Olive</option>
          </select>
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
      </div>

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

      <div className="form-group">
        <label className="field-form-checkbox">
          <input
            type="checkbox"
            name="worksThisFieldMyself"
            checked={formData.worksThisFieldMyself !== false}
            onChange={onChange}
          />
          <span>{t('addField.worksThisFieldMyself', { defaultValue: 'I work this field myself' })}</span>
        </label>
        <p className="field-form-hint">
          {t('addField.worksThisFieldMyselfHint', {
            defaultValue: 'Adds you with Own + Work on this field so you can start and finish today’s jobs.',
          })}
        </p>
      </div>
    </div>
  );
};

export default BasicFieldDetailsStep;
