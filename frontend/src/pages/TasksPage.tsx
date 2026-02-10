import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTaskService } from '../services/serviceFactory';
import { Task } from '../services/taskService';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import Badge from '../components/Common/Badge';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import EmptyState from '../components/Common/EmptyState';
import { Plus, Filter, Search, CheckSquare } from 'lucide-react';
import './TasksPage.css';

const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const taskService = getTaskService();
      const userId = user?.role === 'Producer' ? user.userId : undefined;
      const data = await taskService.getTasks(undefined, userId);
      setTasks(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesFilter = filter === 'all' || task.status === filter;
    const matchesSearch = searchTerm === '' || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'info';
      case 'completed':
        return 'success';
      default:
        return 'primary';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <PageContainer>
      <div className="tasks-page">
        <Breadcrumbs />
        <div className="tasks-header">
          <div>
            <h1>Tasks</h1>
            <p className="tasks-subtitle">
              {user?.role === 'Producer' ? 'Your assigned tasks' : 'All tasks'}
            </p>
          </div>
          {user?.role === 'FieldOwner' && (
            <Button to="/tasks/new" icon={<Plus />}>
              Create Task
            </Button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="tasks-filters">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-buttons">
            <Button
              variant={filter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'pending' ? 'warning' : 'outline'}
              size="sm"
              onClick={() => setFilter('pending')}
            >
              Pending
            </Button>
            <Button
              variant={filter === 'in_progress' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFilter('in_progress')}
            >
              In Progress
            </Button>
            <Button
              variant={filter === 'completed' ? 'success' : 'outline'}
              size="sm"
              onClick={() => setFilter('completed')}
            >
              Completed
            </Button>
          </div>
        </div>

        <div className="tasks-grid">
          {filteredTasks.length === 0 ? (
            <EmptyState
              icon={<CheckSquare size={64} />}
              title="No tasks found"
              description={user?.role === 'FieldOwner' ? 'Create your first task to get started' : 'No tasks match your filters'}
              action={
                user?.role === 'FieldOwner' && (
                  <Button to="/tasks/new" icon={<Plus />}>
                    Create Task
                  </Button>
                )
              }
            />
          ) : (
            filteredTasks.map((task) => (
              <Card key={task.id} hover to={`/tasks/${task.id}`} className="task-card">
                <div className="task-card-header">
                  <h3>{task.title}</h3>
                  <Badge variant={getStatusColor(task.status) as any} size="sm">
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="task-type">{task.type}</p>
                {task.description && (
                  <p className="task-description">{task.description}</p>
                )}
                <div className="task-card-footer">
                  <div className="task-meta">
                    <span>Scheduled: {formatDate(task.scheduledStart)}</span>
                    {task.assignedTo && <Badge variant="info" size="sm">Assigned</Badge>}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default TasksPage;
