import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Droplets, Leaf, MapPin, Pentagon, Trees } from 'lucide-react';
import {
  CreateFieldDto,
  Field,
  FieldAreaValidationResponse,
  GeoJsonPolygon,
  GreekCadastreInfo,
} from '../../services/fieldService';
import { normalizeLocale } from '../../i18n/config';
import GreekCadastreInfoCard from './GreekCadastreInfoCard';
import AreaComparisonCard from './AreaComparisonCard';
import FieldPolygonThumbnail from './FieldPolygonThumbnail';

interface Props {
  formData: CreateFieldDto;
  boundary?: GeoJsonPolygon;
  cadastre?: GreekCadastreInfo;
  areaValidation?: FieldAreaValidationResponse | null;
  boundaryConfirmed: boolean;
  cadastreAcknowledged: boolean;
  onBoundaryConfirmedChange: (v: boolean) => void;
  onCadastreAcknowledgedChange: (v: boolean) => void;
  onWorksMyselfChange: (v: boolean) => void;
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
  onWorksMyselfChange,
}) => {
  const { t, i18n } = useTranslation('fields');
  const locale = normalizeLocale(i18n.language);
  const varietyLabel = formData.variety
    ? t(`addField.varietyOptions.${formData.variety}`, { defaultValue: formData.variety })
    : null;
  const irrigationLabel = formData.irrigationType
    ? t(`addField.irrigationOptions.${formData.irrigationType}`, {
        defaultValue: formData.irrigationType,
      })
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
    irrigationLabel
      ? {
          key: 'irrigation',
          label: t('addField.irrigationType'),
          value: irrigationLabel,
          icon: Droplets,
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

  return (
    <div className="field-form-panel field-review">
      <header className="field-review-header">
        <h2>{t('addField.steps.review')}</h2>
        <p className="field-form-panel-desc">{t('addField.reviewDesc')}</p>
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

      {formData.accessNotes ? (
        <div className="field-review-notes">
          <p className="field-review-kicker">{t('addField.accessNotes')}</p>
          <p>{formData.accessNotes}</p>
        </div>
      ) : null}

      <AreaComparisonCard
        validation={areaValidation}
        officialAreaSqm={cadastre?.officialAreaSqm}
        measuredAreaSqm={formData.area}
      />

      {cadastre && <GreekCadastreInfoCard cadastre={cadastre} />}

      <div className="review-checkboxes">
        <label className={`review-checkbox${formData.worksThisFieldMyself !== false ? ' is-checked' : ''}`}>
          <input
            type="checkbox"
            checked={formData.worksThisFieldMyself !== false}
            onChange={(e) => onWorksMyselfChange(e.target.checked)}
          />
          <span>
            <strong>{t('addField.worksThisFieldMyself')}</strong>
            <em>{t('addField.worksThisFieldMyselfHint')}</em>
          </span>
        </label>
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
        {cadastre && (
          <label className={`review-checkbox${cadastreAcknowledged ? ' is-checked' : ''}`}>
            <input
              type="checkbox"
              checked={cadastreAcknowledged}
              onChange={(e) => onCadastreAcknowledgedChange(e.target.checked)}
            />
            <span>
              <strong>{t('addField.confirmCadastre')}</strong>
            </span>
          </label>
        )}
      </div>
    </div>
  );
};

export default ReviewFieldStep;
