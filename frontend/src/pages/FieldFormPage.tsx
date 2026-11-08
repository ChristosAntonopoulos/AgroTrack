import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams, useSearchParams, useBlocker } from 'react-router-dom';
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
import BackLink from '../components/Common/BackLink';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import BasicFieldDetailsStep from '../components/fields/BasicFieldDetailsStep';
import FieldBoundaryMapStep from '../components/fields/FieldBoundaryMapStep';
import PlaceLocationStep from '../components/fields/PlaceLocationStep';
import ApproximateAreaStep, {
  type AreaUnit,
} from '../components/fields/ApproximateAreaStep';
import CropDetailsStep from '../components/fields/CropDetailsStep';
import GroveSetupLevel, {
  SetupLevelKey,
  SetupLevelState,
} from '../components/fields/GroveSetupLevel';
import { Check } from 'lucide-react';
import { getApiErrorMessage } from '../utils/translateApiError';
import { resolveFieldAreaSqm, SQM_PER_STREMMA, SQM_PER_HECTARE } from '../utils/area';
import { fieldHasBoundary, fieldHasLocation, isListedGrove } from '../utils/fieldDisplay';
import { resolveFieldColor } from '../utils/fieldColors';
import { validateBoundaryPolygon } from '../utils/boundaryValidation';
import { useOwnerActivationOptional } from '../onboarding/OwnerActivationContext';
import { ONBOARDING_TARGETS } from '../onboarding/steps';
import { useSubscription } from '../context/SubscriptionContext';
import { isAtProLimit, isFieldLimitError, mustUpgradeToAddField } from '../billing/subscriptionModel';
import { trackBillingEvent } from '../billing/billingAnalytics';
import './FieldFormPage.css';
import '../components/fields/AddFieldWizard.css';

type CreateScreen = 'name' | 'place' | 'area' | 'boundary';

type EditFocus = 'settings' | 'boundary' | 'details' | 'appearance' | 'place' | 'area';

