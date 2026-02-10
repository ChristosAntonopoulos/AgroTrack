import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getFieldService } from '../services/serviceFactory';
import { CreateFieldDto, UpdateFieldDto, Field } from '../services/fieldService';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import './FieldFormPage.css';

const FieldFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState<CreateFieldDto>({
    name: '',
    latitude: undefined,
    longitude: undefined,
    area: 0,
    variety: '',
    treeAge: undefined,
    groundType: '',
    irrigationStatus: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && id) {
      loadField();
    }
  }, [id, isEdit]);

  const loadField = async () => {
    try {
      setLoading(true);
      const fieldService = getFieldService();
      const field = await fieldService.getField(id!);
      setFormData({
        name: field.name,
        latitude: field.latitude,
        longitude: field.longitude,
        area: field.area,
        variety: field.variety || '',
        treeAge: field.treeAge,
        groundType: field.groundType || '',
        irrigationStatus: field.irrigationStatus,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load field');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const fieldService = getFieldService();
      if (isEdit && id) {
        const updateData: UpdateFieldDto = {
          name: formData.name,
          latitude: formData.latitude,
          longitude: formData.longitude,
          area: formData.area,
          variety: formData.variety,
          treeAge: formData.treeAge,
          groundType: formData.groundType,
          irrigationStatus: formData.irrigationStatus,
        };
        await fieldService.updateField(id, updateData);
      } else {
        await fieldService.createField(formData);
      }
      navigate('/fields');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save field');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? (value ? parseFloat(value) : undefined) : value,
    }));
  };

  if (loading && isEdit) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <PageContainer>
      <div className="field-form-page">
        <Breadcrumbs />
        <h1>{isEdit ? 'Edit Field' : 'Create New Field'}</h1>
        {error && <div className="error-message">{error}</div>}
        <Card>
          <form onSubmit={handleSubmit} className="field-form">
        <div className="form-group">
          <label htmlFor="name">Field Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="latitude">Latitude</label>
            <input
              type="number"
              id="latitude"
              name="latitude"
              step="any"
              value={formData.latitude || ''}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="longitude">Longitude</label>
            <input
              type="number"
              id="longitude"
              name="longitude"
              step="any"
              value={formData.longitude || ''}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="area">Area (hectares) *</label>
          <input
            type="number"
            id="area"
            name="area"
            step="0.01"
            min="0"
            value={formData.area}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="variety">Olive Variety</label>
          <input
            type="text"
            id="variety"
            name="variety"
            value={formData.variety}
            onChange={handleChange}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="treeAge">Tree Age (years)</label>
          <input
            type="number"
            id="treeAge"
            name="treeAge"
            min="0"
            value={formData.treeAge || ''}
            onChange={handleChange}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="groundType">Ground Type</label>
          <input
            type="text"
            id="groundType"
            name="groundType"
            value={formData.groundType}
            onChange={handleChange}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              name="irrigationStatus"
              checked={formData.irrigationStatus}
              onChange={handleChange}
              disabled={loading}
            />
            Has Irrigation
          </label>
        </div>

            <div className="form-actions">
              <Button type="button" onClick={() => navigate('/fields')} disabled={loading} variant="outline">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} loading={loading}>
                {isEdit ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
};

export default FieldFormPage;
