import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Leaf, MapPin, Pentagon, Trees } from 'lucide-react';
import {
  CreateFieldDto,
  Field,
  FieldAreaValidationResponse,
  GeoJsonPolygon,
} from '../../services/fieldService';
import { normalizeLocale } from '../../i18n/config';
import AreaComparisonCard from './AreaComparisonCard';
import FieldPolygonThumbnail from './FieldPolygonThumbnail';

interface Props {
  formData: CreateFieldDto;
  boundary?: GeoJsonPolygon;
  areaValidation?: FieldAreaValidationResponse | null;
  boundaryConfirmed: boolean;
  onBoundaryConfirmedChange: (v: boolean) => void;
  isActiveEdit?: boolean;
  requireBoundaryConfirm?: boolean;
}

const ReviewFieldStep: React.FC<Props> = ({
  formData,
  boundary,
  areaValidation,
  boundaryConfirmed,
  onBoundaryConfirmedChange,
  isActiveEdit = false,
  requireBoundaryConfirm = true,
}) => {
  const { t, i18n } = useTranslation('fields');
  const locale = normalizeLocale(i18n.language);
  const varietyLabel = formData.variety
    ? t(`addField.varietyOptions.${formData.variety}`, { defaultValue: formData.variety })
    : null;
  const treeCountLabel =
    formData.treeCount != null
      ? Number(formData.treeCount).toLocaleString(locale === 'el' ? 'el-GR' : locale === 'it' ? 'it-IT' : 'en-US')
      : null;

  const previewField = {
    id: formData.name || 'draft',
    name: formData.name,
    color: formData.color,
    boundary,
    latitude: formData.latitude,
    longitude: formData.longitude,
  } as Field;

  const facts = [
    treeCountLabel != null
      ? {
          key: 'trees',
          label: t('addField.treeCount'),
          value: treeCountLabel,
          icon: Trees,
        }
      : null,
    varietyLabel
      ? {
          key: 'variety',
          label: t('addField.oliveVariety'),
          value: varietyLabel,
          icon: Leaf,
        }
      : null,
    {
      key: 'boundary',
      label: t('addField.boundary'),
      value: boundary ? t('addField.boundaryDrawn') : t('addField.notDrawn'),
      icon: Pentagon,
      tone: boundary ? 'ok' : 'muted',
    },
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: string;
    icon: typeof Trees;
    tone?: 'ok' | 'muted';
  }>;

  const showBoundaryConfirm = Boolean(boundary) && requireBoundaryConfirm;

  return (
    <div className="field-form-panel field-review">
      <header className="field-review-header">
        <h2>{isActiveEdit ? t('form.editReviewTitle') : t('addField.steps.review')}</h2>
        <p className="field-form-panel-desc">
          {isActiveEdit ? t('form.editReviewDesc') : t('addField.reviewDesc')}
        </p>
      </header>

      <section className="field-review-hero" aria-label={t('form.name')}>
        <div className="field-review-hero-copy">
          <p className="field-review-kicker">{t('form.name')}</p>
          <h3 className="field-review-name">{formData.name || '—'}</h3>
          {formData.locationText ? (
            <p className="field-review-place">
              <MapPin size={16} strokeWidth={2} aria-hidden />
              <span>{formData.locationText}</span>
            </p>
          ) : null}
        </div>
        <FieldPolygonThumbnail field={previewField} />
      </section>

      <dl className="field-review-facts">
        {facts.map((fact) => {
          const Icon = fact.icon;
          return (
            <div key={fact.key} className={`field-review-fact${fact.tone ? ` is-${fact.tone}` : ''}`}>
              <dt>
                <Icon size={16} strokeWidth={1.85} aria-hidden />
                {fact.label}
              </dt>
              <dd>{fact.value}</dd>
            </div>
          );
        })}
      </dl>

      {!boundary ? (
        <p className="field-review-no-boundary" role="status">
          {t('addField.reviewNoBoundaryNote')}
        </p>
      ) : null}

      <AreaComparisonCard
        validation={areaValidation}
        measuredAreaSqm={formData.area > 0 ? formData.area : undefined}
      />

      <div className="review-checkboxes">
        {showBoundaryConfirm ? (
          <label className={`review-checkbox${boundaryConfirmed ? ' is-checked' : ''}`}>
            <input
              type="checkbox"
              checked={boundaryConfirmed}
              onChange={(e) => onBoundaryConfirmedChange(e.target.checked)}
            />
            <span>
              <strong>{t('addField.confirmBoundary')}</strong>
            </span>
            {boundaryConfirmed ? <Check className="review-checkbox-mark" size={18} strokeWidth={2.4} aria-hidden /> : null}
          </label>
        ) : null}
      </div>
    </div>
  );
};

export default ReviewFieldStep;