const estimatedHectaresFromInput = (raw: string, unit: AreaUnit): number | null => {
  const n = Number.parseFloat(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (unit === 'hectares') return n;
  return (n * SQM_PER_STREMMA) / SQM_PER_HECTARE;
};

const FieldFormPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common']);
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const activation = useOwnerActivationOptional();
  const { ensureFresh, refresh: refreshSubscription, showUpgradePaywall } = useSubscription();
  const isEdit = !!id;

  const focusParam = searchParams.get('focus');
  const editFocus: EditFocus =
    focusParam === 'boundary' ||
    focusParam === 'details' ||
    focusParam === 'appearance' ||
    focusParam === 'place' ||
    focusParam === 'area'
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
  const [estimatedAreaInput, setEstimatedAreaInput] = useState('');
  const [estimatedAreaUnit, setEstimatedAreaUnit] = useState<AreaUnit>(
    () => (typeof navigator !== 'undefined' && navigator.language?.startsWith('el') ? 'stremmata' : 'hectares')
  );
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const allowLeaveRef = useRef(false);

  const isActiveEdit = isEdit && fieldStatus === 'Active';
  const nameValid = formData.name.trim().length >= 2;
  const hasDetails = Boolean(formData.variety?.trim()) || formData.treeCount != null;
  const hasBoundary = fieldHasBoundary({ boundary });
  const hasLocation = fieldHasLocation({
    latitude: formData.latitude,
    longitude: formData.longitude,
  });
  const estimatedHectares = estimatedHectaresFromInput(estimatedAreaInput, estimatedAreaUnit);
  const areaValid = estimatedHectares != null && estimatedHectares > 0;

  useEffect(() => {
    if (isEdit && id) void loadField();
    else void loadGroveCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  // Backstop for deep links to /fields/new: gate on the plan before the form is usable.
  // The primary gate is useAddFieldAction, which shows the paywall before navigating here.
  useEffect(() => {
    if (isEdit) return undefined;
    let cancelled = false;
    void ensureFresh().then((snapshot) => {
      if (cancelled) return;
      const upgrade = mustUpgradeToAddField(snapshot);
      if (!upgrade && !isAtProLimit(snapshot)) return;
      trackBillingEvent('field_limit_reached', { source: 'add_field', plan: upgrade ? 'free' : 'pro' });
      showUpgradePaywall({
        source: 'add_field',
        intent: upgrade ? 'add_field' : 'pro_limit',
        returnAction: upgrade ? () => navigate('/fields/new') : undefined,
      });
      navigate('/fields', { replace: true });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  /** The server rejected creation because of the plan limit: show the paywall, not a red error. */
  const handleFieldLimitError = (err: unknown): boolean => {
    if (!isFieldLimitError(err)) return false;
    trackBillingEvent('field_limit_reached', { source: 'field_limit_error' });
    setError(null);
    void refreshSubscription();
    showUpgradePaywall({
      source: 'field_limit_error',
      intent: 'add_field',
      returnAction: () => navigate('/fields/new'),
    });
    allowLeaveRef.current = true;
    setDirty(false);
    navigate('/fields', { replace: true });
    return true;
  };

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
      } else if (focusParam === 'boundary') {
        setCreateScreen('boundary');
      } else if (focusParam === 'place') {
        setCreateScreen('place');
      } else if (focusParam === 'area') {
        setCreateScreen('area');
      } else if (!fieldHasLocation(field)) {
        setCreateScreen('place');
      } else if (!fieldHasBoundary(field) && field.area <= 0 && !field.appMeasuredAreaSqm) {
        setCreateScreen('area');
      } else {
        setCreateScreen('name');
      }
      if (field.area > 0 && !fieldHasBoundary(field) && !field.appMeasuredAreaSqm) {
        const preferStremmata =
          typeof navigator !== 'undefined' && navigator.language?.startsWith('el');
        if (preferStremmata) {
          setEstimatedAreaUnit('stremmata');
          setEstimatedAreaInput(String(Math.round(field.area * 10 * 10) / 10));
        } else {
          setEstimatedAreaUnit('hectares');
          setEstimatedAreaInput(String(field.area));
        }
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
      // Estimated area is hectares on `area` only — never appMeasuredAreaSqm.
      area: 0,
      appMeasuredAreaSqm: undefined,
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

  // The drawing map is portaled over the page, which hides "Back to groves".
  const exitBoundaryDraw = () => {
    allowLeaveRef.current = true;
    setDirty(false);
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (historyIndex > 0) {
      navigate(-1);
      return;
    }
    const fieldId = id || draftFieldId;
    navigate(fieldId ? `/fields/${fieldId}` : '/fields');
  };

  useEffect(() => {
    allowLeaveRef.current = false;
  }, [location.pathname, location.search]);

  const continueToPlace = async () => {
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
      activation?.markFieldsDirty({ groveCreatedFieldId: fieldId });
      allowLeaveRef.current = true;
      setDirty(false);
      setCreateScreen('place');
      navigate(`/fields/${fieldId}/edit?focus=place`, { replace: true });
    } catch (err: unknown) {
      if (handleFieldLimitError(err)) return;
      setError(getApiErrorMessage(err, t) || t('fields:form.failedSave'));
    } finally {
      setLoading(false);
    }
  };

  const continueToArea = async () => {
    if (!hasLocation) {
      setError(t('fields:createGrove.place.pinRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fieldId = draftFieldId || id!;
      await getFieldService().updateField(fieldId, fieldPayload());
      activation?.markFieldsDirty({
        groveCreatedFieldId: fieldId,
        locationSavedFieldId: fieldId,
      });
      allowLeaveRef.current = true;
      setDirty(false);
      setCreateScreen('area');
      navigate(`/fields/${fieldId}/edit?focus=area`, { replace: true });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fields:form.failedSave'));
    } finally {
      setLoading(false);
    }
  };

  const activateFromPin = async (thenBoundary: boolean) => {
    if (!hasLocation) {
      setError(t('fields:createGrove.place.pinRequired'));
      return;
    }
    if (!areaValid || estimatedHectares == null) {
      setError(t('fields:createGrove.area.required'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fieldId = draftFieldId || id!;
      await getFieldService().updateField(fieldId, {
        ...fieldPayload(),
        area: estimatedHectares,
      });
      if (fieldStatus !== 'Active') {
        await getFieldService().activateField(fieldId, {
          boundaryConfirmed: false,
          cadastreReferenceAcknowledged: true,
        });
        setFieldStatus('Active');
      }
      activation?.markFieldsDirty({
        groveCreatedFieldId: fieldId,
        locationSavedFieldId: fieldId,
      });
      const groveName = formData.name.trim();
      if (thenBoundary) {
        allowLeaveRef.current = true;
        setDirty(false);
        setCreateScreen('boundary');
        navigate(`/fields/${fieldId}/edit?focus=boundary`, { replace: true });
        return;
      }
      leaveClean(`/fields/${fieldId}?tab=map`, { groveName });
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
      activation?.markFieldsDirty({
        boundarySavedFieldId: fieldId,
        locationSavedFieldId: fieldId,
      });
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

  const onPlaceStep = createScreen === 'place' || editFocus === 'place';
  const onAreaStep = createScreen === 'area' || editFocus === 'area';
  const onBoundaryStep = createScreen === 'boundary' || editFocus === 'boundary';
  const finishingFirstBoundary = !fieldHasBoundary({ boundary: initialBoundary });

  const setupLevels = (): Array<{ key: SetupLevelKey; state: SetupLevelState }> => {
    const nameState: SetupLevelState =
      createScreen === 'name' && !onPlaceStep && !onAreaStep && !onBoundaryStep
        ? 'current'
        : nameValid
          ? 'done'
          : 'upcoming';
    const placeState: SetupLevelState = hasLocation
      ? 'done'
      : onPlaceStep
        ? 'current'
        : 'upcoming';
    const areaState: SetupLevelState = areaValid || (isActiveEdit && (formData.area ?? 0) > 0)
      ? 'done'
      : onAreaStep
        ? 'current'
        : 'upcoming';
    const boundaryState: SetupLevelState = hasBoundary
      ? 'done'
      : onBoundaryStep
        ? 'current'
        : fieldStatus === 'Active'
          ? 'skipped'
          : 'upcoming';
    const detailsState: SetupLevelState = hasDetails ? 'done' : 'upcoming';
    return [
      { key: 'name', state: nameState },
      { key: 'place', state: placeState },
      { key: 'area', state: areaState },
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

  const onNameStep =
    !isActiveEdit &&
    createScreen === 'name' &&
    editFocus !== 'boundary' &&
    editFocus !== 'place' &&
    editFocus !== 'area';

  const pageTitle = isActiveEdit
    ? t('fields:form.editTitle')
    : isEdit
      ? t('fields:form.editTitle')
      : onNameStep
        ? t('fields:createGrove.nameHeading')
        : onPlaceStep
          ? t('fields:createGrove.placeHeading')
          : onAreaStep
            ? t('fields:createGrove.area.title')
            : isFirstGrove
              ? t('fields:createGrove.firstTitle')
              : t('fields:createGrove.title');

  const pageSubtitle = isActiveEdit
    ? t('fields:form.editSubtitle')
    : onNameStep || onPlaceStep || onAreaStep
      ? null
      : t('fields:createGrove.subtitle');

  const showCreateChrome = !isActiveEdit || onBoundaryStep || onPlaceStep || onAreaStep;
  const showNameStep = onNameStep;
  const showPlaceStep =
    (!isActiveEdit && createScreen === 'place') || editFocus === 'place';
  const showAreaStep = (!isActiveEdit && createScreen === 'area') || editFocus === 'area';
  const showBoundaryEditor = editFocus === 'boundary' || (!isActiveEdit && createScreen === 'boundary');
  const boundaryStage = showBoundaryEditor && finishingFirstBoundary;

  const setupLevel = showCreateChrome && !isActiveEdit ? (
    <GroveSetupLevel
      levels={setupLevels()}
      canSelect={(key) => {
        if (key === 'name') return true;
        if (key === 'place') return Boolean(draftFieldId) && nameValid;
        if (key === 'area') return Boolean(draftFieldId) && hasLocation;
        if (key === 'boundary') return Boolean(draftFieldId) && nameValid && hasLocation;
        if (key === 'details') return Boolean(draftFieldId && fieldStatus === 'Active');
        return false;
      }}
      onSelect={(key) => {
        if (key === 'name') {
          setCreateScreen('name');
          if (draftFieldId) leaveClean(`/fields/${draftFieldId}/edit`);
          return;
        }
        if (key === 'place' && draftFieldId) {
          leaveClean(`/fields/${draftFieldId}/edit?focus=place`);
          return;
        }
        if (key === 'area' && draftFieldId) {
          leaveClean(`/fields/${draftFieldId}/edit?focus=area`);
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
          <BackLink to="/fields">{t('fields:createGrove.backToGroves')}</BackLink>
          <div className="field-form-title-row">
            <h1>{pageTitle}</h1>
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
                  onClick={() => void continueToPlace()}
                  loading={loading}
                  disabled={!nameValid}
                >
                  {t('fields:createGrove.continueToPlace')}
                </Button>
              </div>
            </>
          ) : null}

          {showPlaceStep ? (
            <>
              <PlaceLocationStep
                locationText={formData.locationText || ''}
                latitude={formData.latitude}
                longitude={formData.longitude}
                mode="search"
                onChange={(next) => {
                  markDirty();
                  setFormData((prev) => ({ ...prev, ...next }));
                }}
              />
              <div className="field-form-nav grove-create-nav">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateScreen('name');
                    if (draftFieldId) leaveClean(`/fields/${draftFieldId}/edit`);
                  }}
                >
                  {t('common:back')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void continueToArea()}
                  loading={loading}
                  disabled={!hasLocation}
                >
                  {t('fields:createGrove.continueToArea')}
                </Button>
              </div>
            </>
          ) : null}

          {showAreaStep ? (
            <>
              <ApproximateAreaStep
                value={estimatedAreaInput}
                unit={estimatedAreaUnit}
                onChange={({ value, unit }) => {
                  markDirty();
                  setEstimatedAreaInput(value);
                  setEstimatedAreaUnit(unit);
                }}
              />
              <p className="field-form-hint">{t('fields:addField.boundaryOptionalHint')}</p>
              <div className="field-form-nav grove-create-nav grove-create-nav-stack">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void activateFromPin(false)}
                  loading={loading}
                  disabled={!areaValid}
                >
                  {t('fields:addField.skipBoundaryConfirm')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void activateFromPin(true)}
                  loading={loading}
                  disabled={!areaValid}
                >
                  {t('fields:createGrove.addBoundaryNow')}
                </Button>
                <p className="field-form-hint">{t('fields:addField.skipBoundaryConsequence')}</p>
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
                fieldId={draftFieldId || id}
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
                  activation?.eligible && finishingFirstBoundary
                )}
                setupRail={boundaryStage ? setupLevel : undefined}
                onBack={boundaryStage ? exitBoundaryDraw : undefined}
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
