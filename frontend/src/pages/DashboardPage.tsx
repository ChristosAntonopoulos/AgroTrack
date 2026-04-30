import React, { useState, useEffect } from 'react';
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
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const lowYearFields = fields.filter((f) => f.currentLifecycleYear === 'low').length;
  const highYearFields = fields.filter((f) => f.currentLifecycleYear === 'high').length;

  const ownerCommand = (() => {
    if (!isFieldOwner && user?.role !== 'Administrator') return null;
    demoStore.ensureSeeded();
    const allTasks = demoStore.getTasks();
    const approvalsPending = allTasks.filter((t) => t.status === 'completed' && t.approvalStatus === 'pending').length;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const overdueFieldIds = new Set(
      allTasks
        .filter((t) => t.status !== 'completed' && t.scheduledEnd && new Date(t.scheduledEnd) < today)
        .map((t) => t.fieldId)
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
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">Welcome back, {user?.email}</p>
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
              <div className="owner-command-title">Approvals pending</div>
              <Badge variant={ownerCommand.approvalsPending > 0 ? 'warning' : 'success'} size="sm">
                {ownerCommand.approvalsPending}
              </Badge>
            </div>
            <div className="owner-command-sub">Review completed work from producers.</div>
          </Card>

          <Card hover className="owner-command-card" onClick={() => navigate('/issues')}>
            <div className="owner-command-top">
              <div className="owner-command-title">Issues open</div>
              <Badge variant={ownerCommand.openIssues > 0 ? 'warning' : 'success'} size="sm">
                {ownerCommand.openIssues}
              </Badge>
            </div>
            <div className="owner-command-sub">
              {ownerCommand.highOpenIssues > 0 ? (
                <span><strong>{ownerCommand.highOpenIssues}</strong> high severity need attention.</span>
              ) : (
                <span>No high severity issues.</span>
              )}
            </div>
          </Card>

          <Card hover className="owner-command-card" onClick={() => navigate('/fields')}>
            <div className="owner-command-top">
              <div className="owner-command-title">Fields at risk</div>
              <Badge variant={ownerCommand.fieldsAtRisk > 0 ? 'warning' : 'success'} size="sm">
                {ownerCommand.fieldsAtRisk}
              </Badge>
            </div>
            <div className="owner-command-sub">Fields with overdue work.</div>
          </Card>
        </div>
      ) : null}

      <div className="dashboard-stats">
        {isFieldOwner && (
          <>
            <StatsCard
              title="Total Fields"
              value={fields.length}
              icon={<Layers />}
              color="primary"
            />
            <StatsCard
              title="Total Area"
              value={`${totalArea.toFixed(2)} ha`}
              icon={<MapPin />}
              color="info"
            />
            <StatsCard
              title="Low Year Fields"
              value={lowYearFields}
              icon={<TrendingUp />}
              color="warning"
            />
            <StatsCard
              title="High Year Fields"
              value={highYearFields}
              icon={<TrendingUp />}
              color="success"
            />
          </>
        )}

        {isProducer && (
          <>
            <StatsCard
              title="Pending Tasks"
              value={pendingTasks}
              icon={<CheckSquare />}
              color="warning"
            />
            <StatsCard
              title="In Progress"
              value={inProgressTasks}
              icon={<CheckSquare />}
              color="info"
            />
            <StatsCard
              title="Completed"
              value={completedTasks}
              icon={<CheckSquare />}
              color="success"
            />
            <StatsCard
              title="Total Tasks"
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
            <h2>{isFieldOwner ? 'My Fields' : 'Fields I Work On'}</h2>
            <Link to="/fields" className="view-all-link">
              View All →
            </Link>
          </div>
          <div className="fields-preview">
              {fields.slice(0, 5).map((field) => {
              const fieldTasks = tasks.filter(t => t.fieldId === field.id);
              const taskStats = {
                total: fieldTasks.length,
                completed: fieldTasks.filter(t => t.status === 'completed').length,
                pending: fieldTasks.filter(t => t.status === 'pending').length,
              };
              const isOwner = field.ownerId === user?.userId;
              
              return (
                <Card key={field.id} hover as={Link} to={`/fields/${field.id}`} className="field-preview-card">
                  <div className="field-preview-header">
                    <h3>{field.name}</h3>
                    {!isOwner && <Badge variant="info" size="sm">Assigned</Badge>}
                  </div>
                  <p>{field.area} hectares</p>
                  <div className="field-preview-footer">
                    <Badge variant={field.currentLifecycleYear === 'high' ? 'success' : 'primary'} size="sm">
                      {field.currentLifecycleYear} year
                    </Badge>
                    {taskStats.total > 0 && (
                      <Badge variant="info" size="sm">
                        {taskStats.completed}/{taskStats.total} tasks
                      </Badge>
                    )}
                  </div>
                </Card>
              );
            })}
            {fields.length === 0 && (
              <div className="empty-state">
                <p>
                  {isFieldOwner 
                    ? <>No fields yet. <Link to="/fields/new">Create your first field</Link></>
                    : 'No fields assigned yet.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {(isProducer || isFieldOwner) && (
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Recent Tasks</h2>
              <Link to="/tasks" className="view-all-link">
                View All →
              </Link>
            </div>
            <div className="tasks-preview">
              {tasks.slice(0, 5).map((task) => {
                const taskField = fields.find(f => f.id === task.fieldId);
                const statusVariant = task.status === 'completed' ? 'success' : 
                                     task.status === 'in_progress' ? 'info' : 'warning';
                return (
                  <Card key={task.id} hover as={Link} to={`/tasks/${task.id}`} className="task-preview-card">
                    <h3>{task.title}</h3>
                    <p className="task-type">{task.type}</p>
                    {taskField && (
                      <p className="task-field-name">{taskField.name}</p>
                    )}
                    <Badge variant={statusVariant} size="sm">
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </Card>
                );
              })}
              {tasks.length === 0 && (
                <div className="empty-state">
                  <p>No tasks {isProducer ? 'assigned' : 'available'} yet.</p>
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
