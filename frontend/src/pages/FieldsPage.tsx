import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFieldService } from '../services/serviceFactory';
import { getTaskService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import LifecycleIndicator from '../components/Field/LifecycleIndicator';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import Badge from '../components/Common/Badge';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import EmptyState from '../components/Common/EmptyState';
import { CheckCircle, Clock, AlertCircle, Plus, Layers } from 'lucide-react';
import './FieldsPage.css';

const FieldsPage: React.FC = () => {
  const { user } = useAuth();
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldTasks, setFieldTasks] = useState<Map<string, Task[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFields();
  }, []);

  useEffect(() => {
    if (fields.length > 0) {
      loadFieldTasks();
    }
  }, [fields]);

  const loadFields = async () => {
    try {
      setLoading(true);
      const fieldService = getFieldService();
      const data = await fieldService.getFields();
      setFields(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load fields');
    } finally {
      setLoading(false);
    }
  };

  const loadFieldTasks = async () => {
    try {
      const taskService = getTaskService();
      const tasksMap = new Map<string, Task[]>();
      
      for (const field of fields) {
        const tasks = await taskService.getTasks(field.id);
        tasksMap.set(field.id, tasks);
      }
      
      setFieldTasks(tasksMap);
    } catch (err) {
      console.error('Error loading field tasks:', err);
    }
  };

  const getFieldTaskStats = (fieldId: string) => {
    const tasks = fieldTasks.get(fieldId) || [];
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
    };
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this field?')) {
      try {
        const fieldService = getFieldService();
        await fieldService.deleteField(id);
        await loadFields();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete field');
      }
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <PageContainer>
      <div className="fields-page">
        <Breadcrumbs />
        <div className="fields-header">
          <div>
            <h1>Fields</h1>
            <p className="fields-subtitle">Manage your olive fields</p>
          </div>
          <Button to="/fields/new" icon={<Plus />}>
            Create New Field
          </Button>
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        {fields.length === 0 ? (
          <EmptyState
            icon={<Layers size={64} />}
            title="No fields found"
            description="Create your first field to start managing your olive grove"
            action={
              <Button to="/fields/new" icon={<Plus />}>
                Create New Field
              </Button>
            }
          />
        ) : (
          <div className="fields-grid">
            {fields.map((field) => {
              const stats = getFieldTaskStats(field.id);
              const isOwner = field.ownerId === user?.userId;
              
              return (
                <Card key={field.id} hover className="field-card">
                  <div className="field-card-header">
                    <h3>{field.name}</h3>
                    {!isOwner && <Badge variant="info">Assigned</Badge>}
                  </div>
                  <div className="field-details">
                    <p><strong>Area:</strong> {field.area} hectares</p>
                    {field.variety && <p><strong>Variety:</strong> {field.variety}</p>}
                    <div className="field-lifecycle">
                      <LifecycleIndicator year={field.currentLifecycleYear} />
                    </div>
                    {field.irrigationStatus && <p><strong>Irrigation:</strong> Yes</p>}
                  </div>
                  {stats.total > 0 && (
                    <div className="field-monitoring">
                      <div className="monitoring-stats">
                        <div className="stat-item">
                          <CheckCircle className="stat-icon completed" />
                          <span>{stats.completed}</span>
                        </div>
                        <div className="stat-item">
                          <Clock className="stat-icon in-progress" />
                          <span>{stats.inProgress}</span>
                        </div>
                        <div className="stat-item">
                          <AlertCircle className="stat-icon pending" />
                          <span>{stats.pending}</span>
                        </div>
                      </div>
                      <div className="monitoring-total">
                        <strong>{stats.total}</strong> tasks
                      </div>
                    </div>
                  )}
                  <div className="field-actions">
                    <Button to={`/fields/${field.id}`} variant="primary" size="sm">
                      View
                    </Button>
                    {isOwner && (
                      <>
                        <Button to={`/fields/${field.id}/edit`} variant="success" size="sm">
                          Edit
                        </Button>
                        <Button onClick={() => handleDelete(field.id)} variant="error" size="sm">
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default FieldsPage;
