import React, { useState, useRef } from 'react';
import { getTaskService, isMockMode } from '../../services/serviceFactory';
import { fileUploadService } from '../../services/fileUploadService';
import { Evidence } from '../../services/taskService';
import { getApiErrorMessage } from '../../utils/translateApiError';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import { Upload, X } from 'lucide-react';
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
  const { t } = useTranslation(['tasks', 'errors']);
  const { formatDateTime } = useLocaleFormatters();
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
        setError(t('tasks:evidence.tooLarge'));
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError(t('tasks:evidence.notImage'));
        return;
      }
      setPhotoFile(file);
      setError(null);

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
      setError(t('tasks:evidence.needContent'));
      return;
    }

    try {
      setUploading(true);
      setError(null);

      let photoUrl: string | undefined;
      if (photoFile) {
        photoUrl = isMockMode()
          ? await convertFileToBase64(photoFile)
          : await fileUploadService.uploadFile(photoFile);
      }

      const taskService = getTaskService();
      await taskService.addEvidence(taskId, photoUrl, notes.trim() || undefined, 'general');

      setPhotoFile(null);
      setPhotoPreview(null);
      setNotes('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onEvidenceAdded();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('tasks:evidence.failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="evidence-upload">
      <h3>{t('tasks:evidence.add')}</h3>

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
              <span>{photoFile ? t('tasks:evidence.changePhoto') : t('tasks:evidence.selectPhoto')}</span>
            </div>
          </label>

          {photoPreview && (
            <div className="photo-preview">
              <img src={photoPreview} alt="" />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="remove-photo-btn"
                aria-label={t('tasks:evidence.removePhoto')}
              >
                <X />
              </button>
            </div>
          )}
        </div>

        <div className="notes-section">
          <label htmlFor="evidence-notes">{t('tasks:evidence.notes')}</label>
          <textarea
            id="evidence-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('tasks:evidence.notesPlaceholder')}
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
          {uploading ? t('tasks:evidence.uploading') : t('tasks:evidence.upload')}
        </button>
      </div>

      {existingEvidence.length > 0 && (
        <div className="existing-evidence">
          <h4>{t('tasks:evidence.existing')}</h4>
          <div className="evidence-gallery">
            {existingEvidence.map((evidence, index) => (
              <div key={index} className="evidence-item">
                {evidence.photoUrl && (
                  <div className="evidence-photo">
                    <img src={evidence.photoUrl} alt="" />
                  </div>
                )}
                {evidence.notes && (
                  <div className="evidence-notes">
                    <p>{evidence.notes}</p>
                  </div>
                )}
                <div className="evidence-timestamp">{formatDateTime(evidence.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceUpload;
