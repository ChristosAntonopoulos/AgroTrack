import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOfflineMode } from '../context/OfflineContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useFieldCapacity } from '../hooks/useFieldCapacity';
import { useGrantedFieldAccess } from '../hooks/useGrantedFieldAccess';
import {
  getFieldService,
  getFieldWorkService,
  getFinancialSummaryService,
  getChronologioService,
} from '../services/serviceFactory';
import { geospatialService } from '../services/geospatialService';
import type { FieldEnvironmentalAlert, FieldWeather } from '../services/geospatialService';
import { isDeviceOnline } from '../utils/networkStatus';
import { getApiErrorMessage } from '../utils/translateApiError';
import { Field } from '../services/fieldService';
import type { FieldPhenology, FieldTask, FieldWorkProfile, TaskProposal } from '../services/fieldWorkService';
import type { YearFinancialSummary } from '../services/financialSummaryService';
import type { FieldYearSummary } from '../services/financialSummaryService';
import { athensCalendarYear } from '../utils/athensDate';
import type { ChronologioEntry } from '../services/chronologioService';
import { parseFieldPageTab, parseFieldResultYear, type FieldPageTab } from '../utils/fieldPageQuery';
import { writeFieldViewPreferences } from '../utils/fieldViewPreferences';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import FieldHeader from '../components/fields/FieldHeader';
import FieldLocalNavigation from '../components/fields/FieldLocalNavigation';
import FieldOverview from '../components/fields/FieldOverview';
import FieldMapDataTab from '../components/fields/FieldMapDataTab';
import FieldDetailsTab from '../components/fields/FieldDetailsTab';
import FieldTabStatus from '../components/fields/FieldTabStatus';
import ChronologioLiving from '../components/Chronologio/ChronologioLiving';
import { readWorkProfileDraft } from '../utils/fieldWorkProfileDraft';
import { isFieldSetupIncomplete } from '../utils/fieldDisplay';
import '../components/fields/FieldPageShell.css';
import './FieldWorkSetupPage.css';

const DISMISS_KEY = (fieldId: string) => `oleachron.workSetupBanner.dismissed.${fieldId}`;

const FieldDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation(['fields', 'common', 'capture', 'chronologio', 'settings', 'tasks', 'partners']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
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
  const [costSummary, setCostSummary] = useState<YearFinancialSummary | null>(null);
  const [yearRollup, setYearRollup] = useState<FieldYearSummary | null>(null);
  const [recentEntries, setRecentEntries] = useState<ChronologioEntry[]>([]);
  const [fieldLoading, setFieldLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [weatherTick, setWeatherTick] = useState(0);
  const [overviewTick, setOverviewTick] = useState(0);

  const suggestFromNav = Boolean(
    (location.state as { suggestLifecyclePlan?: boolean } | null)?.suggestLifecyclePlan
  );

  useEffect(() => {
    if (!id) return;
    setBannerDismissed(localStorage.getItem(DISMISS_KEY(id)) === '1');
  }, [id]);

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
        if (isFieldSetupIncomplete(fieldData.status)) {
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
        const [plan, summary, chrono, fieldYear, profile, stage, weatherData, alertData] =
          await Promise.all([
            getFieldWorkService().getTaskPlan(id, year).catch(() => null),
            getFinancialSummaryService().getYear(year, id, i18n.language).catch(() => null),
            getChronologioService()
              .getFieldChronologio(id, {
                limit: 8,
                from: `${year}-01-01`,
                to: `${year}-12-31`,
              })
              .catch(() => [] as ChronologioEntry[]),
            getFinancialSummaryService().getFieldYear(id, year, i18n.language).catch(() => null),
            getFieldWorkService().getWorkProfile(id).catch(() => null),
            getFieldWorkService().getPhenology(id).catch(() => null),
            geospatialService.getFieldWeather(id).catch(() => null),
            geospatialService.getAlerts(id).catch(() => [] as FieldEnvironmentalAlert[]),
          ]);
        if (cancelled) return;
        setTasks(plan?.tasks ?? []);
        setProposals(plan?.proposals ?? []);
        setCostSummary(summary);
        setYearRollup(fieldYear);
        setRecentEntries(chrono);
        setWorkProfile(profile);
        setPhenology(stage);
        setWeather(weatherData);
        setWeatherError(!weatherData);
        setAlerts(alertData ?? []);
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
  const canCapture = capabilities?.canCreateRecords !== false;
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
    if (field) capture?.openCapture({ fieldId: field.id });
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
          <Button to="/fields" icon={<ArrowLeft />} variant="outline">
            {t('fields:controlRoom.backToFields')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="full" padding="none">
      <div className="field-page">
        <Breadcrumbs />

        <FieldHeader
          field={field}
          year={year}
          canOwn={Boolean(canOwn)}
          canManageAccess={canManageAccess}
          showYearControl={tab === 'overview'}
          onYearChange={setYear}
          onCapture={canCapture ? openCapture : undefined}
          phenology={phenology}
        />

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

        {showWorkSetupBanner ? (
          <div
            className="fw-setup-banner"
            role="region"
            aria-label={t('tasks:fieldWork.onboarding.banner.title')}
          >
            <h2>{t('tasks:fieldWork.onboarding.banner.title')}</h2>
            <p>{t('tasks:fieldWork.onboarding.banner.body')}</p>
            <div className="fw-setup-banner-actions">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(`/fields/${id}/work-setup`)}
              >
                {hasLocalDraft || workProfile?.status === 'draft'
                  ? t('tasks:fieldWork.onboarding.banner.resume')
                  : t('tasks:fieldWork.onboarding.banner.start')}
              </Button>
              <Button variant="outline" size="md" onClick={dismissBanner}>
                {t('tasks:fieldWork.onboarding.banner.later')}
              </Button>
            </div>
          </div>
        ) : null}

        {canOwn && workProfile?.status === 'active' && id ? (
          <div className="fw-setup-banner fw-setup-banner--quiet" role="region">
            <p>{t('tasks:fieldWork.profile.title')}</p>
            <div className="fw-setup-banner-actions">
              <Button
                variant="outline"
                size="md"
                onClick={() => navigate(`/fields/${id}/work-profile`)}
              >
                {t('tasks:fieldWork.profile.open')}
              </Button>
            </div>
          </div>
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
            {overviewLoading && !weather && tasks.length === 0 ? (
              <FieldTabStatus kind="loading" />
            ) : overviewError ? (
              <FieldTabStatus kind="error" onRetry={() => setOverviewTick((n) => n + 1)} />
            ) : (
              <FieldOverview
                field={field}
                year={year}
                currentYear={currentYear}
                phenology={phenology}
                tasks={tasks}
                proposals={proposals}
                alerts={alerts}
                weather={weather}
                weatherLoading={weatherLoading}
                weatherError={weatherError}
                onRetryWeather={() => setWeatherTick((n) => n + 1)}
                costSummary={costSummary}
                yearRollup={yearRollup}
                recentEntries={recentEntries}
                canViewMoney={Boolean(canViewMoney)}
                canEdit={Boolean(canOwn)}
                onOpenChronologio={(entry) => {
                  writeFieldViewPreferences({ lastTab: 'chronologio' });
                  replaceParams((params) => {
                    params.delete('mode');
                    params.set('tab', 'chronologio');
                    if (entry) params.set('entry', entry.id);
                    else params.delete('entry');
                  });
                }}
                onOpenMap={() => setTab('map')}
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
              onDelete={canDelete ? handleDelete : undefined}
            />
          </div>
        ) : null}

        {canCapture ? <div className="field-sticky-capture">
          <Button icon={<Plus />} variant="primary" onClick={openCapture}>
            {t('fields:page.capture')}
          </Button>
        </div> : null}
      </div>
    </PageContainer>
  );
};

export default FieldDetailPage;
