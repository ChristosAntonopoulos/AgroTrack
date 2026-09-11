import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOfflineMode } from '../context/OfflineContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useExperienceMode } from '../context/ExperienceModeContext';
import { useFieldCapacity } from '../hooks/useFieldCapacity';
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
import LoadingSpinner from '../components/Common/LoadingSpinner';
import FieldHeader from '../components/fields/FieldHeader';
import FieldLocalNavigation from '../components/fields/FieldLocalNavigation';
import FieldOverview from '../components/fields/FieldOverview';
import FieldMapDataTab from '../components/fields/FieldMapDataTab';
import FieldDetailsTab from '../components/fields/FieldDetailsTab';
import ChronologioLiving from '../components/Chronologio/ChronologioLiving';
import { readWorkProfileDraft } from '../utils/fieldWorkProfileDraft';
import { isFieldSetupIncomplete } from '../utils/fieldDisplay';
import '../components/fields/FieldPageShell.css';
import './FieldWorkSetupPage.css';

const DISMISS_KEY = (fieldId: string) => `oleachron.workSetupBanner.dismissed.${fieldId}`;

const FieldDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation(['fields', 'common', 'capture', 'chronologio', 'settings', 'tasks']);
  const { isFullPicture } = useExperienceMode();
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [weatherTick, setWeatherTick] = useState(0);

  const suggestFromNav = Boolean(
    (location.state as { suggestLifecyclePlan?: boolean } | null)?.suggestLifecyclePlan
  );

  useEffect(() => {
    if (!id) return;
    setBannerDismissed(localStorage.getItem(DISMISS_KEY(id)) === '1');
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      try {
        if (!field) setLoading(true);
        setWeatherLoading(true);
        const [fieldData, plan, summary, chrono, fieldYear, profile, stage, weatherData, alertData] =
          await Promise.all([
            getFieldService().getField(id),
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
        if (isFieldSetupIncomplete(fieldData.status)) {
          navigate(`/fields/${fieldData.id}/edit`, { replace: true });
          return;
        }
        setField(fieldData);
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
        setShowingCachedData(!isDeviceOnline());
      } catch (err: unknown) {
        if (!cancelled) setError(getApiErrorMessage(err, t) || t('fields:controlRoom.failedLoad'));
      } finally {
        if (!cancelled) {
          setLoading(false);
          setWeatherLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, year, refreshGeneration, i18n.language, weatherTick]);

  const capacity = useFieldCapacity(field);
  const canOwn = capacity.canOwn || field?.ownerId === user?.userId;

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
    if (!id || !window.confirm(t('fields:deleteConfirm'))) return;
    try {
      await getFieldService().deleteField(id);
      navigate('/fields');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fields:failedDelete'));
    }
  };

  if (loading) {
    return (
      <PageContainer maxWidth="full">
        <div className="field-page">
          <Breadcrumbs />
          <LoadingSpinner className="page-inline-loading" />
        </div>
      </PageContainer>
    );
  }

  if (error || !field || !id) {
    return (
      <PageContainer maxWidth="full">
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
    <PageContainer maxWidth="full">
      <div className="field-page" data-field-depth={isFullPicture ? 'full' : 'simple'}>
        <Breadcrumbs />

        <FieldHeader
          field={field}
          year={year}
          canOwn={Boolean(canOwn)}
          onYearChange={setYear}
          onCapture={openCapture}
          onDocuments={() => setTab('details')}
          onDelete={canOwn ? handleDelete : undefined}
        />

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
                size="lg"
                onClick={() => navigate(`/fields/${id}/work-setup`)}
              >
                {hasLocalDraft || workProfile?.status === 'draft'
                  ? t('tasks:fieldWork.onboarding.banner.resume')
                  : t('tasks:fieldWork.onboarding.banner.start')}
              </Button>
              <Button variant="outline" size="lg" onClick={dismissBanner}>
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
                size="lg"
                onClick={() => navigate(`/fields/${id}/work-profile`)}
              >
                {t('tasks:fieldWork.profile.open')}
              </Button>
            </div>
          </div>
        ) : null}

        <FieldLocalNavigation tab={tab} onTabChange={setTab} />

        {tab === 'chronologio' ? (
          <div
            className="field-tab-panel"
            id="field-panel-chronologio"
            role="tabpanel"
            aria-labelledby="field-tab-chronologio"
          >
            <ChronologioLiving fieldId={field.id} embedded />
          </div>
        ) : null}

        {tab === 'overview' ? (
          <div
            className="field-tab-panel"
            id="field-panel-overview"
            role="tabpanel"
            aria-labelledby="field-tab-overview"
          >
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
          </div>
        ) : null}

        {tab === 'map' ? (
          <div
            className="field-tab-panel"
            id="field-panel-map"
            role="tabpanel"
            aria-labelledby="field-tab-map"
          >
            <FieldMapDataTab field={field} year={year} weather={weather} />
          </div>
        ) : null}

        {tab === 'details' ? (
          <div
            className="field-tab-panel"
            id="field-panel-details"
            role="tabpanel"
            aria-labelledby="field-tab-details"
          >
            <FieldDetailsTab field={field} year={year} canOwn={Boolean(canOwn)} />
          </div>
        ) : null}

        <div className="field-sticky-capture">
          <Button icon={<Plus />} variant="primary" onClick={openCapture}>
            {t('fields:page.capture')}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default FieldDetailPage;
