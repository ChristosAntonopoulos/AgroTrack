import React, { useState, useEffect, useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { getFieldService, getTaskService, getFinancialEntryService, getMeDashboardService, isMockMode } from '../services/serviceFactory';
import { FinancialOverview } from '../services/financialEntryService';
import type { MeDashboard, MeDashboardPeriod } from '../services/meDashboardService';
import { emptyMeDashboard } from '../services/meDashboardService';
import { useExperienceMode } from '../context/ExperienceModeContext';
import { useOfflineMode } from '../context/OfflineContext';
import { isDeviceOnline } from '../utils/networkStatus';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import { demoStore } from '../services/demo/demoStore';
import { testUsers } from '../services/testUsers';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import StatsCard from '../components/Common/StatsCard';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Badge from '../components/Common/Badge';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import DemoTourPanel from '../components/Demo/DemoTourPanel';
import HeroActionCard from '../components/Dashboard/HeroActionCard';
import MyActionsStrip from '../components/Dashboard/MyActionsStrip';
import NotesWidget from '../components/Dashboard/NotesWidget';
import RecentActivityFeed from '../components/Dashboard/RecentActivityFeed';
import ActionSparkline from '../components/Dashboard/ActionSparkline';
import {
  Layers,
  MapPin,
  AlertTriangle,
  Wheat,
  FileText,
  Euro,
  PlusCircle,
  Sun,
  ChevronRight,
  CheckCircle2,
  Clock,
  ListTodo,
  Leaf,
  Handshake,
} from 'lucide-react';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import './DashboardPage.css';
import '../components/Dashboard/DashboardWidgets.css';

const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common', 'partners', 'fields']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isEveryday, showWidget } = useExperienceMode();
  const { refreshGeneration, setShowingCachedData } = useOfflineMode();
  const [fields, setFields] = useState<Field[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [moneyOverview, setMoneyOverview] = useState<FinancialOverview | null>(null);
  const [period, setPeriod] = useState<MeDashboardPeriod>('week');
  const [meDashboard, setMeDashboard] = useState<MeDashboard>(emptyMeDashboard('week'));

  const dateLocale = i18n.language === 'el' ? el : enUS;
  const isFieldOwner = user?.role === 'FieldOwner' || user?.role === 'Administrator';
  const isProducer = user?.role === 'Producer';

  const demoProgress = isMockMode() && user?.userId ? demoStore.getDemoProgress(user.userId, user.role) : null;
  const showOnboarding = isMockMode() && demoProgress && !demoProgress.dismissed;

  const displayName =
    user?.firstName ||
    testUsers.find((u) => u.userId === user?.userId)?.displayName?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    '';

  useEffect(() => {
    if (isEveryday) return;
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, isEveryday, refreshGeneration, period]);

  const loadDashboardData = async () => {
    try {
      if (fields.length === 0) setLoading(true);
      const fieldService = getFieldService();
      const taskService = getTaskService();
      const [fieldsData, tasksData, overview, dash] = await Promise.all([
        fieldService.getFields().catch(() => []),
        (isProducer
          ? taskService.getTasks(undefined, user?.userId)
          : taskService.getTasks()
        ).catch(() => []),
        isFieldOwner
          ? getFinancialEntryService().getOverview().catch(() => null)
          : Promise.resolve(null),
        getMeDashboardService().getDashboard(period).catch(() => emptyMeDashboard(period)),
      ]);
      setFields(fieldsData);
      setTasks(tasksData);
      setMoneyOverview(overview);
      setMeDashboard(dash);
      setShowingCachedData(!isDeviceOnline());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const taskInsights = useMemo(() => {
    if (isFieldOwner && isMockMode()) {
      demoStore.ensureSeeded();
    }
    const allTasks = isFieldOwner && isMockMode() ? demoStore.getTasks() : tasks;
    const overdue = allTasks.filter(
      (task) =>
        task.status !== 'completed' &&
        task.scheduledEnd &&
        new Date(task.scheduledEnd) < today
    );
    const dueToday = tasks.filter((task) => {
      if (task.status === 'completed') return false;
      if (!task.scheduledEnd) return false;
      const end = new Date(task.scheduledEnd);
      return end >= today && end < new Date(today.getTime() + 86400000);
    });
    const pendingApproval = isMockMode()
      ? demoStore.getTasks().filter(
          (task) => task.status === 'completed' && (task as { approvalStatus?: string }).approvalStatus === 'pending'
        )
      : allTasks.filter(
          (task) => task.status === 'completed' && task.approvalStatus === 'pending'
        );
    const overdueFieldIds = new Set(overdue.map((task) => task.fieldId));

    const priorityTasks = [...tasks]
      .filter((task) => task.status !== 'completed')
      .sort((a, b) => {
        const aOverdue = a.scheduledEnd && new Date(a.scheduledEnd) < today ? 0 : 1;
        const bOverdue = b.scheduledEnd && new Date(b.scheduledEnd) < today ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        return new Date(a.scheduledEnd || 0).getTime() - new Date(b.scheduledEnd || 0).getTime();
      })
      .slice(0, 5);

    return {
      overdueCount: overdue.length,
      dueTodayCount: dueToday.length,
      fieldsAtRisk: overdueFieldIds.size,
      pendingApprovalCount: pendingApproval.length,
      priorityTasks,
    };
  }, [isFieldOwner, tasks, today]);

  if (isEveryday) {
    return <Navigate to="/today" replace />;
  }

  const totalArea = fields.reduce((sum, field) => sum + field.area, 0);
  const pendingTasks = tasks.filter((task) => task.status === 'pending').length;
  const inProgressTasks = tasks.filter((task) => task.status === 'in_progress').length;
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;

  if (loading) {
    return (
      <PageContainer>
        <div className="dashboard-page">
          <Breadcrumbs />
          <LoadingSpinner className="page-inline-loading" />
        </div>
      </PageContainer>
    );
  }

  const hasAlerts =
    taskInsights.overdueCount > 0 ||
    taskInsights.fieldsAtRisk > 0 ||
    (isFieldOwner && taskInsights.pendingApprovalCount > 0);

  return (
    <PageContainer>
      <div className="dashboard-page">
        <Breadcrumbs />

        {showOnboarding && user?.userId && (
          <section className="dashboard-onboarding">
            <DemoTourPanel userId={user.userId} role={user.role} />
          </section>
        )}

        <header className="dashboard-hero">
          <div className="dashboard-hero-text">
            <span className="dashboard-greeting">
              {displayName
                ? t('dashboard:welcome', { name: displayName })
                : t('dashboard:welcomeFallback')}
            </span>
            <h1>{t('dashboard:title')}</h1>
            <p className="dashboard-date">
              {format(new Date(), 'EEEE, d MMMM yyyy', { locale: dateLocale })}
            </p>
          </div>
        </header>

        {showWidget('myActionsDetail') && (
          <div className="period-chips" role="tablist" aria-label={t('dashboard:myActions.period.week')}>
            {(['today', 'week', 'month'] as MeDashboardPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={period === p}
                className={`period-chip${period === p ? ' is-active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {t(`dashboard:myActions.period.${p}`)}
              </button>
            ))}
          </div>
        )}

        {showWidget('myActions') && (
          <HeroActionCard
            topAction={meDashboard.topAction}
            pending={meDashboard.pending}
            role={user?.role}
            density="full"
          />
        )}

        {isProducer && (
          <Card className="producer-hero-card" hover onClick={() => navigate('/today')}>
            <div className="producer-hero-content">
              <div className="producer-hero-icon">
                <Sun size={28} />
              </div>
              <div>
                <h2>{t('dashboard:producerHero.title')}</h2>
                <p>{t('dashboard:producerHero.subtitle')}</p>
              </div>
            </div>
            <Button variant="primary" icon={<ChevronRight size={16} />}>
              {t('dashboard:producerHero.cta')}
            </Button>
          </Card>
        )}

        <section className="dashboard-quick-actions">
          <h2 className="dashboard-section-label">{t('dashboard:quickActions.title')}</h2>
          <div className="quick-actions-grid">
            {isProducer && (
              <button type="button" className="quick-action-card" onClick={() => navigate('/today')}>
                <Sun size={20} />
                <span className="quick-action-title">{t('dashboard:quickActions.today')}</span>
                <span className="quick-action-sub">{t('dashboard:quickActions.todaySub')}</span>
              </button>
            )}
            {isFieldOwner && (
              <>
                <button type="button" className="quick-action-card" onClick={() => navigate('/this-harvest')}>
                  <Wheat size={20} />
                  <span className="quick-action-title">{t('fields:thisHarvest.title')}</span>
                  <span className="quick-action-sub">{t('fields:thisHarvest.season', { year: new Date().getFullYear() })}</span>
                </button>
                <button type="button" className="quick-action-card" onClick={() => navigate('/reports')}>
                  <FileText size={20} />
                  <span className="quick-action-title">{t('dashboard:quickActions.reports')}</span>
                  <span className="quick-action-sub">{t('dashboard:quickActions.reportsSub')}</span>
                </button>
                <button type="button" className="quick-action-card" onClick={() => navigate('/tasks/new')}>
                  <PlusCircle size={20} />
                  <span className="quick-action-title">{t('dashboard:quickActions.newTask')}</span>
                  <span className="quick-action-sub">{t('dashboard:quickActions.newTaskSub')}</span>
                </button>
              </>
            )}
            <button type="button" className="quick-action-card" onClick={() => navigate('/fields')}>
              <Leaf size={20} />
              <span className="quick-action-title">{t('dashboard:quickActions.fields')}</span>
              <span className="quick-action-sub">{t('dashboard:quickActions.fieldsSub')}</span>
            </button>
            <button type="button" className="quick-action-card" onClick={() => navigate('/tasks')}>
              <ListTodo size={20} />
              <span className="quick-action-title">{t('dashboard:quickActions.tasks')}</span>
              <span className="quick-action-sub">{t('dashboard:quickActions.tasksSub')}</span>
            </button>
            <button type="button" className="quick-action-card" onClick={() => navigate('/partners')}>
              <Handshake size={20} />
              <span className="quick-action-title">{t('partners:dashboardCta')}</span>
              <span className="quick-action-sub">{t('partners:dashboardCtaSub')}</span>
            </button>
          </div>
        </section>

        {hasAlerts ? (
          <section className="dashboard-alerts">
            <h2 className="dashboard-section-label">
              <AlertTriangle size={16} />
              {t('dashboard:alerts.title')}
            </h2>
            <div className="alerts-grid">
              {taskInsights.overdueCount > 0 && (
                <Card hover className="alert-card alert-warning" onClick={() => navigate('/tasks?focus=action')}>
                  <div className="alert-card-value">{taskInsights.overdueCount}</div>
                  <div className="alert-card-title">{t('dashboard:alerts.overdue')}</div>
                  <div className="alert-card-sub">{t('dashboard:alerts.overdueSub')}</div>
                </Card>
              )}
              {isFieldOwner && taskInsights.fieldsAtRisk > 0 && (
                <Card hover className="alert-card alert-warning" onClick={() => navigate('/fields')}>
                  <div className="alert-card-value">{taskInsights.fieldsAtRisk}</div>
                  <div className="alert-card-title">{t('dashboard:alerts.fieldsAtRisk')}</div>
                  <div className="alert-card-sub">{t('dashboard:alerts.fieldsAtRiskSub')}</div>
                </Card>
              )}
              {isFieldOwner && taskInsights.pendingApprovalCount > 0 && (
                <Card hover className="alert-card alert-info" onClick={() => navigate('/tasks')}>
                  <div className="alert-card-value">{taskInsights.pendingApprovalCount}</div>
                  <div className="alert-card-title">{t('dashboard:alerts.pendingApproval')}</div>
                  <div className="alert-card-sub">{t('dashboard:alerts.pendingApprovalSub')}</div>
                </Card>
              )}
            </div>
          </section>
        ) : isFieldOwner ? (
          <div className="dashboard-all-clear">
            <CheckCircle2 size={18} />
            {t('dashboard:alerts.none')}
          </div>
        ) : null}

        {showWidget('myActions') && (
          <MyActionsStrip data={meDashboard} density="full" period={period} />
        )}

        {showWidget('recentNotes') && (
          <NotesWidget
            limit={5}
            fieldNames={Object.fromEntries(fields.map((f) => [f.id, f.name]))}
            fields={fields.map((f) => ({ id: f.id, name: f.name }))}
            showSeeMore
          />
        )}

        {showWidget('myActionsDetail') && <ActionSparkline series={meDashboard.series} />}

        <div className="dashboard-stats">
          {isFieldOwner && (
            <>
              <StatsCard
                title={t('dashboard:stats.totalFields')}
                value={fields.length}
                icon={<Layers />}
                color="primary"
                onClick={() => navigate('/fields')}
              />
              <StatsCard
                title={t('dashboard:stats.totalArea')}
                value={`${totalArea.toFixed(1)} ${t('common:hectaresUnit')}`}
                icon={<MapPin />}
                color="info"
                onClick={() => navigate('/fields')}
              />
              <StatsCard
                title={t('dashboard:stats.overdue')}
                value={taskInsights.overdueCount}
                icon={<AlertTriangle />}
                color={taskInsights.overdueCount > 0 ? 'warning' : 'success'}
                onClick={() => navigate('/tasks?focus=action')}
              />
              <StatsCard
                title={t('dashboard:stats.thisWeekCost')}
                value={new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: moneyOverview?.currency || 'EUR',
                }).format(moneyOverview?.thisWeekExpenses ?? 0)}
                icon={<Euro />}
                color="info"
                onClick={() => navigate('/money')}
              />
            </>
          )}
          {isProducer && (
            <>
              <StatsCard
                title={t('dashboard:stats.dueToday')}
                value={taskInsights.dueTodayCount}
                icon={<Clock />}
                color="warning"
                onClick={() => navigate('/today')}
              />
              <StatsCard
                title={t('dashboard:stats.inProgress')}
                value={inProgressTasks}
                icon={<ListTodo />}
                color="info"
                onClick={() => navigate('/tasks?status=in_progress')}
              />
              <StatsCard
                title={t('dashboard:stats.pendingTasks')}
                value={pendingTasks}
                icon={<Clock />}
                color="warning"
                onClick={() => navigate('/tasks')}
              />
              <StatsCard
                title={t('dashboard:stats.completed')}
                value={completedTasks}
                icon={<CheckCircle2 />}
                color="success"
                onClick={() => navigate('/tasks?status=completed')}
              />
            </>
          )}
        </div>

        {showWidget('myActions') && (
          <RecentActivityFeed
            activities={meDashboard.recent}
            limit={10}
            fieldNames={Object.fromEntries(fields.map((f) => [f.id, f.name]))}
            showSeeMore={showWidget('myActionsDetail')}
          />
        )}

        <div className="dashboard-main-grid">
          <section className="dashboard-panel">
            <div className="panel-header">
              <h2>
                {isFieldOwner
                  ? t('dashboard:fieldsSection.ownerTitle')
                  : t('dashboard:fieldsSection.workerTitle')}
              </h2>
              <Link to="/fields" className="panel-link">
                {t('common:viewAll')} <ChevronRight size={14} />
              </Link>
            </div>
            <div className="fields-list">
              {fields.slice(0, 4).map((field) => {
                const fieldTasks = tasks.filter((task) => task.fieldId === field.id);
                const openTasks = fieldTasks.filter((task) => task.status !== 'completed').length;
                return (
                  <Link key={field.id} to={`/fields/${field.id}`} className="field-row">
                    <div className="field-row-main">
                      <span className="field-row-name">{field.name}</span>
                      <span className="field-row-meta">
                        {t('common:hectares', { count: field.area })} · {field.variety}
                      </span>
                    </div>
                    <div className="field-row-badges">
                      <Badge variant={field.currentLifecycleYear === 'high' ? 'success' : 'primary'} size="sm">
                        {t('common:year', { year: field.currentLifecycleYear })}
                      </Badge>
                      {openTasks > 0 && (
                        <Badge variant="warning" size="sm">
                          {openTasks} {t('common:tasks', { defaultValue: 'tasks' })}
                        </Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
              {fields.length === 0 && (
                <div className="panel-empty">
                  {isFieldOwner ? (
                    <Trans i18nKey="dashboard:fieldsSection.emptyOwner" components={{ 1: <Link to="/fields/new" /> }} />
                  ) : (
                    t('dashboard:fieldsSection.emptyWorker')
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="panel-header">
              <h2>{t('dashboard:tasksSection.title')}</h2>
              <Link to={isProducer ? '/today' : '/tasks'} className="panel-link">
                {isProducer ? t('dashboard:tasksSection.viewToday') : t('common:viewAll')}
                <ChevronRight size={14} />
              </Link>
            </div>
            <div className="tasks-list">
              {taskInsights.priorityTasks.map((task) => {
                const taskField = fields.find((f) => f.id === task.fieldId);
                const isOverdue =
                  task.scheduledEnd && new Date(task.scheduledEnd) < today && task.status !== 'completed';
                const statusVariant =
                  task.status === 'completed'
                    ? 'success'
                    : task.status === 'in_progress'
                      ? 'info'
                      : 'warning';
                return (
                  <Link key={task.id} to={`/tasks/${task.id}`} className="task-row">
                    <div className="task-row-main">
                      <span className="task-row-title">{task.title}</span>
                      {taskField && <span className="task-row-field">{taskField.name}</span>}
                    </div>
                    <div className="task-row-badges">
                      {isOverdue && (
                        <Badge variant="error" size="sm">
                          {t('dashboard:stats.overdue')}
                        </Badge>
                      )}
                      <Badge variant={statusVariant} size="sm">
                        {t(`common:taskStatus.${task.status}`)}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
              {taskInsights.priorityTasks.length === 0 && (
                <div className="panel-empty">
                  {isProducer
                    ? t('dashboard:tasksSection.emptyProducer')
                    : t('dashboard:tasksSection.emptyDefault')}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
};

export default DashboardPage;
