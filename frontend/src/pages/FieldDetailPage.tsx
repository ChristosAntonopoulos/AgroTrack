import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFieldService } from '../services/serviceFactory';
import { getLifecycleService } from '../services/serviceFactory';
import { getTaskService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { Lifecycle } from '../services/lifecycleService';
import { Task } from '../services/taskService';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import LifecycleIndicator from '../components/Field/LifecycleIndicator';
import FieldMonitoring from '../components/Field/FieldMonitoring';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { RefreshCw, Play, Edit, ArrowLeft } from 'lucide-react';
import './FieldDetailPage.css';

const FieldDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [field, setField] = useState<Field | null>(null);
  const [lifecycle, setLifecycle] = useState<Lifecycle | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [showProgressConfirm, setShowProgressConfirm] = useState(false);

  useEffect(() => {
    if (id) {
      loadField();
      loadLifecycle();
      loadTasks();
    }
  }, [id]);

  const loadField = async () => {
    try {
      setLoading(true);
      const fieldService = getFieldService();
      const data = await fieldService.getField(id!);
      setField(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load field');
    } finally {
      setLoading(false);
    }
  };

  const loadLifecycle = async () => {
    try {
      const lifecycleService = getLifecycleService();
      const data = await lifecycleService.getLifecycle(id!);
      setLifecycle(data);
    } catch (err) {
      // Lifecycle might not exist yet, that's okay
      setLifecycle(null);
    }
  };

  const loadTasks = async () => {
    try {
      const taskService = getTaskService();
      const tasksData = await taskService.getTasks(id);
      setTasks(tasksData);
    } catch (err) {
      console.error('Error loading tasks:', err);
    }
  };

  const handleInitializeLifecycle = async () => {
    if (!id) return;

    try {
      setLifecycleLoading(true);
      const lifecycleService = getLifecycleService();
      const newLifecycle = await lifecycleService.initializeLifecycle(id);
      setLifecycle(newLifecycle);
      // Reload field to get updated lifecycle year
      await loadField();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize lifecycle');
    } finally {
      setLifecycleLoading(false);
    }
  };

  const handleProgressCycle = async () => {
    if (!id || !showProgressConfirm) return;

    try {
      setLifecycleLoading(true);
      const lifecycleService = getLifecycleService();
      const updatedLifecycle = await lifecycleService.progressCycle(id);
      setLifecycle(updatedLifecycle);
      setShowProgressConfirm(false);
      // Reload field to get updated lifecycle year
      await loadField();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to progress lifecycle');
    } finally {
      setLifecycleLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const isFieldOwner = user?.role === 'FieldOwner';

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (error || !field) {
    return (
      <PageContainer>
        <div className="error-container">
          <div className="error-message">{error || 'Field not found'}</div>
          <Button to="/fields" icon={<ArrowLeft />} variant="outline">
            Back to Fields
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="field-detail-page">
        <Breadcrumbs />
        <div className="field-detail-header">
          <div className="field-header-content">
            <h1>{field.name}</h1>
            <LifecycleIndicator year={field.currentLifecycleYear} />
          </div>
          <div className="field-actions">
            {(isFieldOwner || field.ownerId === user?.userId) && (
              <Button to={`/fields/${field.id}/edit`} icon={<Edit />} variant="success">
                Edit
              </Button>
            )}
            <Button to="/fields" icon={<ArrowLeft />} variant="outline">
              Back to Fields
            </Button>
          </div>
        </div>

        <div className="field-detail-content">
          <Card className="field-detail-section">
            <h2>Basic Information</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <strong>Area:</strong> {field.area} hectares
            </div>
            {field.variety && (
              <div className="detail-item">
                <strong>Variety:</strong> {field.variety}
              </div>
            )}
            {field.treeAge && (
              <div className="detail-item">
                <strong>Tree Age:</strong> {field.treeAge} years
              </div>
            )}
            {field.groundType && (
              <div className="detail-item">
                <strong>Ground Type:</strong> {field.groundType}
              </div>
            )}
            <div className="detail-item">
              <strong>Irrigation:</strong> {field.irrigationStatus ? 'Yes' : 'No'}
            </div>
          </div>
          </Card>

          {field.latitude && field.longitude && (
            <Card className="field-detail-section">
              <h2>Location</h2>
            <div className="detail-item">
              <strong>Coordinates:</strong> {field.latitude}, {field.longitude}
            </div>
            </Card>
          )}

          {tasks.length > 0 && (
            <FieldMonitoring tasks={tasks} />
          )}

          {isFieldOwner && (
            <Card className="field-detail-section">
              <h2>Lifecycle Management</h2>
              <div className="lifecycle-management">
                <div className="lifecycle-status">
                  <strong>Current Status:</strong>
                  <LifecycleIndicator year={field.currentLifecycleYear} />
                </div>

                {!lifecycle ? (
                  <div className="lifecycle-action">
                    <p>No lifecycle initialized for this field.</p>
                    <Button
                      onClick={handleInitializeLifecycle}
                      disabled={lifecycleLoading}
                      loading={lifecycleLoading}
                      icon={<Play />}
                      variant="primary"
                    >
                      Initialize Lifecycle
                    </Button>
                  </div>
                ) : (
                  <div className="lifecycle-info">
                    <div className="lifecycle-details">
                      <div className="detail-item">
                        <strong>Cycle Start Date:</strong> {formatDate(lifecycle.cycleStartDate)}
                      </div>
                      {lifecycle.lastProgressionDate && (
                        <div className="detail-item">
                          <strong>Last Progression:</strong> {formatDate(lifecycle.lastProgressionDate)}
                        </div>
                      )}
                    </div>

                    {!showProgressConfirm ? (
                      <Button
                        onClick={() => setShowProgressConfirm(true)}
                        disabled={lifecycleLoading}
                        icon={<RefreshCw />}
                        variant="secondary"
                      >
                        Progress to {field.currentLifecycleYear === 'low' ? 'High' : 'Low'} Year
                      </Button>
                    ) : (
                      <div className="progress-confirmation">
                        <p>
                          Are you sure you want to progress the lifecycle? This will change the field
                          from <strong>{field.currentLifecycleYear}</strong> year to{' '}
                          <strong>{field.currentLifecycleYear === 'low' ? 'high' : 'low'}</strong> year.
                          This action cannot be undone.
                        </p>
                        <div className="confirmation-buttons">
                          <Button
                            onClick={handleProgressCycle}
                            disabled={lifecycleLoading}
                            loading={lifecycleLoading}
                            variant="warning"
                          >
                            Yes, Progress Cycle
                          </Button>
                          <Button
                            onClick={() => setShowProgressConfirm(false)}
                            disabled={lifecycleLoading}
                            variant="outline"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default FieldDetailPage;
