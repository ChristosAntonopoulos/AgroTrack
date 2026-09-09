import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreateFieldDto,
  FieldAreaValidationResponse,
  GeoJsonPolygon,
  GreekCadastreInfo,
} from '../../services/fieldService';
import GreekCadastreInfoCard from './GreekCadastreInfoCard';
import AreaComparisonCard from './AreaComparisonCard';

interface Props {
  formData: CreateFieldDto;
  boundary?: GeoJsonPolygon;
  cadastre?: GreekCadastreInfo;
  areaValidation?: FieldAreaValidationResponse | null;
  boundaryConfirmed: boolean;
  cadastreAcknowledged: boolean;
  onBoundaryConfirmedChange: (v: boolean) => void;
  onCadastreAcknowledgedChange: (v: boolean) => void;
}

const ReviewFieldStep: React.FC<Props> = ({
  formData,
  boundary,
  cadastre,
  areaValidation,
  boundaryConfirmed,
  cadastreAcknowledged,
  onBoundaryConfirmedChange,
  onCadastreAcknowledgedChange,
}) => {
  const { t } = useTranslation('fields');

  return (
    <div className="field-form-panel">
      <h2>{t('addField.steps.review')}</h2>
      <p className="field-form-panel-desc">{t('addField.reviewDesc')}</p>

      <dl className="field-review-list">
        <div>
          <dt>{t('form.name')}</dt>
          <dd>{formData.name}</dd>
        </div>
        <div>
          <dt>{t('addField.cropType')}</dt>
          <dd>{formData.cropType}</dd>
        </div>
        {formData.locationText && (
          <div>
            <dt>{t('locationLabel')}</dt>
            <dd>{formData.locationText}</dd>
          </div>
        )}
        {formData.treeCount != null && (
          <div>
            <dt>{t('addField.treeCount')}</dt>
            <dd>{formData.treeCount}</dd>
          </div>
        )}
        {formData.variety && (
          <div>
            <dt>{t('addField.oliveVariety')}</dt>
            <dd>{formData.variety}</dd>
          </div>
        )}
        <div>
          <dt>{t('addField.boundary')}</dt>
          <dd>{boundary ? t('addField.boundaryDrawn') : t('addField.notDrawn')}</dd>
        </div>
      </dl>

      <AreaComparisonCard
        validation={areaValidation}
        officialAreaSqm={cadastre?.officialAreaSqm}
        measuredAreaSqm={formData.area}
      />

      {cadastre && <GreekCadastreInfoCard cadastre={cadastre} />}

      <div className="review-checkboxes">
        <label className="review-checkbox">
          <input
            type="checkbox"
            checked={boundaryConfirmed}
            onChange={(e) => onBoundaryConfirmedChange(e.target.checked)}
          />
          <span>{t('addField.confirmBoundary')}</span>
        </label>
        {cadastre && (
          <label className="review-checkbox">
            <input
              type="checkbox"
              checked={cadastreAcknowledged}
              onChange={(e) => onCadastreAcknowledgedChange(e.target.checked)}
            />
            <span>{t('addField.confirmCadastre')}</span>
          </label>
        )}
      </div>
    </div>
  );
};

export default ReviewFieldStep;
