import React, { useState, useRef } from 'react';
import { getTaskService } from '../../services/serviceFactory';
import { Evidence } from '../../services/taskService';
import { Upload, X, Image } from 'lucide-react';
import './EvidenceUpload.css';

interface EvidenceUploadProps {
  taskId: string;
  existingEvidence: Evidence[];
  onEvidenceAdded: () => void;
}

const EvidenceUpload: React.FC<EvidenceUploadProps> = ({
  taskId,
  existingEvidence,
  onEvidenceAdded,
}) => {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size must be less than 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      setPhotoFile(file);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUpload = async () => {
    if (!photoFile && !notes.trim()) {
      setError('Please add a photo or notes');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      let photoUrl: string | undefined;
      if (photoFile) {
        // Convert to base64 for MVP
        photoUrl = await convertFileToBase64(photoFile);
      }

      const taskService = getTaskService();
      await taskService.addEvidence(taskId, photoUrl, notes.trim() || undefined);
      
      // Reset form
      setPhotoFile(null);
      setPhotoPreview(null);
      setNotes('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      onEvidenceAdded();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload evidence');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="evidence-upload">
      <h3>Add Evidence</h3>
      
      <div className="evidence-form">
        <div className="photo-upload-section">
          <label className="upload-label">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="file-input"
            />
            <div className="upload-button">
              <Upload />
              <span>{photoFile ? 'Change Photo' : 'Select Photo'}</span>
            </div>
          </label>
          
          {photoPreview && (
            <div className="photo-preview">
              <img src={photoPreview} alt="Preview" />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="remove-photo-btn"
                aria-label="Remove photo"
              >
                <X />
              </button>
            </div>
          )}
        </div>

        <div className="notes-section">
          <label htmlFor="evidence-notes">Notes</label>
          <textarea
            id="evidence-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this evidence..."
            rows={4}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || (!photoFile && !notes.trim())}
          className="upload-evidence-btn"
        >
          {uploading ? 'Uploading...' : 'Upload Evidence'}
        </button>
      </div>

      {existingEvidence.length > 0 && (
        <div className="existing-evidence">
          <h4>Existing Evidence</h4>
          <div className="evidence-gallery">
            {existingEvidence.map((evidence, index) => (
              <div key={index} className="evidence-item">
                {evidence.photoUrl && (
                  <div className="evidence-photo">
                    <img src={evidence.photoUrl} alt={`Evidence ${index + 1}`} />
                  </div>
                )}
                {evidence.notes && (
                  <div className="evidence-notes">
                    <p>{evidence.notes}</p>
                  </div>
                )}
                <div className="evidence-timestamp">
                  {new Date(evidence.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceUpload;
