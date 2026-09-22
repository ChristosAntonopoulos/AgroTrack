import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';
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
import { validateBoundaryPolygon } from '../utils/boundaryValidation';
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
  const [fieldStatus, setFieldStatus] = useState<string | undefined>();
  const [initialBoundary, setInitialBoundary] = useState<GeoJsonPolygon | undefined>();
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
  const [dirty, setDirty] = useState(false);
  const allowLeaveRef = useRef(false);

  const isActiveEdit = isEdit && fieldStatus === 'Active';

  useEffect(() => {
    if (isEdit && id) void loadField();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty || allowLeaveRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      !allowLeaveRef.current &&
      currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const leave = window.confirm(t('fields:form.unsavedLeave'));
    if (leave) {
      allowLeaveRef.current = true;
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker, t]);

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
      setInitialBoundary(field.boundary);
      setDraftFieldId(field.id);
      setFieldStatus(field.status);
      if (field.status === 'Active') {
        setBoundaryConfirmed(true);
        setStep('basics-edit');
      } else {
        setStep(getFieldSetupResumeStep(field) as WizardStep);
      }
      setDirty(false);
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

  const markDirty = useCallback(() => setDirty(true), []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    markDirty();
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
    markDirty();
    setBoundary(geo);
    if (areaSqm != null) setFormData((prev) => ({ ...prev, area: areaSqm }));
    if (!geo) {
      setBoundaryConfirmed(false);
      return;
    }
    // Only persist boundary when a draft already exists (explicit save/edit).
    if (draftFieldId) {
      try {
        await getFieldService().updateBoundary(draftFieldId, geo);
        const validation = await getFieldService().validateArea(draftFieldId);
        setAreaValidation(validation);
      } catch {
        /* best effort */
      }
    }
  };

  const boundaryChanged =
    JSON.stringify(boundary?.coordinates ?? null) !==
    JSON.stringify(initialBoundary?.coordinates ?? null);

  const validateStep = (): string | null => {
    if (step === 'basics' || step === ('basics-edit' as WizardStep)) {
      if (!formData.name.trim() || formData.name.length < 2) return t('fields:form.errors.nameRequired');
    }
    // Boundary is optional — unfinished drawing is cleared when skipping / continuing.
    if (step === 'review') {
      if (boundary && !boundaryConfirmed && (!isActiveEdit || boundaryChanged)) {
        return t('fields:addField.errors.confirmBoundary');
      }
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
    // Boundary is optional: leaving the step without a finished polygon is fine.
    // Unfinished local corners live only in the map step and are discarded on unmount.
    if (!isLast) setStep(activeSteps[stepIndex + 1] as WizardStep);
  };

  const skipBoundary = () => {
    setBoundary(undefined);
    setFormData((prev) => ({ ...prev, area: 0 }));
    setBoundaryConfirmed(false);
    setError(null);
    setStep('crop');
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

  const leaveClean = (path: string) => {
    allowLeaveRef.current = true;
    setDirty(false);
    navigate(path);
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    setError(null);
    try {
      const fieldId = draftFieldId || (await ensureDraftField());
      await getFieldService().updateField(fieldId, fieldPayload());

      if (boundary) {
        const validation = validateBoundaryPolygon(boundary);
        if (!validation.ok) {
          setError(t(`fields:addField.boundaryValidation.${validation.code}`));
          setLoading(false);
          return;
        }
        await getFieldService().updateBoundary(fieldId, boundary);
      }

      leaveClean(`/fields/${fieldId}`);
    } catch {
      setError(t('fields:form.failedSave'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveActiveChanges = async () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fieldId = draftFieldId || id!;
      await getFieldService().updateField(fieldId, fieldPayload());

      if (boundary && boundaryChanged) {
        const validation = validateBoundaryPolygon(boundary);
        if (!validation.ok) {
          setError(t(`fields:addField.boundaryValidation.${validation.code}`));
          setLoading(false);
          return;
        }
        await getFieldService().updateBoundary(fieldId, boundary);
      }

      leaveClean(`/fields/${fieldId}`);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fields:form.failedSave'));
    } finally {
      setLoading(false);
    }
  };

  const handleActivateWithState = async () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    if (boundary) {
      const validation = validateBoundaryPolygon(boundary);
      if (!validation.ok) {
        setError(t(`fields:addField.boundaryValidation.${validation.code}`));
        return;
      }
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
        boundaryConfirmed: boundary ? boundaryConfirmed : true,
        cadastreReferenceAcknowledged: true,
      });

      allowLeaveRef.current = true;
      setDirty(false);
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

  const primaryLastAction = isActiveEdit ? handleSaveActiveChanges : handleActivateWithState;
  const primaryLastLabel = isActiveEdit
    ? t('fields:form.saveChanges')
    : t('fields:addField.activate');

  return (
    <PageContainer>
      <div className="field-form-page">
        <Breadcrumbs />
        <header className="field-form-header">
          <Button to="/fields" variant="outline" size="sm" icon={<ArrowLeft />}>
            {t('fields:controlRoom.backToFields')}
          </Button>
          <div>
            <h1>
              {isActiveEdit
                ? t('fields:form.editTitle')
                : isEdit
                  ? t('fields:form.editTitle')
                  : t('fields:addField.title')}
            </h1>
            <p className="field-form-subtitle">
              {isActiveEdit ? t('fields:form.editSubtitle') : t('fields:addField.subtitle')}
            </p>
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
              onLocationChange={(next) => {
                markDirty();
                setFormData((prev) => ({
                  ...prev,
                  locationText: next.locationText,
                  latitude: next.latitude,
                  longitude: next.longitude,
                }));
              }}
              onColorChange={(color) => {
                markDirty();
                setFormData((prev) => ({ ...prev, color }));
              }}
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
              onSkipBoundary={skipBoundary}
            />
          )}

          {step === 'crop' && <CropDetailsStep formData={formData} onChange={handleChange} />}

          {step === 'review' && (
            <ReviewFieldStep
              formData={formData}
              boundary={boundary}
              areaValidation={areaValidation}
              boundaryConfirmed={boundaryConfirmed}
              onBoundaryConfirmedChange={(v) => {
                markDirty();
                setBoundaryConfirmed(v);
              }}
              onWorksMyselfChange={(v) => {
                markDirty();
                setFormData((prev) => ({ ...prev, worksThisFieldMyself: v }));
              }}
              isActiveEdit={isActiveEdit}
              requireBoundaryConfirm={!isActiveEdit || boundaryChanged}
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
              {isActiveEdit && isLast ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => leaveClean(`/fields/${id}`)}
                >
                  {t('fields:form.cancelChanges')}
                </Button>
              ) : null}
              {!isLast && !isActiveEdit ? (
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
                <Button
                  type="button"
                  variant="primary"
                  onClick={primaryLastAction}
                  loading={loading}
                  icon={<Check />}
                >
                  {primaryLastLabel}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};

export default FieldFormPage;
