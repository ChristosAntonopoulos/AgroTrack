import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOfflineMode } from '../context/OfflineContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useFieldCapacity } from '../hooks/useFieldCapacity';
import { useGrantedFieldAccess } from '../hooks/useGrantedFieldAccess';
import {
  getFieldService,
  getFieldWorkService,
  getFieldOverviewService,
} from '../services/serviceFactory';
import { geospatialService } from '../services/geospatialService';
import type { FieldEnvironmentalAlert, FieldWeather } from '../services/geospatialService';
import { isDeviceOnline } from '../utils/networkStatus';
import { getApiErrorMessage } from '../utils/translateApiError';
import { Field } from '../services/fieldService';
import type { FieldOverviewDto } from '../services/fieldOverviewService';
import type { FieldPhenology, FieldTask, FieldWorkProfile, TaskProposal } from '../services/fieldWorkService';
import { athensCalendarYear } from '../utils/athensDate';
import { parseFieldPageTab, parseFieldResultYear, type FieldPageTab } from '../utils/fieldPageQuery';
import { writeFieldViewPreferences } from '../utils/fieldViewPreferences';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import BackLink from '../components/Common/BackLink';
import Button from '../components/Common/Button';
import FieldHeader from '../components/fields/FieldHeader';
import FieldLocalNavigation from '../components/fields/FieldLocalNavigation';
import FieldOverview from '../components/fields/FieldOverview';
import FieldMapDataTab from '../components/fields/FieldMapDataTab';
import FieldDetailsTab from '../components/fields/FieldDetailsTab';
import FieldTabStatus from '../components/fields/FieldTabStatus';
import ChronologioLiving from '../components/Chronologio/ChronologioLiving';
import { readWorkProfileDraft } from '../utils/fieldWorkProfileDraft';
import { fieldHasBoundary, isFieldSetupIncomplete } from '../utils/fieldDisplay';
import { formatAreaFromSqm, resolveFieldAreaSqm } from '../utils/area';
import { normalizeLocale } from '../i18n/config';
import { useOwnerActivationOptional } from '../onboarding/OwnerActivationContext';
import SpatialLoadingPanel from '../components/onboarding/SpatialLoadingPanel';
import WorkSetupBanner from '../components/fields/WorkSetupBanner';
import '../components/fields/FieldPageShell.css';

const DISMISS_KEY = (fieldId: string) => `The Olive Lot.workSetupBanner.dismissed.${fieldId}`;

const FieldDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation(['fields', 'common', 'capture', 'chronologio', 'settings', 'tasks', 'partners']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const activation = useOwnerActivationOptional();
  const { refreshGeneration, setShowingCachedData } = useOfflineMode();
  const capture = useCaptureOptional();
  const currentYear = athensCalendarYear(new Date());
  const tab = parseFieldPageTab(searchParams);
  const year = parseFieldResultYear(searchParams, currentYear);

  const [field, setField] = useState<Field | null>(null);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [proposals, setProposals] = useState<TaskProposal[]>([]);
  const [phenology, setPhenology] = useState<FieldPhenology | null>(null);
  const [alerts, setAlerts] = useState<FieldEnvironmentalAlert[]>([]);
  const [weather, setWeather] = useState<FieldWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);
  const [workProfile, setWorkProfile] = useState<FieldWorkProfile | null | undefined>(undefined);
  const [overview, setOverview] = useState<FieldOverviewDto | null>(null);
  const [fieldLoading, setFieldLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [weatherTick, setWeatherTick] = useState(0);
  const [overviewTick, setOverviewTick] = useState(0);

  const navState = location.state as { suggestLifecyclePlan?: boolean; groveReady?: boolean } | null;
  const suggestFromNav = Boolean(navState?.suggestLifecyclePlan);
  const groveReady = Boolean(navState?.groveReady);

  useEffect(() => {
    if (!id) return;
    setBannerDismissed(localStorage.getItem(DISMISS_KEY(id)) === '1');
  }, [id]);

  useEffect(() => {
    const activationParam = searchParams.get('activation');
    // Spatial loading is a hard map landing while the panel is open.
    // Observe is soft guidance — setTab clears activation so tabs stay free.
    if (activationParam === 'spatial' && tab !== 'map') {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'map');
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, tab, setSearchParams]);

  // Field record — required before any tab can render.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadField = async () => {
      try {
        if (!field) setFieldLoading(true);
        setError(null);
        const fieldData = await getFieldService().getField(id);
        if (cancelled) return;
        if (isFieldSetupIncomplete(fieldData.status) && !fieldData.name?.trim()) {
          navigate(`/fields/${fieldData.id}/edit`, { replace: true });
          return;
        }
        setField(fieldData);
        setShowingCachedData(!isDeviceOnline());
      } catch (err: unknown) {
        if (!cancelled) setError(getApiErrorMessage(err, t) || t('fields:controlRoom.failedLoad'));
      } finally {
        if (!cancelled) setFieldLoading(false);
      }
    };

    void loadField();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshGeneration]);

  // Overview / weather / money / work — tab-local loading, does not blank the whole page.
  useEffect(() => {
    if (!id || !field) return;
    let cancelled = false;

    const loadSecondary = async () => {
      try {
        setOverviewLoading(true);
        setOverviewError(false);
        setWeatherLoading(true);
        const [plan, overviewDto, profile, stage, weatherData, alertData] = await Promise.all([
          getFieldWorkService().getTaskPlan(id, year).catch(() => null),
          getFieldOverviewService().getOverview(id, year).catch(() => null),
          getFieldWorkService().getWorkProfile(id).catch(() => null),
          getFieldWorkService().getPhenology(id).catch(() => null),
          geospatialService.getFieldWeather(id).catch(() => null),
          geospatialService.getAlerts(id).catch(() => [] as FieldEnvironmentalAlert[]),
        ]);
        if (cancelled) return;
        setTasks(plan?.tasks ?? []);
        setProposals(plan?.proposals ?? []);
        setOverview(overviewDto);
        setWorkProfile(profile);
        setPhenology(stage);
        setWeather(weatherData);
        setWeatherError(!weatherData);
        setAlerts(alertData ?? []);
        if (!overviewDto) setOverviewError(true);
      } catch {
        if (!cancelled) setOverviewError(true);
      } finally {
        if (!cancelled) {
          setOverviewLoading(false);
          setWeatherLoading(false);
        }
      }
    };

    void loadSecondary();
    return () => {
      cancelled = true;
    };
  }, [id, field, year, refreshGeneration, i18n.language, weatherTick, overviewTick]);

  const capacity = useFieldCapacity(field);
  const grantedAccess = useGrantedFieldAccess(field);
  const capabilities = field?.capabilities;
  const canOwn = capabilities
    ? capabilities.canEditField
    : capacity.canOwn || field?.ownerId === user?.userId;
  const canManageAccess = Boolean(capabilities?.canManageAccess ?? canOwn);
  const canDelete = Boolean(capabilities?.canDeleteField ?? canOwn);
  const canViewMoney =
    capabilities == null ? Boolean(canOwn) : Boolean(capabilities.canViewMoney);
  const canCapture = capabilities?.canCreateRecords === true && field?.status !== 'Archived';
  const canViewChronologio = capabilities?.canViewChronologio !== false;
  const canViewMap = capabilities?.canViewBoundary !== false;

  const showWorkSetupBanner =
    Boolean(canOwn) &&
    field?.status === 'Active' &&
    !bannerDismissed &&
    workProfile !== undefined &&
    (workProfile == null || workProfile.status === 'draft' || suggestFromNav);

  const dismissBanner = () => {
    if (id) localStorage.setItem(DISMISS_KEY(id), '1');
    setBannerDismissed(true);
  };

  const hasLocalDraft = Boolean(id && readWorkProfileDraft(id)?.stepId);

  const replaceParams = (mutate: (params: URLSearchParams) => void) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        mutate(next);
        return next;
      },
      { replace: true }
    );
  };

  const setTab = (next: FieldPageTab) => {
    writeFieldViewPreferences({ lastTab: next });
    replaceParams((params) => {
      params.delete('mode');
      params.delete('activation');
      if (next === 'overview') params.delete('tab');
      else params.set('tab', next);
    });
  };

  const setYear = (next: number) => {
    replaceParams((params) => {
      if (next === currentYear) params.delete('year');
      else params.set('year', String(next));
    });
  };

  const openCapture = () => {
    if (field) capture?.openCapture({ fieldId: field.id, sourcePage: 'grove' });
  };

  const handleArchive = async () => {
    if (!id) return;
    try {
      const updated = await getFieldService().archiveField(id);
      setField(updated);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fields:failedArchive'));
      throw err;
    }
  };

  const handleRestore = async () => {
    if (!id) return;
    try {
      const updated = await getFieldService().restoreField(id);
      setField(updated);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fields:failedRestore'));
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await getFieldService().deleteField(id);
      navigate('/fields');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fields:failedDelete'));
      throw err;
    }
  };

  if (fieldLoading && !field) {
    return (
      <PageContainer maxWidth="full" padding="none">
        <div className="field-page">
          <Breadcrumbs />
          <FieldTabStatus kind="loading" />
        </div>
      </PageContainer>
    );
  }

  if (error || !field || !id) {
    return (
      <PageContainer maxWidth="full" padding="none">
        <div className="error-container">
          <div className="error-message">{error || t('fields:controlRoom.failedLoad')}</div>
          <BackLink to="/fields">{t('fields:controlRoom.backToFields')}</BackLink>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="full" padding="none">
      <div className="field-page">
        <Breadcrumbs />
        <BackLink to="/fields">{t('fields:controlRoom.backToFields')}</BackLink>

        {groveReady ? (
          <section className="grove-ready-banner" role="status">
            <div>
              <h2>{t('fields:createGrove.readyTitle')}</h2>
              <p>
                {fieldHasBoundary(field) && resolveFieldAreaSqm(field)
                  ? t('fields:addField.boundaryAreaExplained', {
                      area: formatAreaFromSqm(resolveFieldAreaSqm(field), {
                        locale: normalizeLocale(i18n.language),
                      }),
                    })
                  : t('fields:createGrove.readyBody')}
              </p>
            </div>
            <Button variant="primary" onClick={openCapture}>
              {t('chronologio:firstGrove.primary')}
            </Button>
          </section>
        ) : null}

        <FieldHeader
          field={field}
          year={year}
          canOwn={Boolean(canOwn)}
          canManageAccess={canManageAccess}
          showYearControl={tab === 'overview'}
          onYearChange={setYear}
          phenology={phenology}
          onArchive={field.capabilities?.canArchiveField ? handleArchive : undefined}
          onRestore={field.capabilities?.canRestoreField ? handleRestore : undefined}
        />

        {activation?.eligible &&
        activation.completion.drawBoundary &&
        id &&
        (searchParams.get('activation') === 'spatial' ||
          (!activation.completion.loadData && activation.celebrating)) ? (
          <SpatialLoadingPanel fieldId={id} fieldName={field.name} />
        ) : null}

        {grantedAccess ? (
          <p className="field-secondary-access-banner" role="status">
            {t(
              grantedAccess.kind === 'partner'
                ? 'partners:ownerPartner.helpingBanner'
                : 'partners:family.helpingBanner',
              {
                field: field.name,
                level: t(`partners:family.levels.${grantedAccess.accessLevel}`),
              }
            )}
            {grantedAccess.modules.length > 0
              ? ` · ${grantedAccess.modules
                  .filter((m) => m !== 'documents')
                  .map((m) => t(`partners:family.modules.${m}`))
                  .join(', ')}`
              : null}
          </p>
        ) : null}

        {showWorkSetupBanner && id ? (
          <WorkSetupBanner
            fieldId={id}
            resume={hasLocalDraft || workProfile?.status === 'draft'}
            onDismiss={dismissBanner}
          />
        ) : null}

        {canOwn && workProfile?.status === 'active' && id ? (
          <WorkSetupBanner fieldId={id} quiet />
        ) : null}

        <FieldLocalNavigation
          tab={tab}
          onTabChange={setTab}
          capabilities={capabilities}
        />

        {tab === 'chronologio' ? (
          <div
            className="field-tab-panel"
            id="field-panel-chronologio"
            role="tabpanel"
            aria-labelledby="field-tab-chronologio"
          >
            {canViewChronologio ? (
              <ChronologioLiving fieldId={field.id} embedded />
            ) : (
              <FieldTabStatus
                kind="unavailable"
                description={t('fields:page.chronologioUnavailable')}
              />
            )}
          </div>
        ) : null}

        {tab === 'overview' ? (
          <div
            className="field-tab-panel"
            id="field-panel-overview"
            role="tabpanel"
            aria-labelledby="field-tab-overview"
          >
            {overviewLoading && !overview ? (
              <FieldTabStatus kind="loading" />
            ) : overviewError && !overview ? (
              <FieldTabStatus kind="error" onRetry={() => setOverviewTick((n) => n + 1)} />
            ) : (
              <FieldOverview
                field={field}
                overview={overview}
                weather={weather}
                canViewMoney={Boolean(canViewMoney)}
                canEdit={Boolean(canOwn)}
                onOpenChronologio={(entryId) => {
                  writeFieldViewPreferences({ lastTab: 'chronologio' });
                  replaceParams((params) => {
                    params.delete('mode');
                    params.set('tab', 'chronologio');
                    if (entryId) params.set('entry', entryId);
                    else params.delete('entry');
                  });
                }}
                onOpenMap={() => setTab('map')}
                onOpenStatus={() => setTab('details')}
              />
            )}
          </div>
        ) : null}

        {tab === 'map' ? (
          <div
            className="field-tab-panel"
            id="field-panel-map"
            role="tabpanel"
            aria-labelledby="field-tab-map"
          >
            {canViewMap ? (
              <FieldMapDataTab field={field} year={year} weather={weather} />
            ) : (
              <FieldTabStatus kind="unavailable" description={t('fields:page.mapUnavailable')} />
            )}
          </div>
        ) : null}

        {tab === 'details' ? (
          <div
            className="field-tab-panel"
            id="field-panel-details"
            role="tabpanel"
            aria-labelledby="field-tab-details"
          >
            <FieldDetailsTab
              field={field}
              year={year}
              canOwn={Boolean(canOwn)}
              workProfile={workProfile}
              phenology={phenology}
              onArchive={field.capabilities?.canArchiveField ? handleArchive : undefined}
              onRestore={field.capabilities?.canRestoreField ? handleRestore : undefined}
              onDelete={canDelete ? handleDelete : undefined}
            />
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
};

export default FieldDetailPage;
