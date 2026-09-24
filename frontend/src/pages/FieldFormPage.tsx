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
import LocationPlacementChooser, {
  PlacementChoice,
} from '../components/fields/LocationPlacementChooser';
import PlaceLocationStep from '../components/fields/PlaceLocationStep';
import GroveReadyPanel from '../components/fields/GroveReadyPanel';
import { ArrowLeft, Check } from 'lucide-react';
import { getApiErrorMessage } from '../utils/translateApiError';
import { resolveFieldAreaSqm, hectaresFromSqm } from '../utils/area';
import { fieldHasBoundary, isListedGrove } from '../utils/fieldDisplay';
import { resolveFieldColor } from '../utils/fieldColors';
import { validateBoundaryPolygon } from '../utils/boundaryValidation';
import { useCaptureOptional } from '../context/CaptureContext';
import './FieldFormPage.css';
import '../components/fields/AddFieldWizard.css';

type CreateScreen =
  | 'name'
  | 'location-choose'
  | 'location-place'
  | 'draft-saved'
  | 'ready';

type EditFocus = 'settings' | 'location' | 'boundary' | 'details' | 'appearance';

const hasCoordsOnField = (field: { latitude?: number; longitude?: number }) =>
  field.latitude != null &&
  field.longitude != null &&
  Number.isFinite(field.latitude) &&
  Number.isFinite(field.longitude);

const FieldFormPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common']);
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const capture = useCaptureOptional();
  const isEdit = !!id;

  const focusParam = searchParams.get('focus');
  const editFocus: EditFocus =
    focusParam === 'location' ||
    focusParam === 'boundary' ||
    focusParam === 'details' ||
    focusParam === 'appearance'
      ? focusParam
      : 'settings';

  const [createScreen, setCreateScreen] = useState<CreateScreen>('name');
  const [placementMode, setPlacementMode] = useState<'search' | 'myLocation'>('search');
  const [locationSkipped, setLocationSkipped] = useState(false);
  const [detailsSkipped, setDetailsSkipped] = useState(false);
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
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const allowLeaveRef = useRef(false);

  const isActiveEdit = isEdit && fieldStatus === 'Active';
  const nameValid = formData.name.trim().length >= 2;
  const hasLocation = Boolean(
    (formData.locationText && formData.locationText.trim()) ||
      (formData.latitude != null && formData.longitude != null)
  );
  const hasDetails = Boolean(formData.variety?.trim()) || formData.treeCount != null;

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
        const focus = new URLSearchParams(window.location.search).get('focus');
        if (focus === 'location') {
          setCreateScreen(hasCoordsOnField(field) ? 'location-place' : 'location-choose');
        }
      } else {
        // Named drafts resume on the name screen, not the map.
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

  const patchLocation = (next: {
    locationText: string;
    latitude?: number;
    longitude?: number;
  }) => {
    markDirty();
    setLocationSkipped(false);
    setFormData((prev) => ({
      ...prev,
      locationText: next.locationText,
      latitude: next.latitude,
      longitude: next.longitude,
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

  const handleCreateGrove = async () => {
    if (!nameValid) {
      setError(t('fields:form.errors.nameRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fieldId = await ensureDraftField();
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
      await getFieldService().activateField(fieldId, {
        boundaryConfirmed: boundary ? boundaryConfirmed || true : true,
        cadastreReferenceAcknowledged: true,
      });
      allowLeaveRef.current = true;
      setDirty(false);
      setFieldStatus('Active');
      setCreateScreen('ready');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fields:form.failedSave'));
    } finally {
      setLoading(false);
    }
  };

  const handleContinueLater = async () => {
    if (!nameValid) {
      setError(t('fields:form.errors.nameRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fieldId = await ensureDraftField();
      await getFieldService().updateField(fieldId, fieldPayload());
      allowLeaveRef.current = true;
      setDirty(false);
      setCreateScreen('draft-saved');
    } catch {
      setError(t('fields:form.failedSave'));
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
      }
      leaveClean(`/fields/${fieldId}`);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fields:form.failedSave'));
    } finally {
      setLoading(false);
    }
  };

  const handlePlacementChoice = (choice: PlacementChoice) => {
    setError(null);
    if (choice === 'later') {
      setLocationSkipped(true);
      if (isActiveEdit) {
        leaveClean(`/fields/${id}`);
        return;
      }
      setCreateScreen('name');
      return;
    }
    setLocationSkipped(false);
    setPlacementMode(choice === 'myLocation' ? 'myLocation' : 'search');
    if (choice === 'myLocation') {
      setLocating(true);
      if (!navigator.geolocation) {
        setLocating(false);
        setError(t('fields:createGrove.placement.geoUnavailable'));
        setCreateScreen('location-place');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          patchLocation({
            locationText: formData.locationText || t('fields:createGrove.placement.nearMe'),
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setLocating(false);
          setCreateScreen('location-place');
        },
        () => {
          setLocating(false);
          setError(t('fields:createGrove.placement.geoDenied'));
          setCreateScreen('location-place');
        },
        { enableHighAccuracy: true, timeout: 12000 }
      );
      return;
    }
    setCreateScreen('location-place');
  };

  const setupLevels = (): Array<{ key: SetupLevelKey; state: SetupLevelState }> => {
    const nameState: SetupLevelState =
      createScreen === 'name' ? 'current' : nameValid ? 'done' : 'upcoming';
    let locationState: SetupLevelState = 'upcoming';
    if (createScreen === 'location-choose' || createScreen === 'location-place') {
      locationState = 'current';
    } else if (hasLocation) {
      locationState = 'done';
    } else if (locationSkipped || createScreen === 'ready' || createScreen === 'draft-saved') {
      locationState = 'skipped';
    }
    let detailsState: SetupLevelState = 'upcoming';
    if (hasDetails) detailsState = 'done';
    else if (detailsSkipped || createScreen === 'ready' || createScreen === 'draft-saved') {
      detailsState = 'skipped';
    }
    return [
      { key: 'name', state: nameState },
      { key: 'location', state: locationState },
      { key: 'details', state: detailsState },
    ];
  };

  if (loading && isEdit && !formData.name) {
    return <LoadingSpinner fullScreen />;
  }

  const pageTitle = isActiveEdit
    ? t('fields:form.editTitle')
    : isEdit
      ? t('fields:form.editTitle')
      : isFirstGrove
        ? t('fields:createGrove.firstTitle')
        : t('fields:createGrove.title');

  const pageSubtitle = isActiveEdit
    ? t('fields:form.editSubtitle')
    : createScreen === 'ready'
      ? ''
      : t('fields:createGrove.subtitle');

  const showCreateChrome = !isActiveEdit && createScreen !== 'ready' && createScreen !== 'draft-saved';

  return (
    <PageContainer>
      <div className="field-form-page">
        <Breadcrumbs />
        <header className="field-form-header">
          <Button to="/fields" variant="outline" size="sm" icon={<ArrowLeft />}>
            {t('fields:createGrove.backToGroves')}
          </Button>
          <div>
            <h1>{pageTitle}</h1>
            {pageSubtitle ? <p className="field-form-subtitle">{pageSubtitle}</p> : null}
          </div>
        </header>

        {showCreateChrome ? <GroveSetupLevel levels={setupLevels()} /> : null}

        {error && <div className="field-form-error">{error}</div>}

        <Card className="field-form-card">
          {/* ——— Create: name ——— */}
          {!isActiveEdit && createScreen === 'name' ? (
            <>
              <BasicFieldDetailsStep formData={formData} fieldId={draftFieldId || id} mode="create" onChange={handleChange} />
              {nameValid ? (
                <p className="grove-ready-nudge" role="status">
                  {t('fields:createGrove.readyNudge')}
                </p>
              ) : null}
              <div className="field-form-nav grove-create-nav">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleCreateGrove}
                  loading={loading}
                  disabled={!nameValid}
                  icon={<Check />}
                >
                  {t('fields:createGrove.createCta')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleContinueLater}
                  loading={loading}
                  disabled={!nameValid}
                >
                  {t('fields:createGrove.continueLater')}
                </Button>
                <button
                  type="button"
                  className="grove-text-link"
                  onClick={() => {
                    setError(null);
                    setCreateScreen('location-choose');
                  }}
                >
                  {t('fields:createGrove.addLocationFirst')}
                </button>
              </div>
            </>
          ) : null}

          {/* ——— Create: location chooser ——— */}
          {!isActiveEdit && createScreen === 'location-choose' ? (
            <>
              <LocationPlacementChooser onChoose={handlePlacementChoice} locating={locating} />
              <div className="field-form-nav">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateScreen('name')}
                  icon={<ArrowLeft />}
                >
                  {t('fields:form.back')}
                </Button>
              </div>
            </>
          ) : null}

          {/* ——— Create: place on map ——— */}
          {!isActiveEdit && createScreen === 'location-place' ? (
            <>
              <PlaceLocationStep
                locationText={formData.locationText || ''}
                latitude={formData.latitude}
                longitude={formData.longitude}
                mode={placementMode}
                onChange={patchLocation}
              />
              <div className="field-form-nav">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateScreen('location-choose')}
                  icon={<ArrowLeft />}
                >
                  {t('fields:form.back')}
                </Button>
                <div className="field-form-nav-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setLocationSkipped(true);
                      setCreateScreen('name');
                    }}
                  >
                    {t('fields:createGrove.placement.laterTitle')}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      setLocationSkipped(false);
                      setCreateScreen('name');
                    }}
                  >
                    {t('fields:createGrove.place.confirm')}
                  </Button>
                </div>
              </div>
            </>
          ) : null}

          {/* ——— Create: draft saved ——— */}
          {!isActiveEdit && createScreen === 'draft-saved' ? (
            <div className="field-form-panel grove-draft-saved">
              <h2>{t('fields:createGrove.draftSavedTitle')}</h2>
              <p className="field-form-panel-desc">{t('fields:createGrove.draftSavedBody')}</p>
              <div className="grove-ready-actions">
                <Button type="button" variant="primary" onClick={() => leaveClean('/fields')}>
                  {t('fields:createGrove.backToGroves')}
                </Button>
                {draftFieldId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCreateScreen('name');
                    }}
                  >
                    {t('fields:createGrove.continueSetup')}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* ——— Create: ready ——— */}
          {!isActiveEdit && createScreen === 'ready' && draftFieldId ? (
            <GroveReadyPanel
              name={formData.name.trim()}
              hasBoundary={fieldHasBoundary({ boundary })}
              hasDetails={hasDetails}
              onRecordWork={() => {
                leaveClean(`/fields/${draftFieldId}`);
                window.setTimeout(() => {
                  capture?.openCapture({ fieldId: draftFieldId, preferredType: 'work' });
                }, 0);
              }}
              onDrawBoundary={() => leaveClean(`/fields/${draftFieldId}/edit?focus=boundary`)}
              onOpenChronologio={() => leaveClean(`/fields/${draftFieldId}?tab=chronologio`)}
              onOpenGrove={() => leaveClean(`/fields/${draftFieldId}`)}
            />
          ) : null}

          {/* ——— Active edit: settings / focused ——— */}
          {isActiveEdit && editFocus === 'settings' ? (
            <>
              <BasicFieldDetailsStep
                formData={formData}
                fieldId={draftFieldId || id}
                mode="edit"
                onChange={handleChange}
                onLocationChange={patchLocation}
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
                  icon={<Check />}
                >
                  {t('fields:form.saveChanges')}
                </Button>
              </div>
            </>
          ) : null}

          {isActiveEdit && editFocus === 'location' ? (
            <>
              {createScreen === 'location-place' ? (
                <>
                  <PlaceLocationStep
                    locationText={formData.locationText || ''}
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    mode={placementMode}
                    onChange={patchLocation}
                  />
                  <div className="field-form-nav">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateScreen('location-choose')}
                      icon={<ArrowLeft />}
                    >
                      {t('fields:form.back')}
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
              ) : (
                <>
                  <LocationPlacementChooser
                    onChoose={(choice) => {
                      if (choice === 'later') {
                        leaveClean(`/fields/${id}`);
                        return;
                      }
                      handlePlacementChoice(choice);
                    }}
                    locating={locating}
                  />
                  <div className="field-form-nav">
                    <Button type="button" variant="outline" onClick={() => leaveClean(`/fields/${id}`)}>
                      {t('fields:form.back')}
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : null}

          {isActiveEdit && editFocus === 'boundary' ? (
            <>
              <FieldBoundaryMapStep
                boundary={boundary}
                measuredAreaSqm={formData.area}
                locationQuery={formData.locationText}
                latitude={formData.latitude}
                longitude={formData.longitude}
                onBoundaryChange={handleBoundaryChange}
                onSkipBoundary={() => leaveClean(`/fields/${id}`)}
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

          {isActiveEdit && editFocus === 'details' ? (
            <>
              <CropDetailsStep
                formData={formData}
                onChange={(e) => {
                  handleChange(e);
                  setDetailsSkipped(false);
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
    </PageContainer>
  );
};

export default FieldFormPage;
