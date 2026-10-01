import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams, useBlocker } from 'react-router-dom';
import { getFieldService } from '../services/serviceFactory';
import {
  CreateFieldDto,
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
import GroveSetupLevel, {
  SetupLevelKey,
  SetupLevelState,
} from '../components/fields/GroveSetupLevel';
import { ArrowLeft, Check } from 'lucide-react';
import { getApiErrorMessage } from '../utils/translateApiError';
import { resolveFieldAreaSqm, hectaresFromSqm } from '../utils/area';
import { fieldHasBoundary, isListedGrove } from '../utils/fieldDisplay';
import { resolveFieldColor } from '../utils/fieldColors';
import { validateBoundaryPolygon } from '../utils/boundaryValidation';
import { useOwnerActivationOptional } from '../onboarding/OwnerActivationContext';
import { ONBOARDING_TARGETS } from '../onboarding/steps';
import './FieldFormPage.css';
import '../components/fields/AddFieldWizard.css';

type CreateScreen = 'name' | 'boundary';

type EditFocus = 'settings' | 'boundary' | 'details' | 'appearance';

const FieldFormPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common']);
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activation = useOwnerActivationOptional();
  const isEdit = !!id;

  const focusParam = searchParams.get('focus');
  const editFocus: EditFocus =
    focusParam === 'boundary' || focusParam === 'details' || focusParam === 'appearance'
      ? focusParam
      : 'settings';

  const [createScreen, setCreateScreen] = useState<CreateScreen>('name');
  const [isFirstGrove, setIsFirstGrove] = useState(true);
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
  const [boundaryConfirmed, setBoundaryConfirmed] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const allowLeaveRef = useRef(false);

  const isActiveEdit = isEdit && fieldStatus === 'Active';
  const nameValid = formData.name.trim().length >= 2;
  const hasDetails = Boolean(formData.variety?.trim()) || formData.treeCount != null;
  const hasBoundary = fieldHasBoundary({ boundary });

  useEffect(() => {
    if (isEdit && id) void loadField();
    else void loadGroveCount();
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

  const loadGroveCount = async () => {
    try {
      const fields = await getFieldService().getFields();
      setIsFirstGrove(fields.filter(isListedGrove).length === 0);
    } catch {
      setIsFirstGrove(true);
    }
  };

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
        worksThisFieldMyself: true,
      });
      setBoundary(field.boundary);
      setInitialBoundary(field.boundary);
      setDraftFieldId(field.id);
      setFieldStatus(field.status);
      if (field.status === 'Active') {
        setBoundaryConfirmed(true);
      } else if (searchParams.get('focus') === 'boundary') {
        setCreateScreen('boundary');
      } else {
        setCreateScreen('name');
      }
      setDirty(false);
    } catch {
      setError(t('fields:form.failedLoad'));
    } finally {
      setLoading(false);
    }
  };

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
    const color = resolveFieldColor(formData.color, undefined);
    const created = await getFieldService().createField({
      ...formData,
      color,
      appMeasuredAreaSqm: formData.area || undefined,
      area: formData.area ? hectaresFromSqm(formData.area) : 0,
      status: 'Draft',
      worksThisFieldMyself: true,
    });
    setDraftFieldId(created.id);
    setFormData((prev) => ({ ...prev, color: created.color || color }));
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
    if (draftFieldId) {
      try {
        await getFieldService().updateBoundary(draftFieldId, geo);
      } catch {
        /* best effort */
      }
    }
  };

  const boundaryChanged =
    JSON.stringify(boundary?.coordinates ?? null) !==
    JSON.stringify(initialBoundary?.coordinates ?? null);

  const fieldPayload = (): UpdateFieldDto =>
    ({
      name: formData.name.trim(),
      cropType: formData.cropType || 'Olive',
      locationText: formData.locationText,
      latitude: formData.latitude,
      longitude: formData.longitude,
      variety: formData.variety,
      treeCount: formData.treeCount,
      color: formData.color || resolveFieldColor(undefined, draftFieldId),
    }) as UpdateFieldDto;

  const leaveClean = (path: string, state?: object) => {
    allowLeaveRef.current = true;
    setDirty(false);
    navigate(path, state ? { state } : undefined);
  };

  const continueToBoundary = async () => {
    if (!nameValid) {
      setError(t('fields:form.errors.nameRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fieldId = await ensureDraftField();
      await getFieldService().updateField(fieldId, fieldPayload());
      setFieldStatus((prev) => prev || 'Draft');
      activation?.markFieldsDirty();
      allowLeaveRef.current = true;
      setDirty(false);
      setCreateScreen('boundary');
      navigate(`/fields/${fieldId}/edit?focus=boundary`, { replace: true });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fields:form.failedSave'));
    } finally {
      setLoading(false);
    }
  };

  const handleFinishBoundary = async () => {
    if (!nameValid) {
      setError(t('fields:form.errors.nameRequired'));
      return;
    }
    if (!boundary || !fieldHasBoundary({ boundary })) {
      setError(t('fields:addField.errors.boundaryRequiredNow'));
      return;
    }
    const validation = validateBoundaryPolygon(boundary);
    if (!validation.ok) {
      setError(t(`fields:addField.boundaryValidation.${validation.code}`));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fieldId = draftFieldId || id!;
      await getFieldService().updateField(fieldId, fieldPayload());
      await getFieldService().updateBoundary(fieldId, boundary);
      if (fieldStatus !== 'Active') {
        await getFieldService().activateField(fieldId, {
          boundaryConfirmed: true,
          cadastreReferenceAcknowledged: true,
        });
        setFieldStatus('Active');
      }
      setBoundaryConfirmed(true);
      activation?.markFieldsDirty({ boundarySavedFieldId: fieldId });
      const groveName = formData.name.trim();
      const showSpatialWelcome = Boolean(activation?.eligible);
      leaveClean(
        showSpatialWelcome
          ? `/chronologio?fieldId=${encodeURIComponent(fieldId)}&activation=spatial`
          : `/chronologio?fieldId=${encodeURIComponent(fieldId)}`,
        { groveName }
      );
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fields:form.failedSave'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveActiveChanges = async () => {
    if (!nameValid) {
      setError(t('fields:form.errors.nameRequired'));
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
        setBoundaryConfirmed(true);
        activation?.markFieldsDirty({ boundarySavedFieldId: fieldId });
        const needsSpatial =
          activation?.eligible &&
          !activation.completion.loadData &&
          editFocus === 'boundary';
        if (needsSpatial) {
          leaveClean(`/fields/${fieldId}?tab=map&activation=spatial`);
          return;
        }
      }
      leaveClean(`/fields/${fieldId}`);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fields:form.failedSave'));
    } finally {
      setLoading(false);
    }
  };

  const onBoundaryStep = createScreen === 'boundary' || editFocus === 'boundary';
  const finishingFirstBoundary = !fieldHasBoundary({ boundary: initialBoundary });

  const setupLevels = (): Array<{ key: SetupLevelKey; state: SetupLevelState }> => {
    const nameState: SetupLevelState =
      !onBoundaryStep && createScreen === 'name' ? 'current' : nameValid ? 'done' : 'upcoming';
    const boundaryState: SetupLevelState = hasBoundary
      ? 'done'
      : onBoundaryStep
        ? 'current'
        : 'upcoming';
    const detailsState: SetupLevelState = hasDetails ? 'done' : 'upcoming';
    return [
      { key: 'name', state: nameState },
      { key: 'boundary', state: boundaryState },
      { key: 'details', state: detailsState },
    ];
  };

  const nameForm = (mode: 'create' | 'edit', hidePrompt = false) => (
    <BasicFieldDetailsStep
      formData={formData}
      fieldId={draftFieldId || id}
      mode={mode}
      hidePrompt={hidePrompt}
      onChange={handleChange}
    />
  );

  if (loading && isEdit && !formData.name) {
    return <LoadingSpinner fullScreen />;
  }

  const onNameStep = !isActiveEdit && createScreen === 'name' && editFocus !== 'boundary';

  const pageTitle = isActiveEdit
    ? t('fields:form.editTitle')
    : isEdit
      ? t('fields:form.editTitle')
      : onNameStep
        ? t('fields:createGrove.nameHeading')
        : isFirstGrove
          ? t('fields:createGrove.firstTitle')
          : t('fields:createGrove.title');

  const pageSubtitle = isActiveEdit
    ? t('fields:form.editSubtitle')
    : onNameStep
      ? null
      : t('fields:createGrove.subtitle');

  const showCreateChrome = !isActiveEdit;
  const showNameStep = !isActiveEdit && createScreen === 'name' && editFocus !== 'boundary';
  const showBoundaryEditor = editFocus === 'boundary' || (!isActiveEdit && createScreen === 'boundary');
  const boundaryStage = showBoundaryEditor && finishingFirstBoundary;

  const setupLevel = showCreateChrome ? (
    <GroveSetupLevel
      levels={setupLevels()}
      canSelect={(key) => {
        if (key === 'name') return true;
        if (key === 'boundary') return Boolean(draftFieldId) && nameValid;
        if (key === 'details') return Boolean(draftFieldId && fieldStatus === 'Active');
        return false;
      }}
      onSelect={(key) => {
        if (key === 'name') {
          setCreateScreen('name');
          if (draftFieldId) leaveClean(`/fields/${draftFieldId}/edit`);
          return;
        }
        if (key === 'boundary' && draftFieldId && nameValid) {
          leaveClean(`/fields/${draftFieldId}/edit?focus=boundary`);
          return;
        }
        if (key === 'details' && draftFieldId) {
          leaveClean(`/fields/${draftFieldId}/edit?focus=details`);
        }
      }}
    />
  ) : null;

  return (
    <PageContainer>
      <div className={`field-form-page${boundaryStage ? ' is-boundary-stage' : ''}`}>
        <Breadcrumbs />
        <header className="field-form-header">
          <div className="field-form-title-row">
            <h1>{pageTitle}</h1>
            <Button
              to="/fields"
              variant="outline"
              size="sm"
              className="field-form-back"
              icon={<ArrowLeft size={14} />}
            >
              {t('fields:createGrove.backToGroves')}
            </Button>
          </div>
          {pageSubtitle ? <p className="field-form-subtitle">{pageSubtitle}</p> : null}
        </header>

        <div className={`field-form-stage${showCreateChrome && !boundaryStage ? ' has-setup-rail' : ''}`}>
          {boundaryStage ? null : setupLevel}

          <div className="field-form-stage-main">
        {error && <div className="field-form-error">{error}</div>}

        <Card className="field-form-card">
          {showNameStep ? (
            <>
              {nameForm('create', true)}
              <div
                className="field-form-nav grove-create-nav"
                data-onboarding-target={ONBOARDING_TARGETS.createCta}
              >
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void continueToBoundary()}
                  loading={loading}
                  disabled={!nameValid}
                >
                  {t('fields:createGrove.continueToPlace')}
                </Button>
              </div>
            </>
          ) : null}

          {isActiveEdit && editFocus === 'settings' ? (
            <>
              {nameForm('edit')}
              <div className="field-form-nav">
                <Button type="button" variant="outline" onClick={() => leaveClean(`/fields/${id}`)}>
                  {t('fields:form.cancelChanges')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSaveActiveChanges}
                  loading={loading}
                  icon={<Check />}
                >
                  {t('fields:form.saveChanges')}
                </Button>
              </div>
            </>
          ) : null}

          {isActiveEdit && editFocus === 'details' ? (
            <>
              <CropDetailsStep formData={formData} onChange={handleChange} />
              <div className="field-form-nav">
                <Button type="button" variant="outline" onClick={() => leaveClean(`/fields/${id}`)}>
                  {t('fields:form.cancelChanges')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSaveActiveChanges}
                  loading={loading}
                >
                  {t('fields:form.saveChanges')}
                </Button>
              </div>
            </>
          ) : null}

          {showBoundaryEditor ? (
            <>
              <FieldBoundaryMapStep
                boundary={boundary}
                measuredAreaSqm={formData.area}
                locationQuery={formData.locationText}
                latitude={formData.latitude}
                longitude={formData.longitude}
                onBoundaryChange={handleBoundaryChange}
                onPlaceChange={(place) => {
                  markDirty();
                  setFormData((prev) => ({ ...prev, ...place }));
                }}
                onContinue={
                  finishingFirstBoundary ? () => void handleFinishBoundary() : undefined
                }
                continueLoading={loading}
                activationGuide={Boolean(
                  activation?.eligible && !activation.completion.drawBoundary
                )}
                setupRail={boundaryStage ? setupLevel : undefined}
              />
              {!finishingFirstBoundary ? (
                <div className="field-form-nav">
                  <Button type="button" variant="outline" onClick={() => leaveClean(`/fields/${id}`)}>
                    {t('fields:form.cancelChanges')}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSaveActiveChanges}
                    loading={loading}
                    data-onboarding-target={ONBOARDING_TARGETS.boundarySave}
                  >
                    {t('fields:form.saveChanges')}
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}

          {isActiveEdit && editFocus === 'appearance' ? (
            <>
              <BasicFieldDetailsStep
                formData={formData}
                fieldId={draftFieldId || id}
                mode="appearance"
                onChange={handleChange}
                onColorChange={(color) => {
                  markDirty();
                  setFormData((prev) => ({ ...prev, color }));
                }}
              />
              <div className="field-form-nav">
                <Button type="button" variant="outline" onClick={() => leaveClean(`/fields/${id}`)}>
                  {t('fields:form.cancelChanges')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSaveActiveChanges}
                  loading={loading}
                >
                  {t('fields:form.saveChanges')}
                </Button>
              </div>
            </>
          ) : null}
        </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default FieldFormPage;
