import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getFieldService } from '../../services/serviceFactory';
import { GreekCadastreInfo, ImportGreekCadastreFieldResponse } from '../../services/fieldService';
import GreekCadastreInfoCard from './GreekCadastreInfoCard';
import LoadingSpinner from '../Common/LoadingSpinner';

interface Props {
  onImported: (response: ImportGreekCadastreFieldResponse) => void;
  parsedCadastre?: GreekCadastreInfo;
}

const CadastreUploadStep: React.FC<Props> = ({ onImported, parsedCadastre }) => {
  const { t } = useTranslation('fields');
  const [kdFile, setKdFile] = useState<File | null>(null);
  const [kfFile, setKfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const handleUpload = async () => {
    if (!kdFile || !kfFile) {
      setError(t('addField.cadastre.bothRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getFieldService().importGreekCadastre(kdFile, kfFile);
      setWarnings(response.warnings);
      onImported(response);
    } catch {
      setError(t('addField.cadastre.uploadFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="field-form-panel">
      <h2>{t('addField.cadastre.title')}</h2>
      <p className="field-form-panel-desc">{t('addField.cadastre.helper')}</p>
      <div className="cadastre-warning-banner">{t('addField.cadastre.disclaimer')}</div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="kdFile">{t('addField.cadastre.kdLabel')}</label>
          <input type="file" id="kdFile" accept=".pdf" onChange={(e) => setKdFile(e.target.files?.[0] || null)} />
        </div>
        <div className="form-group">
          <label htmlFor="kfFile">{t('addField.cadastre.kfLabel')}</label>
          <input type="file" id="kfFile" accept=".pdf" onChange={(e) => setKfFile(e.target.files?.[0] || null)} />
        </div>
      </div>

      {error && <div className="field-form-error">{error}</div>}
      {warnings.length > 0 && (
        <ul className="cadastre-warnings-list">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {parsedCadastre && <GreekCadastreInfoCard cadastre={parsedCadastre} />}

      <button type="button" className="btn btn-primary" onClick={handleUpload} disabled={loading || !kdFile || !kfFile}>
        {loading ? <LoadingSpinner size="sm" /> : t('addField.cadastre.upload')}
      </button>
    </div>
  );
};

export default CadastreUploadStep;
