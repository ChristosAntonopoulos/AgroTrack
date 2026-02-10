import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTaskService } from '../services/serviceFactory';
import { getFieldService } from '../services/serviceFactory';
import { getUserService } from '../services/serviceFactory';
import { Task } from '../services/taskService';
import { Field } from '../services/fieldService';
import { User } from '../services/userService';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import EvidenceUpload from '../components/Task/EvidenceUpload';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import Badge from '../components/Common/Badge';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { ArrowLeft, Edit, User as UserIcon, Calendar, MapPin, CheckCircle } from 'lucide-react';
import './TaskDetailPage.css';

const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [field, setField] = useState<Field | null>(null);
  const [assignedUser, setAssignedUser] = useState<User | null>(null);
  const [producers, setProducers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedProducerId, setSelectedProducerId] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadTaskData();
    }
  }, [id]);

  useEffect(() => {
    if (user?.role === 'FieldOwner') {
      loadProducers();
    }
  }, [user]);

  useEffect(() => {
    if (task?.assignedTo) {
      loadAssignedUser(task.assignedTo);
    }
  }, [task]);

  const loadTaskData = async () => {
    try {
      setLoading(true);
      const taskService = getTaskService();
      const taskData = await taskService.getTask(id!);
      setTask(taskData);
      
      // Load field information
      if (taskData.fieldId) {
        try {
          const fieldService = getFieldService();
          const fieldData = await fieldService.getField(taskData.fieldId);
          setField(fieldData);
        } catch (err) {
          console.error('Error loading field:', err);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const loadProducers = async () => {
    try {
      const userService = getUserService();
      const producersData = await userService.getUsers('Producer');
      setProducers(producersData);
    } catch (err) {
      console.error('Error loading producers:', err);
    }
  };

  const loadAssignedUser = async (userId: string) => {
    try {
      const userService = getUserService();
      const userData = await userService.getUser(userId);
      setAssignedUser(userData);
    } catch (err) {
      console.error('Error loading assigned user:', err);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!task || !id) return;

    try {
      setUpdatingStatus(true);
      const taskService = getTaskService();
      const updatedTask = await taskService.updateTaskStatus(id, newStatus);
      setTask(updatedTask);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update task status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssign = async () => {
    if (!task || !id || !selectedProducerId) return;

    try {
      setAssigning(true);
      const taskService = getTaskService();
      const updatedTask = await taskService.assignTask(id, selectedProducerId);
      setTask(updatedTask);
      setSelectedProducerId('');
      await loadAssignedUser(selectedProducerId);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign task');
    } finally {
      setAssigning(false);
    }
  };

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

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return 'in_progress';
      case 'in_progress':
        return 'completed';
      default:
        return null;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  const canEdit = user?.role === 'FieldOwner' || (user?.role === 'Producer' && task?.assignedTo === user?.userId);
  const isFieldOwner = user?.role === 'FieldOwner';

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (error && !task) {
    return (
      <PageContainer>
        <div className="task-detail-page">
          <Breadcrumbs />
          <div className="error-message">{error}</div>
          <Button to="/tasks" icon={<ArrowLeft />} variant="outline">
            Back to Tasks
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (!task) {
    return (
      <PageContainer>
        <div className="task-detail-page">
          <Breadcrumbs />
          <div className="error-message">Task not found</div>
          <Button to="/tasks" icon={<ArrowLeft />} variant="outline">
            Back to Tasks
          </Button>
        </div>
      </PageContainer>
    );
  }

  const nextStatus = getNextStatus(task.status);

  return (
    <PageContainer>
      <div className="task-detail-page">
        <Breadcrumbs />
        
        <div className="task-header">
          <Button to="/tasks" icon={<ArrowLeft />} variant="outline">
            Back to Tasks
          </Button>
          {isFieldOwner && (
            <Button to={`/tasks/${id}/edit`} icon={<Edit />} variant="success">
              Edit Task
            </Button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="task-content">
          <Card className="task-main">
            <div className="task-title-section">
              <h1>{task.title}</h1>
              <Badge variant={getStatusColor(task.status) as any} size="md">
                {task.status.replace('_', ' ')}
              </Badge>
            </div>

          {task.description && (
            <div className="task-description">
              <p>{task.description}</p>
            </div>
          )}

          <div className="task-info-grid">
            <div className="info-item">
              <MapPin className="info-icon" />
              <div>
                <label>Field</label>
                {field ? (
                  <Link to={`/fields/${field.id}`} className="field-link">
                    {field.name}
                  </Link>
                ) : (
                  <span>Loading...</span>
                )}
              </div>
            </div>

            <div className="info-item">
              <UserIcon className="info-icon" />
              <div>
                <label>Assigned To</label>
                {assignedUser ? (
                  <span>{assignedUser.firstName} {assignedUser.lastName} ({assignedUser.email})</span>
                ) : task.assignedTo ? (
                  <span>Loading...</span>
                ) : (
                  <span className="not-assigned">Not assigned</span>
                )}
              </div>
            </div>

            <div className="info-item">
              <Calendar className="info-icon" />
              <div>
                <label>Scheduled Start</label>
                <span>{formatDate(task.scheduledStart)}</span>
              </div>
            </div>

            <div className="info-item">
              <Calendar className="info-icon" />
              <div>
                <label>Scheduled End</label>
                <span>{formatDate(task.scheduledEnd)}</span>
              </div>
            </div>

            {task.actualStart && (
              <div className="info-item">
                <CheckCircle className="info-icon" />
                <div>
                  <label>Actual Start</label>
                  <span>{formatDate(task.actualStart)}</span>
                </div>
              </div>
            )}

            {task.actualEnd && (
              <div className="info-item">
                <CheckCircle className="info-icon" />
                <div>
                  <label>Actual End</label>
                  <span>{formatDate(task.actualEnd)}</span>
                </div>
              </div>
            )}

            <div className="info-item">
              <div>
                <label>Type</label>
                <span>{task.type}</span>
              </div>
            </div>

            <div className="info-item">
              <div>
                <label>Lifecycle Year</label>
                <span className="lifecycle-year">{task.lifecycleYear}</span>
              </div>
            </div>
          </div>

            {canEdit && (
              <div className="task-actions">
                {nextStatus && (
                  <Button
                    onClick={() => handleStatusUpdate(nextStatus)}
                    disabled={updatingStatus}
                    loading={updatingStatus}
                    variant={nextStatus === 'completed' ? 'success' : nextStatus === 'in_progress' ? 'secondary' : 'warning'}
                  >
                    Mark as {nextStatus.replace('_', ' ')}
                  </Button>
                )}

                {isFieldOwner && !task.assignedTo && (
                  <div className="assign-section">
                    <select
                      value={selectedProducerId}
                      onChange={(e) => setSelectedProducerId(e.target.value)}
                      className="producer-select"
                    >
                      <option value="">Select Producer</option>
                      {producers.map((producer) => (
                        <option key={producer.id} value={producer.id}>
                          {producer.firstName} {producer.lastName} ({producer.email})
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={handleAssign}
                      disabled={assigning || !selectedProducerId}
                      loading={assigning}
                      variant="primary"
                    >
                      Assign Task
                    </Button>
                  </div>
                )}

                {isFieldOwner && task.assignedTo && (
                  <div className="assign-section">
                    <select
                      value={selectedProducerId || task.assignedTo}
                      onChange={(e) => setSelectedProducerId(e.target.value)}
                      className="producer-select"
                    >
                      <option value={task.assignedTo}>
                        {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Current'}
                      </option>
                      {producers
                        .filter((p) => p.id !== task.assignedTo)
                        .map((producer) => (
                          <option key={producer.id} value={producer.id}>
                            {producer.firstName} {producer.lastName} ({producer.email})
                          </option>
                        ))}
                    </select>
                    <Button
                      onClick={handleAssign}
                      disabled={assigning || !selectedProducerId}
                      loading={assigning}
                      variant="primary"
                    >
                      Reassign Task
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>

          {canEdit && (
            <Card className="task-evidence">
              <EvidenceUpload
                taskId={id!}
                existingEvidence={task.evidence || []}
                onEvidenceAdded={loadTaskData}
              />
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default TaskDetailPage;
