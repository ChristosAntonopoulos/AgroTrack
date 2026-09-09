import React from 'react';
import { X } from 'lucide-react';
import './DataSourceInfoModal.css';

export interface DataSourceInfo {
  title: string;
  source: string;
  sourceUrl?: string;
  attribution?: string;
  licence?: string;
  spatialResolution?: string;
  temporalResolution?: string;
  valueType?: string;
  sourceDate?: string;
  lastUpdatedAt?: string;
  calculation?: string;
  note?: string;
}

interface Props {
  info: DataSourceInfo;
  onClose: () => void;
}

const formatDate = (value?: string): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const valueTypeLabel = (valueType?: string): string | undefined => {
  switch (valueType) {
    case 'measured':
      return 'Measured';
    case 'modelled':
      return 'Modelled';
    case 'satellite derived':
      return 'Satellite derived';
    case 'derived':
      return 'Derived by Oleachron';
    default:
      return valueType;
  }
};

/**
 * Shows provenance for any derived metric so the farmer can judge how much
 * detail a value actually carries.
 */
const DataSourceInfoModal: React.FC<Props> = ({ info, onClose }) => {
  const rows: Array<[string, string | undefined]> = [
    ['Source', info.source],
    ['Source resolution', info.spatialResolution],
    ['Update frequency', info.temporalResolution],
    ['Type', valueTypeLabel(info.valueType)],
    ['Calculation', info.calculation],
    ['Observed', formatDate(info.sourceDate)],
    ['Last updated', formatDate(info.lastUpdatedAt)],
    ['Licence', info.licence],
  ];

  return (
    <div className="ds-info-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ds-info-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${info.title} data source`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ds-info-header">
          <h4>{info.title}</h4>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={16} aria-hidden />
          </button>
        </div>
        <dl className="ds-info-body">
          {rows
            .filter(([, value]) => !!value)
            .map(([label, value]) => (
              <div key={label} className="ds-info-row">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
        {info.note && <p className="ds-info-note">{info.note}</p>}
        {info.attribution && <p className="ds-info-attribution">{info.attribution}</p>}
        {info.sourceUrl && (
          <a className="ds-info-link" href={info.sourceUrl} target="_blank" rel="noreferrer">
            Provider information
          </a>
        )}
      </div>
    </div>
  );
};

export default DataSourceInfoModal;
