import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTaskService } from '../services/serviceFactory';
import { getFieldService } from '../services/serviceFactory';
import { getUserService } from '../services/serviceFactory';
import { CreateTaskDto } from '../services/taskService';
import { Field } from '../services/fieldService';
import { User } from '../services/userService';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import { ArrowLeft, Save } from 'lucide-react';
import './TaskFormPage.css';

const TaskFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!id;

  const [fields, setFields] = useState<Field[]>([]);
  const [producers, setProducers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateTaskDto>({
    fieldId: '',
    type: '',
    title: '',
    description: '',
    lifecycleYear: 'low',
    assignedTo: '',
    scheduledStart: '',
    scheduledEnd: '',
  });

  useEffect(() => {
    if (user?.role === 'FieldOwner') {
      loadFields();
      loadProducers();
    }

    if (isEditMode && id) {
      loadTask();
    }
  }, [id, user]);

  const loadFields = async () => {
    try {
      const fieldService = getFieldService();
      const fieldsData = await fieldService.getFields();
      setFields(fieldsData);
    } catch (err: any) {
      setError('Failed to load fields');
    }
  };

  const loadProducers = async () => {
    try {
      const userService = getUserService();
      const producersData = await userService.getUsers('Producer');
      setProducers(producersData);
    } catch (err: any) {
      console.error('Error loading producers:', err);
    }
  };

  const loadTask = async () => {
    try {
      setLoading(true);
      const taskService = getTaskService();
      const task = await taskService.getTask(id!);
      
      // Find the field to get lifecycle year
      const field = fields.find((f) => f.id === task.fieldId);
      const lifecycleYear = field?.currentLifecycleYear || task.lifecycleYear;

      setFormData({
        fieldId: task.fieldId,
        type: task.type,
        title: task.title,
        description: task.description || '',
        lifecycleYear: lifecycleYear,
        assignedTo: task.assignedTo || '',
        scheduledStart: task.scheduledStart || '',
        scheduledEnd: task.scheduledEnd || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId: string) => {
    const selectedField = fields.find((f) => f.id === fieldId);
    setFormData({
      ...formData,
      fieldId,
      lifecycleYear: selectedField?.currentLifecycleYear || 'low',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.fieldId || !formData.title) {
      setError('Field and Title are required');
      return;
    }

    try {
      setLoading(true);

      const submitData: CreateTaskDto = {
        ...formData,
        assignedTo: formData.assignedTo || undefined,
        scheduledStart: formData.scheduledStart || undefined,
        scheduledEnd: formData.scheduledEnd || undefined,
      };

      if (isEditMode) {
        // For now, we'll just create - edit functionality can be added later
        setError('Edit functionality not yet implemented');
        return;
      } else {
        const taskService = getTaskService();
        await taskService.createTask(submitData);
        navigate('/tasks');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (user?.role !== 'FieldOwner') {
    return (
      <PageContainer>
        <div className="task-form-page">
          <Breadcrumbs />
          <div className="error-message">You do not have permission to create tasks.</div>
          <Button to="/tasks" icon={<ArrowLeft />} variant="outline">
            Back to Tasks
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="task-form-page">
        <Breadcrumbs />
        
        <div className="form-header">
          <Button to="/tasks" icon={<ArrowLeft />} variant="outline">
            Back to Tasks
          </Button>
          <h1>{isEditMode ? 'Edit Task' : 'Create New Task'}</h1>
        </div>

        {error && <div className="error-message">{error}</div>}

        <Card>
          <form onSubmit={handleSubmit} className="task-form">
        <div className="form-group">
          <label htmlFor="fieldId">
            Field <span className="required">*</span>
          </label>
          <select
            id="fieldId"
            name="fieldId"
            value={formData.fieldId}
            onChange={(e) => handleFieldChange(e.target.value)}
            required
            disabled={isEditMode}
          >
            <option value="">Select a field</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name} ({field.currentLifecycleYear} year)
              </option>
            ))}
          </select>
          {formData.fieldId && (
            <p className="field-hint">
              Lifecycle year will be set to: <strong>{formData.lifecycleYear}</strong>
            </p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="type">
            Task Type <span className="required">*</span>
          </label>
          <input
            type="text"
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
            placeholder="e.g., Pruning, Harvesting, Fertilization"
          />
        </div>

        <div className="form-group">
          <label htmlFor="title">
            Title <span className="required">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Enter task title"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="Enter task description (optional)"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="scheduledStart">Scheduled Start</label>
            <input
              type="datetime-local"
              id="scheduledStart"
              name="scheduledStart"
              value={formData.scheduledStart}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="scheduledEnd">Scheduled End</label>
            <input
              type="datetime-local"
              id="scheduledEnd"
              name="scheduledEnd"
              value={formData.scheduledEnd}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="assignedTo">Assign To (Producer)</label>
          <select
            id="assignedTo"
            name="assignedTo"
            value={formData.assignedTo}
            onChange={handleChange}
          >
            <option value="">Not assigned</option>
            {producers.map((producer) => (
              <option key={producer.id} value={producer.id}>
                {producer.firstName} {producer.lastName} ({producer.email})
              </option>
            ))}
          </select>
        </div>

            <div className="form-actions">
              <Button type="submit" disabled={loading} loading={loading} icon={<Save />}>
                {isEditMode ? 'Update Task' : 'Create Task'}
              </Button>
              <Button to="/tasks" variant="outline">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
};

export default TaskFormPage;
