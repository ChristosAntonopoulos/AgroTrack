import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreateFieldDto } from '../../services/fieldService';

const VARIETY_OPTIONS = ['Koroneiki', 'Kalamon', 'Megaritiki', 'Manaki', 'Unknown', 'Other'];
const IRRIGATION_OPTIONS = ['Rainfed', 'Drip irrigation', 'Sprinkler', 'Mixed', 'Unknown'];
const SLOPE_OPTIONS = ['Flat', 'Slight slope', 'Moderate slope', 'Steep', 'Unknown'];
const SOIL_OPTIONS = ['Clay Loam', 'Sandy Loam', 'Loam', 'Rocky', 'Calcareous', 'Unknown', 'Other'];

interface Props {
  formData: CreateFieldDto;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

const CropDetailsStep: React.FC<Props> = ({ formData, onChange }) => {
  const { t } = useTranslation('fields');

  return (
    <div className="field-form-panel">
      <h2>{t('addField.steps.crop')}</h2>
      <p className="field-form-panel-desc">{t('addField.cropDesc')}</p>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="treeCount">{t('addField.treeCount')}</label>
          <input
            type="number"
            id="treeCount"
            name="treeCount"
            min="0"
            value={formData.treeCount ?? ''}
            onChange={onChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="variety">{t('addField.oliveVariety')}</label>
          <select id="variety" name="variety" value={formData.variety || ''} onChange={onChange}>
            <option value="">{t('addField.selectOption', { defaultValue: 'Select…' })}</option>
            {VARIETY_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="irrigationType">{t('addField.irrigationType')}</label>
          <select
            id="irrigationType"
            name="irrigationType"
            value={formData.irrigationType || ''}
            onChange={onChange}
          >
            <option value="">{t('addField.selectOption', { defaultValue: 'Select…' })}</option>
            {IRRIGATION_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="soilType">{t('addField.soilType')}</label>
          <select id="soilType" name="soilType" value={formData.soilType || ''} onChange={onChange}>
            <option value="">{t('addField.selectOption', { defaultValue: 'Select…' })}</option>
            {SOIL_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="slope">{t('addField.slope')}</label>
        <select id="slope" name="slope" value={formData.slope || ''} onChange={onChange}>
          <option value="">{t('form.selectOption')}</option>
          {SLOPE_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="accessNotes">{t('addField.accessNotes')}</label>
        <textarea
          id="accessNotes"
          name="accessNotes"
          rows={3}
          value={formData.accessNotes || ''}
          onChange={onChange}
        />
      </div>
    </div>
  );
};

export default CropDetailsStep;
