import React, { useState, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { getFieldService } from '../services/serviceFactory';
import { getTaskService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import StatsCard from '../components/Common/StatsCard';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Badge from '../components/Common/Badge';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import DemoTourPanel from '../components/Demo/DemoTourPanel';
import { demoStore } from '../services/demo/demoStore';
import { Layers, CheckSquare, TrendingUp, MapPin } from 'lucide-react';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState<Field[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const fieldService = getFieldService();
      const taskService = getTaskService();
      const [fieldsData, tasksData] = await Promise.all([
        fieldService.getFields().catch(() => []),
        taskService.getTasks(undefined, user?.userId).catch(() => []),
      ]);
      setFields(fieldsData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFieldOwner = user?.role === 'FieldOwner';
  const isProducer = user?.role === 'Producer';

  const demoProgress = user?.userId ? demoStore.getDemoProgress(user.userId, user.role) : null;

  const totalArea = fields.reduce((sum, field) => sum + field.area, 0);
  const pendingTasks = tasks.filter((task) => task.status === 'pending').length;
  const inProgressTasks = tasks.filter((task) => task.status === 'in_progress').length;
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const lowYearFields = fields.filter((f) => f.currentLifecycleYear === 'low').length;
  const highYearFields = fields.filter((f) => f.currentLifecycleYear === 'high').length;

  const ownerCommand = (() => {
    if (!isFieldOwner && user?.role !== 'Administrator') return null;
    demoStore.ensureSeeded();
    const allTasks = demoStore.getTasks();
    const approvalsPending = allTasks.filter(
      (task) => task.status === 'completed' && task.approvalStatus === 'pending'
    ).length;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const overdueFieldIds = new Set(
      allTasks
        .filter((task) => task.status !== 'completed' && task.scheduledEnd && new Date(task.scheduledEnd) < today)
        .map((task) => task.fieldId)
    );

    const issues = demoStore.getIssues();
    const openIssues = issues.filter((i) => i.status === 'Open');
    const highOpenIssues = openIssues.filter((i) => i.severity === 'High').length;

    return {
      approvalsPending,
      fieldsAtRisk: overdueFieldIds.size,
      openIssues: openIssues.length,
      highOpenIssues,
    };
  })();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <PageContainer>
      <div className="dashboard-page">
        <Breadcrumbs />
        <div className="dashboard-header">
          <div>
            <h1>{t('dashboard:title')}</h1>
            <p className="dashboard-subtitle">{t('dashboard:welcome', { email: user?.email })}</p>
          </div>
        </div>

        {user?.userId && demoProgress && !demoProgress.dismissed ? (
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <DemoTourPanel userId={user.userId} role={user.role} />
          </div>
        ) : null}

        {ownerCommand ? (
          <div className="owner-command-grid">
            <Card hover className="owner-command-card" onClick={() => navigate('/approvals')}>
              <div className="owner-command-top">
                <div className="owner-command-title">{t('dashboard:ownerCommand.approvalsPending')}</div>
                <Badge variant={ownerCommand.approvalsPending > 0 ? 'warning' : 'success'} size="sm">
                  {ownerCommand.approvalsPending}
                </Badge>
              </div>
              <div className="owner-command-sub">{t('dashboard:ownerCommand.approvalsSub')}</div>
            </Card>

            <Card hover className="owner-command-card" onClick={() => navigate('/issues')}>
              <div className="owner-command-top">
                <div className="owner-command-title">{t('dashboard:ownerCommand.issuesOpen')}</div>
                <Badge variant={ownerCommand.openIssues > 0 ? 'warning' : 'success'} size="sm">
                  {ownerCommand.openIssues}
                </Badge>
              </div>
              <div className="owner-command-sub">
                {ownerCommand.highOpenIssues > 0 ? (
                  <Trans
                    i18nKey="dashboard:ownerCommand.highSeverity"
                    values={{ count: ownerCommand.highOpenIssues }}
                    components={{ strong: <strong /> }}
                  />
                ) : (
                  <span>{t('dashboard:ownerCommand.noHighSeverity')}</span>
                )}
              </div>
            </Card>

            <Card hover className="owner-command-card" onClick={() => navigate('/fields')}>
              <div className="owner-command-top">
                <div className="owner-command-title">{t('dashboard:ownerCommand.fieldsAtRisk')}</div>
                <Badge variant={ownerCommand.fieldsAtRisk > 0 ? 'warning' : 'success'} size="sm">
                  {ownerCommand.fieldsAtRisk}
                </Badge>
              </div>
              <div className="owner-command-sub">{t('dashboard:ownerCommand.fieldsAtRiskSub')}</div>
            </Card>
          </div>
        ) : null}

        <div className="dashboard-stats">
          {isFieldOwner && (
            <>
              <StatsCard
                title={t('dashboard:stats.totalFields')}
                value={fields.length}
                icon={<Layers />}
                color="primary"
              />
              <StatsCard
                title={t('dashboard:stats.totalArea')}
                value={`${totalArea.toFixed(2)} ${t('common:hectaresUnit')}`}
                icon={<MapPin />}
                color="info"
              />
              <StatsCard
                title={t('dashboard:stats.lowYearFields')}
                value={lowYearFields}
                icon={<TrendingUp />}
                color="warning"
              />
              <StatsCard
                title={t('dashboard:stats.highYearFields')}
                value={highYearFields}
                icon={<TrendingUp />}
                color="success"
              />
            </>
          )}

          {isProducer && (
            <>
              <StatsCard
                title={t('dashboard:stats.pendingTasks')}
                value={pendingTasks}
                icon={<CheckSquare />}
                color="warning"
              />
              <StatsCard
                title={t('dashboard:stats.inProgress')}
                value={inProgressTasks}
                icon={<CheckSquare />}
                color="info"
              />
              <StatsCard
                title={t('dashboard:stats.completed')}
                value={completedTasks}
                icon={<CheckSquare />}
                color="success"
              />
              <StatsCard
                title={t('dashboard:stats.totalTasks')}
                value={tasks.length}
                icon={<CheckSquare />}
                color="primary"
              />
            </>
          )}
        </div>

        <div className="dashboard-content-grid">
          <div className="dashboard-section">
            <div className="section-header">
              <h2>
                {isFieldOwner
                  ? t('dashboard:fieldsSection.ownerTitle')
                  : t('dashboard:fieldsSection.workerTitle')}
              </h2>
              <Link to="/fields" className="view-all-link">
                {t('common:viewAll')}
              </Link>
            </div>
            <div className="fields-preview">
              {fields.slice(0, 5).map((field) => {
                const fieldTasks = tasks.filter((task) => task.fieldId === field.id);
                const taskStats = {
                  total: fieldTasks.length,
                  completed: fieldTasks.filter((task) => task.status === 'completed').length,
                };
                const isOwner = field.ownerId === user?.userId;

                return (
                  <Card key={field.id} hover as={Link} to={`/fields/${field.id}`} className="field-preview-card">
                    <div className="field-preview-header">
                      <h3>{field.name}</h3>
                      {!isOwner && (
                        <Badge variant="info" size="sm">
                          {t('common:assigned')}
                        </Badge>
                      )}
                    </div>
                    <p>{t('common:hectares', { count: field.area })}</p>
                    <div className="field-preview-footer">
                      <Badge
                        variant={field.currentLifecycleYear === 'high' ? 'success' : 'primary'}
                        size="sm"
                      >
                        {t('common:year', { year: field.currentLifecycleYear })}
                      </Badge>
                      {taskStats.total > 0 && (
                        <Badge variant="info" size="sm">
                          {t('common:tasksCount', {
                            completed: taskStats.completed,
                            total: taskStats.total,
                          })}
                        </Badge>
                      )}
                    </div>
                  </Card>
                );
              })}
              {fields.length === 0 && (
                <div className="empty-state">
                  <p>
                    {isFieldOwner ? (
                      <Trans
                        i18nKey="dashboard:fieldsSection.emptyOwner"
                        components={{ 1: <Link to="/fields/new" /> }}
                      />
                    ) : (
                      t('dashboard:fieldsSection.emptyWorker')
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {(isProducer || isFieldOwner) && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2>{t('dashboard:tasksSection.title')}</h2>
                <Link to="/tasks" className="view-all-link">
                  {t('common:viewAll')}
                </Link>
              </div>
              <div className="tasks-preview">
                {tasks.slice(0, 5).map((task) => {
                  const taskField = fields.find((f) => f.id === task.fieldId);
                  const statusVariant =
                    task.status === 'completed'
                      ? 'success'
                      : task.status === 'in_progress'
                        ? 'info'
                        : 'warning';
                  return (
                    <Card key={task.id} hover as={Link} to={`/tasks/${task.id}`} className="task-preview-card">
                      <h3>{task.title}</h3>
                      <p className="task-type">{task.type}</p>
                      {taskField && <p className="task-field-name">{taskField.name}</p>}
                      <Badge variant={statusVariant} size="sm">
                        {t(`common:taskStatus.${task.status}`)}
                      </Badge>
                    </Card>
                  );
                })}
                {tasks.length === 0 && (
                  <div className="empty-state">
                    <p>
                      {isProducer
                        ? t('dashboard:tasksSection.emptyProducer')
                        : t('dashboard:tasksSection.emptyDefault')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default DashboardPage;
