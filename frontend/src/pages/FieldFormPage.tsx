import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { getFieldService } from '../services/serviceFactory';
import {
  CreateFieldDto,
  FieldAreaValidationResponse,
  GeoJsonPolygon,
  UpdateFieldDto,
} from '../services/fieldService';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import BasicFieldDetailsStep from '../components/fields/BasicFieldDetailsStep';
import FieldBoundaryMapStep from '../components/fields/FieldBoundaryMapStep';
import CropDetailsStep from '../components/fields/CropDetailsStep';
import ReviewFieldStep from '../components/fields/ReviewFieldStep';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Sprout,
} from 'lucide-react';
import { getApiErrorMessage } from '../utils/translateApiError';
import { resolveFieldAreaSqm, hectaresFromSqm } from '../utils/area';
import { getFieldSetupResumeStep } from '../utils/fieldDisplay';
import './FieldFormPage.css';
import '../components/fields/AddFieldWizard.css';

type WizardStep = 'basics' | 'boundary' | 'crop' | 'review';
const WIZARD_STEPS: WizardStep[] = ['basics', 'boundary', 'crop', 'review'];

const FieldFormPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [step, setStep] = useState<WizardStep | 'basics-edit'>('basics');
  const [draftFieldId, setDraftFieldId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateFieldDto>({
    name: '',
    cropType: 'Olive',
    locationText: '',
    area: 0,
    variety: '',
    irrigationStatus: false,
    status: 'Draft',
    worksThisFieldMyself: true,
  });
  const [boundary, setBoundary] = useState<GeoJsonPolygon | undefined>();
  const [areaValidation, setAreaValidation] = useState<FieldAreaValidationResponse | null>(null);
  const [boundaryConfirmed, setBoundaryConfirmed] = useState(false);
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
        cropType: field.cropType || 'Olive',
        locationText: field.locationText,
        latitude: field.latitude,
        longitude: field.longitude,
        area: resolveFieldAreaSqm(field) ?? 0,
        variety: field.oliveVariety || field.variety || '',
        treeAge: field.treeAge,
        treeCount: field.treeCount,
        groundType: field.soilType || field.groundType || '',
        soilType: field.soilType,
        irrigationStatus: field.irrigationStatus,
        irrigationType: field.irrigationType,
        slope: field.slope,
        accessNotes: field.accessNotes,
        color: field.color,
        status: field.status,
      });
      setBoundary(field.boundary);
      setDraftFieldId(field.id);
      setStep(getFieldSetupResumeStep(field) as WizardStep);
    } catch {
      setError(t('fields:form.failedLoad'));
    } finally {
      setLoading(false);
    }
  };

  const activeSteps = isEdit
    ? (['basics-edit', 'boundary', 'crop', 'review'] as const)
    : WIZARD_STEPS;

  const stepIndex = activeSteps.indexOf(step as never);
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex === activeSteps.length - 1;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
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

  const ensureDraftField = async (): Promise<string> => {
    if (draftFieldId) return draftFieldId;
    const created = await getFieldService().createField({
      ...formData,
      appMeasuredAreaSqm: formData.area || undefined,
      area: formData.area ? hectaresFromSqm(formData.area) : 0,
      status: 'Draft',
    });
    setDraftFieldId(created.id);
    return created.id;
  };

  const handleBoundaryChange = async (geo?: GeoJsonPolygon, areaSqm?: number) => {
    setBoundary(geo);
    if (areaSqm != null) setFormData((prev) => ({ ...prev, area: areaSqm }));
    if (geo && draftFieldId) {
      try {
        await getFieldService().updateBoundary(draftFieldId, geo);
        const validation = await getFieldService().validateArea(draftFieldId);
        setAreaValidation(validation);
      } catch {
        /* best effort */
      }
    }
  };

  const validateStep = (): string | null => {
    if (step === 'basics' || step === ('basics-edit' as WizardStep)) {
      if (!formData.name.trim() || formData.name.length < 2) return t('fields:form.errors.nameRequired');
    }
    if (step === 'boundary' && !boundary) return t('fields:addField.errors.boundaryRequired');
    if (step === 'review') {
      if (boundary && !boundaryConfirmed) return t('fields:addField.errors.confirmBoundary');
    }
    return null;
  };

  const goNext = async () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    if (step === 'basics') {
      await ensureDraftField();
    }

    if (!isLast) setStep(activeSteps[stepIndex + 1] as WizardStep);
  };

  const goBack = () => {
    setError(null);
    if (!isFirst) setStep(activeSteps[stepIndex - 1] as WizardStep);
  };

  const fieldPayload = (): UpdateFieldDto =>
    ({
      name: formData.name,
      cropType: formData.cropType,
      locationText: formData.locationText,
      latitude: formData.latitude,
      longitude: formData.longitude,
      variety: formData.variety,
      treeCount: formData.treeCount,
      color: formData.color,
    }) as UpdateFieldDto;

  const handleSaveDraft = async () => {
    setLoading(true);
    setError(null);
    try {
      const fieldId = draftFieldId || (await ensureDraftField());
      await getFieldService().updateField(fieldId, fieldPayload());

      if (boundary) {
        await getFieldService().updateBoundary(fieldId, boundary);
      }

      navigate(`/fields/${fieldId}`);
    } catch {
      setError(t('fields:form.failedSave'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm(t('fields:deleteConfirm'))) return;
    setLoading(true);
    setError(null);
    try {
      await getFieldService().deleteField(id);
      navigate('/fields');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fields:failedDelete'));
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fieldId = draftFieldId || (await ensureDraftField());
      await getFieldService().updateField(fieldId, fieldPayload());

      if (boundary) {
        await getFieldService().updateBoundary(fieldId, boundary);
      }

      const result = await getFieldService().activateField(fieldId, {
        boundaryConfirmed,
        cadastreReferenceAcknowledged: true,
      });

      navigate(`/fields/${result.field.id}/work-setup`, {
        state: result.suggestLifecyclePlan ? { suggestLifecyclePlan: true } : undefined,
      });
    } catch {
      setError(t('fields:form.failedSave'));
    } finally {
      setLoading(false);
    }
  };

  const stepIcon = (s: string) => {
    switch (s) {
      case 'basics':
      case 'basics-edit':
        return <Sprout size={16} />;
      case 'boundary':
        return <MapPin size={16} />;
      case 'crop':
        return <Sprout size={16} />;
      case 'review':
        return <Check size={16} />;
      default:
        return null;
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
            <h1>{isEdit ? t('fields:form.editTitle') : t('fields:addField.title')}</h1>
            <p className="field-form-subtitle">{t('fields:addField.subtitle')}</p>
          </div>
        </header>

        <nav className="field-form-steps" aria-label={t('fields:form.stepsAria')}>
          {activeSteps.map((s, idx) => (
            <button
              key={s}
              type="button"
              className={`field-form-step ${step === s ? 'active' : ''} ${idx < stepIndex ? 'done' : ''}`}
              onClick={() => idx <= stepIndex && setStep(s as WizardStep)}
              disabled={idx > stepIndex}
            >
              <span className="field-form-step-num">{idx < stepIndex ? <Check size={14} /> : idx + 1}</span>
              {stepIcon(s)}
              <span className="field-form-step-label">
                {t(`fields:addField.steps.${s === 'basics-edit' ? 'basics' : s}`)}
              </span>
            </button>
          ))}
        </nav>

        <p className="field-form-progress" aria-live="polite">
          {t('fields:form.stepProgress', {
            current: Math.max(stepIndex + 1, 1),
            total: activeSteps.length,
            name: t(`fields:addField.steps.${step === 'basics-edit' ? 'basics' : step}`),
          })}
        </p>

        {error && <div className="field-form-error">{error}</div>}

        <Card className="field-form-card">
          {(step === 'basics' || step === ('basics-edit' as WizardStep)) && (
            <BasicFieldDetailsStep
              formData={formData}
              fieldId={draftFieldId || id}
              onChange={handleChange}
              onLocationChange={(next) =>
                setFormData((prev) => ({
                  ...prev,
                  locationText: next.locationText,
                  latitude: next.latitude,
                  longitude: next.longitude,
                }))
              }
              onColorChange={(color) => setFormData((prev) => ({ ...prev, color }))}
            />
          )}

          {step === 'boundary' && (
            <FieldBoundaryMapStep
              boundary={boundary}
              measuredAreaSqm={formData.area}
              locationQuery={formData.locationText}
              latitude={formData.latitude}
              longitude={formData.longitude}
              onBoundaryChange={handleBoundaryChange}
            />
          )}

          {step === 'crop' && <CropDetailsStep formData={formData} onChange={handleChange} />}

          {step === 'review' && (
            <ReviewFieldStep
              formData={formData}
              boundary={boundary}
              areaValidation={areaValidation}
              boundaryConfirmed={boundaryConfirmed}
              onBoundaryConfirmedChange={setBoundaryConfirmed}
              onWorksMyselfChange={(v) =>
                setFormData((prev) => ({ ...prev, worksThisFieldMyself: v }))
              }
            />
          )}

          <div className="field-form-nav">
            {!isFirst ? (
              <Button type="button" variant="outline" onClick={goBack} icon={<ArrowLeft />}>
                {t('fields:form.back')}
              </Button>
            ) : (
              <span />
            )}
            <div className="field-form-nav-actions">
              {!isLast ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveDraft}
                  loading={loading}
                  className="field-form-draft-btn"
                >
                  {t('fields:form.saveDraft')}
                </Button>
              ) : null}
              {!isLast ? (
                <Button type="button" variant="primary" onClick={goNext} icon={<ArrowRight />}>
                  {t('fields:form.next')}
                </Button>
              ) : (
                <Button type="button" variant="primary" onClick={handleActivate} loading={loading} icon={<Check />}>
                  {t('fields:addField.activate')}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {isEdit && id ? (
          <Button
            type="button"
            variant="error"
            fullWidth
            onClick={handleDelete}
            loading={loading}
            className="field-form-delete-btn"
          >
            {t('fields:deleteField')}
          </Button>
        ) : null}
      </div>
    </PageContainer>
  );
};

export default FieldFormPage;
