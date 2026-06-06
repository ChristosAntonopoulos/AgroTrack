import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { getFieldService } from '../services/serviceFactory';
import { CreateFieldDto, UpdateFieldDto } from '../services/fieldService';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  MapPin,
  Sprout,
  Droplets,
} from 'lucide-react';
import './FieldFormPage.css';

type FormStep = 'basics' | 'location' | 'details' | 'review';

const STEPS: FormStep[] = ['basics', 'location', 'details', 'review'];

const VARIETY_PRESETS = ['Kalamata', 'Koroneiki', 'Arbequina', 'Picual', 'Frantoio', 'Megaritiki', 'Other'];
const GROUND_PRESETS = ['Clay Loam', 'Sandy Loam', 'Loam', 'Rocky', 'Calcareous', 'Other'];

const FieldFormPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [step, setStep] = useState<FormStep>('basics');
  const [formData, setFormData] = useState<CreateFieldDto>({
    name: '',
    latitude: undefined,
    longitude: undefined,
    area: 0,
    variety: '',
    treeAge: undefined,
    groundType: '',
    irrigationStatus: false,
  });
  const [varietyPreset, setVarietyPreset] = useState('');
  const [groundPreset, setGroundPreset] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && id) loadField();
  }, [id, isEdit]);

  const loadField = async () => {
    try {
      setLoading(true);
      const field = await getFieldService().getField(id!);
      setFormData({
        name: field.name,
        latitude: field.latitude,
        longitude: field.longitude,
        area: field.area,
        variety: field.variety || '',
        treeAge: field.treeAge,
        groundType: field.groundType || '',
        irrigationStatus: field.irrigationStatus,
      });
      const vMatch = VARIETY_PRESETS.find((v) => v === field.variety) || (field.variety ? 'Other' : '');
      setVarietyPreset(vMatch);
      const gMatch = GROUND_PRESETS.find((g) => g === field.groundType) || (field.groundType ? 'Other' : '');
      setGroundPreset(gMatch);
    } catch (err: unknown) {
      setError(t('fields:form.failedLoad'));
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = STEPS.indexOf(step);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const validateStep = (s: FormStep): string | null => {
    if (s === 'basics') {
      if (!formData.name.trim()) return t('fields:form.errors.nameRequired');
      if (!formData.area || formData.area <= 0) return t('fields:form.errors.areaRequired');
    }
    if (s === 'location' && formData.latitude != null && formData.longitude != null) {
      if (formData.latitude < -90 || formData.latitude > 90) return t('fields:form.errors.latInvalid');
      if (formData.longitude < -180 || formData.longitude > 180) return t('fields:form.errors.lngInvalid');
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (!isLast) setStep(STEPS[stepIndex + 1]);
  };

  const goBack = () => {
    setError(null);
    if (!isFirst) setStep(STEPS[stepIndex - 1]);
  };

  const handleSubmit = async () => {
    const err = validateStep('basics');
    if (err) {
      setError(err);
      setStep('basics');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const fieldService = getFieldService();
      if (isEdit && id) {
        const updateData: UpdateFieldDto = { ...formData };
        await fieldService.updateField(id, updateData);
        navigate(`/fields/${id}`);
      } else {
        const created = await fieldService.createField(formData);
        navigate(`/fields/${created.id}`);
      }
    } catch {
      setError(t('fields:form.failedSave'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : type === 'number'
            ? value === ''
              ? undefined
              : parseFloat(value)
            : value,
    }));
  };

  const handleVarietyPreset = (preset: string) => {
    setVarietyPreset(preset);
    if (preset !== 'Other') setFormData((prev) => ({ ...prev, variety: preset }));
    else setFormData((prev) => ({ ...prev, variety: '' }));
  };

  const handleGroundPreset = (preset: string) => {
    setGroundPreset(preset);
    if (preset !== 'Other') setFormData((prev) => ({ ...prev, groundType: preset }));
    else setFormData((prev) => ({ ...prev, groundType: '' }));
  };

  const stepIcon = (s: FormStep) => {
    switch (s) {
      case 'basics':
        return <Sprout size={16} />;
      case 'location':
        return <MapPin size={16} />;
      case 'details':
        return <Droplets size={16} />;
      case 'review':
        return <ClipboardList size={16} />;
    }
  };

  if (loading && isEdit && !formData.name) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <PageContainer>
      <div className="field-form-page">
        <Breadcrumbs />

        <header className="field-form-header">
          <Button to="/fields" variant="outline" size="sm" icon={<ArrowLeft />}>
            {t('fields:controlRoom.backToFields')}
          </Button>
          <div>
            <h1>{isEdit ? t('fields:form.editTitle') : t('fields:form.newTitle')}</h1>
            <p className="field-form-subtitle">{t('fields:form.subtitle')}</p>
          </div>
        </header>

        <nav className="field-form-steps" aria-label={t('fields:form.stepsAria')}>
          {STEPS.map((s, idx) => (
            <button
              key={s}
              type="button"
              className={`field-form-step ${step === s ? 'active' : ''} ${idx < stepIndex ? 'done' : ''}`}
              onClick={() => {
                if (idx <= stepIndex) {
                  setError(null);
                  setStep(s);
                }
              }}
              disabled={idx > stepIndex}
            >
              <span className="field-form-step-num">
                {idx < stepIndex ? <Check size={14} /> : idx + 1}
              </span>
              {stepIcon(s)}
              <span className="field-form-step-label">{t(`fields:form.steps.${s}`)}</span>
            </button>
          ))}
        </nav>

        {error && <div className="field-form-error">{error}</div>}

        <Card className="field-form-card">
          {step === 'basics' && (
            <div className="field-form-panel">
              <h2>{t('fields:form.steps.basics')}</h2>
              <p className="field-form-panel-desc">{t('fields:form.basicsDesc')}</p>

              <div className="form-group">
                <label htmlFor="name">{t('fields:form.name')} *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('fields:form.namePlaceholder')}
                  required
                  autoFocus
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="area">{t('fields:form.area')} *</label>
                  <input
                    type="number"
                    id="area"
                    name="area"
                    step="0.01"
                    min="0"
                    value={formData.area || ''}
                    onChange={handleChange}
                    placeholder="12.5"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="treeAge">{t('fields:form.treeAge')}</label>
                  <input
                    type="number"
                    id="treeAge"
                    name="treeAge"
                    min="0"
                    value={formData.treeAge ?? ''}
                    onChange={handleChange}
                    placeholder="15"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t('fields:form.variety')}</label>
                <div className="preset-chips">
                  {VARIETY_PRESETS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`preset-chip ${varietyPreset === v ? 'active' : ''}`}
                      onClick={() => handleVarietyPreset(v)}
                    >
                      {v === 'Other' ? t('fields:form.other') : v}
                    </button>
                  ))}
                </div>
                {varietyPreset === 'Other' && (
                  <input
                    type="text"
                    name="variety"
                    value={formData.variety}
                    onChange={handleChange}
                    placeholder={t('fields:form.varietyCustom')}
                    className="preset-custom-input"
                  />
                )}
              </div>
            </div>
          )}

          {step === 'location' && (
            <div className="field-form-panel">
              <h2>{t('fields:form.steps.location')}</h2>
              <p className="field-form-panel-desc">{t('fields:form.locationDesc')}</p>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="latitude">{t('fields:form.latitude')}</label>
                  <input
                    type="number"
                    id="latitude"
                    name="latitude"
                    step="any"
                    value={formData.latitude ?? ''}
                    onChange={handleChange}
                    placeholder="37.9838"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="longitude">{t('fields:form.longitude')}</label>
                  <input
                    type="number"
                    id="longitude"
                    name="longitude"
                    step="any"
                    value={formData.longitude ?? ''}
                    onChange={handleChange}
                    placeholder="23.7275"
                  />
                </div>
              </div>

              <div className="field-form-tip">
                <MapPin size={18} />
                <p>{t('fields:form.locationTip')}</p>
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="field-form-panel">
              <h2>{t('fields:form.steps.details')}</h2>
              <p className="field-form-panel-desc">{t('fields:form.detailsDesc')}</p>

              <div className="form-group">
                <label>{t('fields:form.groundType')}</label>
                <div className="preset-chips">
                  {GROUND_PRESETS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`preset-chip ${groundPreset === g ? 'active' : ''}`}
                      onClick={() => handleGroundPreset(g)}
                    >
                      {g === 'Other' ? t('fields:form.other') : g}
                    </button>
                  ))}
                </div>
                {groundPreset === 'Other' && (
                  <input
                    type="text"
                    name="groundType"
                    value={formData.groundType}
                    onChange={handleChange}
                    placeholder={t('fields:form.groundCustom')}
                    className="preset-custom-input"
                  />
                )}
              </div>

              <div className="irrigation-toggle">
                <div className="irrigation-toggle-text">
                  <Droplets size={20} />
                  <div>
                    <strong>{t('fields:form.irrigationLabel')}</strong>
                    <p>{t('fields:form.irrigationDesc')}</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    name="irrigationStatus"
                    checked={formData.irrigationStatus}
                    onChange={handleChange}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="field-form-panel">
              <h2>{t('fields:form.steps.review')}</h2>
              <p className="field-form-panel-desc">{t('fields:form.reviewDesc')}</p>

              <dl className="field-review-list">
                <div>
                  <dt>{t('fields:form.name')}</dt>
                  <dd>{formData.name}</dd>
                </div>
                <div>
                  <dt>{t('fields:form.area')}</dt>
                  <dd>{formData.area} {t('fields:controlRoom.hectares')}</dd>
                </div>
                {formData.variety && (
                  <div>
                    <dt>{t('fields:form.variety')}</dt>
                    <dd>{formData.variety}</dd>
                  </div>
                )}
                {formData.treeAge != null && (
                  <div>
                    <dt>{t('fields:form.treeAge')}</dt>
                    <dd>{formData.treeAge} {t('fields:controlRoom.years')}</dd>
                  </div>
                )}
                {(formData.latitude != null || formData.longitude != null) && (
                  <div>
                    <dt>{t('fields:form.location')}</dt>
                    <dd>
                      {formData.latitude ?? '—'}, {formData.longitude ?? '—'}
                    </dd>
                  </div>
                )}
                {formData.groundType && (
                  <div>
                    <dt>{t('fields:form.groundType')}</dt>
                    <dd>{formData.groundType}</dd>
                  </div>
                )}
                <div>
                  <dt>{t('fields:form.irrigationLabel')}</dt>
                  <dd>{formData.irrigationStatus ? t('common:yes') : t('common:no')}</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="field-form-nav">
            {!isFirst ? (
              <Button type="button" variant="outline" onClick={goBack} icon={<ArrowLeft />}>
                {t('fields:form.back')}
              </Button>
            ) : (
              <span />
            )}
            {!isLast ? (
              <Button type="button" variant="primary" onClick={goNext} icon={<ArrowRight />}>
                {t('fields:form.next')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit}
                loading={loading}
                icon={<Check />}
              >
                {isEdit ? t('fields:form.update') : t('fields:form.create')}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};

export default FieldFormPage;
