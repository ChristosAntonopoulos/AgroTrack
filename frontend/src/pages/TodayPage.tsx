import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, CloudRain, Leaf, Search, Wheat } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocaleFormatters } from '../hooks/useLocaleFormatters';
import { useOfflineMode } from '../context/OfflineContext';
import { isDeviceOnline } from '../utils/networkStatus';
import PageContainer from '../components/Common/PageContainer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import DemoTourPanel from '../components/Demo/DemoTourPanel';
import {
  getFieldService,
  getTaskService,
  getNoteService,
  isMockMode,
} from '../services/serviceFactory';
import { demoStore } from '../services/demo/demoStore';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import { Note } from '../services/noteService';
import { hasCapacity } from '../services/fieldPeopleService';
import { locationService, Location } from '../services/locationService';
import { weatherService, WeatherData } from '../services/weatherService';
import { useCaptureOptional } from '../context/CaptureContext';
import {
  buildConditionsStatus,
  buildProposals,
  buildTodayRoute,
  fieldLabelMap,
  kmhToBeaufort,
  partitionTasks,
  rankAndPresentProposals,
  type BriefProposal,
} from '../today/buildDailyBrief';
import { dismissProposal, getDismissedProposalIds } from '../today/dismissStore';
import './TodayPage.css';

const openDirections = (lat: number, lng: number) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

const proposalIcon = (p: BriefProposal) => {
  switch (p.icon) {
    case 'harvest':
      return <Wheat size={18} aria-hidden />;
    case 'weather':
      return <CloudRain size={18} aria-hidden />;
    case 'observe':
      return <Search size={18} aria-hidden />;
    default:
      return <Leaf size={18} aria-hidden />;
  }
};

const TodayPage: React.FC = () => {
  const { t, i18n } = useTranslation(['today', 'common']);
  const { formatDate } = useLocaleFormatters();
  const { user } = useAuth();
  const navigate = useNavigate();
  const capture = useCaptureOptional();
  const { refreshGeneration, setShowingCachedData } = useOfflineMode();

  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [apiFields, setApiFields] = useState<Field[]>([]);
  const [apiTasks, setApiTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [dismissTick, setDismissTick] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [whyOpenId, setWhyOpenId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isMockMode()) {
          demoStore.ensureSeeded();
          if (user?.userId) {
            demoStore.markDemoStep(user.userId, user.role || 'Producer', 'producer_visit_today');
          }
        } else if (user?.userId) {
          const [fieldsData, tasksData, notesData] = await Promise.all([
            getFieldService().getFields(),
            getTaskService().getTasks(),
            getNoteService()
              .getNotes({ limit: 50 })
              .catch(() => [] as Note[]),
          ]);
          if (!cancelled) {
            setApiFields(fieldsData);
            setApiTasks(tasksData);
            setNotes(notesData);
            setShowingCachedData(!isDeviceOnline());
          }
          const geoField = fieldsData.find(
            (f) => typeof f.latitude === 'number' && typeof f.longitude === 'number'
          );
          if (geoField && !cancelled) {
            const w = await weatherService.getFieldWeatherData(geoField.id).catch(() => null);
            if (!cancelled) setWeather(w);
          }
        }
      } catch {
        if (!cancelled) {
          setApiFields([]);
          setApiTasks([]);
        }
      }

      try {
        const loc = await locationService.getCurrentLocation({
          enableHighAccuracy: false,
          timeoutMs: 5000,
        });
        if (!cancelled) setCurrentLocation(loc);
      } catch {
        /* optional */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.userId, user?.role, refreshGeneration, setShowingCachedData]);

  const producerId = user?.userId;
  const role = user?.role || '';

  const { fields, tasks } = useMemo(() => {
    if (isMockMode()) {
      demoStore.ensureSeeded();
      return { fields: demoStore.getFields(), tasks: demoStore.getTasks() };
    }
    return { fields: apiFields, tasks: apiTasks };
  }, [apiFields, apiTasks]);

  const names = useMemo(() => fieldLabelMap(fields), [fields]);

  const myOpenTasks = useMemo(() => {
    if (!producerId) return [];
    const workFieldIds = new Set(
      fields
        .filter((f) => {
          if (f.memberships?.length) {
            return (
              hasCapacity(f.memberships, producerId, 'work') ||
              hasCapacity(f.memberships, producerId, 'help')
            );
          }
          return (
            f.ownerId === producerId ||
            (f.assignedProducerIds || []).includes(producerId) ||
            role === 'Producer'
          );
        })
        .map((f) => f.id)
    );

    return tasks.filter((task) => {
      if (task.status === 'completed') return false;
      if (task.assignedTo === producerId) return true;
      if (workFieldIds.has(task.fieldId) && (!task.assignedTo || task.assignedTo === producerId)) {
        return true;
      }
      return false;
    });
  }, [tasks, producerId, fields, role]);

  const { todayWork, overdue, nextTasks } = useMemo(
    () => partitionTasks(myOpenTasks),
    [myOpenTasks]
  );

  const dismissed = useMemo(() => getDismissedProposalIds(), [dismissTick]);

  const rainConflictCount =
    (weather?.rainForecast24hMm ?? 0) >= 2 && todayWork.length > 0 ? todayWork.length : 0;

  const conditionsStatus = useMemo(
    () =>
      buildConditionsStatus({
        weather,
        todayTaskCount: todayWork.length,
        overdueCount: overdue.length,
        rainConflictCount,
      }),
    [weather, todayWork.length, overdue.length, rainConflictCount]
  );

  const ranked = useMemo(() => {
    const raw = buildProposals({
      fields,
      openTasks: myOpenTasks,
      notes,
      weather,
      todayWork,
      dismissedIds: dismissed,
    });
    return rankAndPresentProposals(raw);
  }, [fields, myOpenTasks, notes, weather, todayWork, dismissed]);

  const routeStops = useMemo(
    () => buildTodayRoute({ todayWork, fields, currentLocation }),
    [todayWork, fields, currentLocation]
  );

  const dateLabel = useMemo(() => {
    return new Date().toLocaleDateString(i18n.language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [i18n.language]);

  const conditionsLine = useMemo(() => {
    if (!weather) return null;
    const parts = [
      t('today:brief.conditions.temp', { temp: weather.temperature }),
      (weather.rainForecast24hMm ?? 0) >= 0.5 || weather.precipitation > 0
        ? t('today:brief.conditions.rainMm', {
            mm: Math.round(weather.rainForecast24hMm || weather.precipitation),
          })
        : t('today:brief.conditions.noRain'),
      t('today:brief.conditions.windBft', { bft: kmhToBeaufort(weather.windSpeed) }),
    ];
    return parts.join('   ');
  }, [weather, t]);

  const onDismiss = useCallback((id: string) => {
    dismissProposal(id, 7);
    setDismissTick((n) => n + 1);
    setExpandedId((cur) => (cur === id ? null : cur));
  }, []);

  const onProposalPrimary = (p: BriefProposal) => {
    if (p.primaryAction === 'capture') {
      capture?.openCapture({ preferredType: 'observation', fieldId: p.fieldId });
      return;
    }
    if (p.primaryAction === 'weather' && p.fieldId) {
      navigate(`/fields/${p.fieldId}`);
      return;
    }
    if (p.primaryAction === 'open_task' && p.taskId) {
      navigate(`/tasks/${p.taskId}`);
      return;
    }
    const q = new URLSearchParams();
    if (p.fieldId) q.set('fieldId', p.fieldId);
    if (p.templateId) q.set('templateId', p.templateId);
    navigate(`/tasks/new?${q.toString()}`);
  };

  const completeTask = async (taskId: string) => {
    try {
      await getTaskService().updateTaskStatus(taskId, 'completed');
      setApiTasks((prev) =>
        prev.map((x) => (x.id === taskId ? { ...x, status: 'completed' } : x))
      );
    } catch {
      navigate(`/tasks/${taskId}`);
    }
  };

  const uniqueFieldCount = new Set(todayWork.map((x) => x.fieldId)).size;
  const dueTodayOnly = todayWork.filter((task) => !overdue.some((o) => o.id === task.id));
  const hasToday = todayWork.length > 0;
  const hasProposals = Boolean(ranked.featured);
  const calmEmpty = !hasToday && !hasProposals && nextTasks.length === 0;

  const primaryCta = (p: BriefProposal) =>
    p.primaryAction === 'capture'
      ? t('today:brief.capture')
      : p.primaryAction === 'weather'
        ? t('today:brief.seeConditions')
        : t('today:brief.schedule');

  const renderFeatured = (p: BriefProposal) => (
    <article className="today-featured" key={p.id}>
      <div className="today-featured-top">
        <span className="today-featured-icon" aria-hidden>
          {proposalIcon(p)}
        </span>
        <span className="today-featured-badge">
          {hasToday ? t('today:brief.oleachronSuggestion') : t('today:brief.featuredBadge')}
        </span>
      </div>
      <h3 className="today-featured-title">{t(`today:${p.titleKey}`, p.titleParams)}</h3>
      {p.fieldLabel ? <p className="today-featured-field">{p.fieldLabel}</p> : null}
      <p className="today-featured-reason">{t(`today:${p.reasonKey}`, p.reasonParams)}</p>
      {p.detailKey ? (
        <div className="today-why-wrap">
          <button
            type="button"
            className="today-why-link"
            onClick={() => setWhyOpenId((id) => (id === p.id ? null : p.id))}
          >
            {t('today:brief.whyExpand')}
          </button>
          {whyOpenId === p.id ? (
            <p className="today-why-detail">{t(`today:${p.detailKey}`, p.detailParams)}</p>
          ) : null}
        </div>
      ) : null}
      <div className="today-featured-actions">
        <Button size="sm" variant="primary" onClick={() => onProposalPrimary(p)}>
          {primaryCta(p)}
        </Button>
        <button type="button" className="today-text-action" onClick={() => onDismiss(p.id)}>
          {t('today:brief.notNow')}
        </button>
      </div>
    </article>
  );

  const renderSecondary = (p: BriefProposal) => {
    const open = expandedId === p.id;
    return (
      <div key={p.id} className={`today-secondary${open ? ' is-open' : ''}`}>
        <button
          type="button"
          className="today-secondary-hit"
          onClick={() => setExpandedId((id) => (id === p.id ? null : p.id))}
          aria-expanded={open}
        >
          <span className="today-secondary-icon" aria-hidden>
            {proposalIcon(p)}
          </span>
          <span className="today-secondary-body">
            <span className="today-secondary-title">{t(`today:${p.titleKey}`, p.titleParams)}</span>
            {p.fieldLabel ? (
              <span className="today-secondary-meta">{p.fieldLabel}</span>
            ) : null}
            <span className="today-secondary-meta">
              {t(`today:${p.reasonKey}`, p.reasonParams)}
            </span>
          </span>
          <ChevronRight size={18} className="today-secondary-chevron" aria-hidden />
        </button>
        {open ? (
          <div className="today-secondary-expand">
            {p.detailKey ? (
              <p className="today-why-detail">{t(`today:${p.detailKey}`, p.detailParams)}</p>
            ) : null}
            <div className="today-featured-actions">
              <Button size="sm" variant="primary" onClick={() => onProposalPrimary(p)}>
                {primaryCta(p)}
              </Button>
              <button type="button" className="today-text-action" onClick={() => onDismiss(p.id)}>
                {t('today:brief.notNow')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="today-brief">
          <Breadcrumbs />
          <header className="today-brief-header">
            <h1>{t('today:title')}</h1>
            <p className="today-brief-date">{dateLabel}</p>
            <p className="today-brief-subtitle">{t('today:subtitle')}</p>
          </header>
          <LoadingSpinner className="page-inline-loading" />
        </div>
      </PageContainer>
    );
  }

  const hiddenExtras = showHidden
    ? ranked.all.slice(1 + ranked.secondary.length)
    : [];

  return (
    <PageContainer>
      <div className="today-brief">
        <Breadcrumbs />

        {isMockMode() && user?.userId
          ? (() => {
              const progress = demoStore.getDemoProgress(user.userId, user.role || 'Producer');
              return !progress.dismissed ? (
                <div className="today-onboarding">
                  <DemoTourPanel userId={user.userId} role={user.role || 'Producer'} />
                </div>
              ) : null;
            })()
          : null}

        <header className="today-brief-header">
          <h1>{t('today:title')}</h1>
          <p className="today-brief-date">{dateLabel}</p>
          <p className="today-brief-subtitle">{t('today:subtitle')}</p>
        </header>

        <section className="today-brief-conditions" aria-label={t('today:title')}>
          {conditionsLine ? <p className="today-brief-conditions-line">{conditionsLine}</p> : null}
          <p
            className={`today-brief-conditions-status${conditionsStatus.alert ? ' is-alert' : ''}`}
          >
            {t(`today:${conditionsStatus.lineKey}`, conditionsStatus.lineParams)}
          </p>
        </section>

        {calmEmpty ? (
          <section className="today-brief-calm">
            <p className="today-brief-positive">
              <Check size={16} aria-hidden /> {t('today:brief.noTodayTasks')}
            </p>
            <p className="today-brief-quiet">{t('today:brief.allQuietNone')}</p>
            <Button variant="primary" size="sm" onClick={() => navigate('/tasks/new')}>
              {t('today:brief.scheduleWork')}
            </Button>
          </section>
        ) : null}

        {!calmEmpty && !hasToday ? (
          <p className="today-brief-positive">
            <Check size={16} aria-hidden /> {t('today:brief.noTodayTasks')}
          </p>
        ) : null}

        {overdue.length > 0 ? (
          <section className="today-brief-section" aria-labelledby="today-overdue-heading">
            <div className="today-brief-section-head">
              <h2 id="today-overdue-heading">{t('today:brief.overdueSection')}</h2>
              <p className="today-brief-section-meta">
                {t('today:brief.todaySummary', {
                  tasks: overdue.length,
                  fields: new Set(overdue.map((x) => x.fieldId)).size,
                })}
              </p>
            </div>
            <div className="today-brief-list">
              {overdue.map((task) => {
                return (
                  <div key={task.id} className="today-brief-row">
                    <div className="today-brief-row-main">
                      <div className="today-brief-row-time">
                        <span className="today-brief-overdue">{t('today:brief.overdueTag')}</span>
                      </div>
                      <div>
                        <div className="today-brief-row-title">{task.title}</div>
                        <div className="today-brief-row-meta">{names[task.fieldId] || '—'}</div>
                      </div>
                    </div>
                    <div className="today-brief-row-actions">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/tasks/${task.id}`)}>
                        {t('today:brief.open')}
                      </Button>
                      <button
                        type="button"
                        className="today-text-action"
                        onClick={() => void completeTask(task.id)}
                      >
                        {t('today:brief.complete')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {dueTodayOnly.length > 0 ? (
          <section className="today-brief-section" aria-labelledby="today-work-heading">
            <div className="today-brief-section-head">
              <h2 id="today-work-heading">{t('today:brief.todaySection')}</h2>
              <p className="today-brief-section-meta">
                {t('today:brief.todaySummary', {
                  tasks: dueTodayOnly.length,
                  fields: uniqueFieldCount,
                })}
              </p>
            </div>
            <div className="today-brief-list">
              {dueTodayOnly.map((task) => {
                const due = task.scheduledStart || task.scheduledEnd;
                const time =
                  due &&
                  new Date(due).toLocaleTimeString(i18n.language, {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  });
                return (
                  <div key={task.id} className="today-brief-row">
                    <div className="today-brief-row-main">
                      <div className="today-brief-row-time">{time || '—'}</div>
                      <div>
                        <div className="today-brief-row-title">{task.title}</div>
                        <div className="today-brief-row-meta">{names[task.fieldId] || '—'}</div>
                      </div>
                    </div>
                    <div className="today-brief-row-actions">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/tasks/${task.id}`)}>
                        {t('today:brief.open')}
                      </Button>
                      <button
                        type="button"
                        className="today-text-action"
                        onClick={() => void completeTask(task.id)}
                      >
                        {t('today:brief.complete')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {hasToday && routeStops.length > 0 ? (
          <section className="today-brief-section" aria-labelledby="today-route-heading">
            <h2 id="today-route-heading">
              {routeStops.length === 1
                ? t('today:brief.destinationTitle')
                : t('today:brief.routeTitle')}
            </h2>
            <ol className="today-brief-route">
              {routeStops.map((stop, idx) => (
                <li key={stop.fieldId} className="today-brief-route-stop">
                  {routeStops.length > 1 ? (
                    <span className="today-brief-route-n" aria-hidden>
                      {idx + 1}
                    </span>
                  ) : null}
                  <div className="today-brief-route-body">
                    <div className="today-brief-row-title">{stop.fieldName}</div>
                    <div className="today-brief-row-meta">
                      {stop.timeLabel ? `${stop.timeLabel} · ` : ''}
                      {stop.taskTitle}
                    </div>
                    {stop.distanceKm != null ? (
                      <div className="today-brief-row-meta">
                        {stop.durationMin != null
                          ? t('today:brief.distanceEta', {
                              km: stop.distanceKm,
                              min: stop.durationMin,
                            })
                          : t('today:brief.distanceOnly', { km: stop.distanceKm })}
                      </div>
                    ) : null}
                  </div>
                  {stop.latitude != null && stop.longitude != null ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDirections(stop.latitude!, stop.longitude!)}
                    >
                      {t('today:brief.directions')}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {hasProposals && ranked.featured ? (
          <section className="today-brief-section" aria-labelledby="today-worth-heading">
            <h2 id="today-worth-heading">{t('today:brief.worthDoingNow')}</h2>
            {renderFeatured(ranked.featured)}

            {ranked.secondary.length > 0 ? (
              <div className="today-secondary-block">
                <p className="today-secondary-label">
                  {t('today:brief.moreProposals', { count: ranked.secondary.length })}
                </p>
                {ranked.secondary.map(renderSecondary)}
              </div>
            ) : null}

            {ranked.hiddenCount > 0 ? (
              <button
                type="button"
                className="today-brief-link"
                onClick={() => setShowHidden((v) => !v)}
              >
                {showHidden
                  ? t('today:brief.showLess')
                  : t('today:brief.seeMoreProposals', { count: ranked.hiddenCount })}
              </button>
            ) : null}

            {hiddenExtras.map(renderSecondary)}
          </section>
        ) : null}

        {nextTasks.length > 0 ? (
          <section className="today-brief-section" aria-labelledby="today-next-heading">
            <div className="today-brief-section-head">
              <h2 id="today-next-heading">{t('today:brief.nextSection')}</h2>
              <button type="button" className="today-brief-link" onClick={() => navigate('/tasks')}>
                {t('today:brief.seeAllTasks')} →
              </button>
            </div>
            <div className="today-brief-list">
              {nextTasks.map((task) => {
                const due = task.scheduledStart || task.scheduledEnd;
                return (
                  <button
                    key={task.id}
                    type="button"
                    className="today-brief-row is-button"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    <div className="today-brief-row-main">
                      <div className="today-brief-row-time">
                        {due ? formatDate(due) : '—'}
                      </div>
                      <div>
                        <div className="today-brief-row-title">{task.title}</div>
                        <div className="today-brief-row-meta">{names[task.fieldId] || '—'}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </PageContainer>
  );
};

export default TodayPage;
