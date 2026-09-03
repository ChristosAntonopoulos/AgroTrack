import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Flame, Snowflake, Sun, Leaf, ClipboardList } from 'lucide-react';
import { FieldEnvironmentalAlert, geospatialService } from '../../services/geospatialService';
import './FieldAlertList.css';

interface Props {
  fieldId: string;
}

const ICONS: Record<string, React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  frost: Snowflake,
  heat: Sun,
  fireproximity: Flame,
  vegetationchange: Leaf,
  taskwarning: ClipboardList,
};

/** Alert types the farmer must not miss are ordered above the advisory ones. */
const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * Active environmental and task warnings for a field.
 *
 * Warnings are advisory: each one names the condition and its confidence so the
 * grower can weigh a modelled forecast against what they see on the ground. They
 * never block work.
 */
const FieldAlertList: React.FC<Props> = ({ fieldId }) => {
  const { t } = useTranslation(['fields']);
  const [alerts, setAlerts] = useState<FieldEnvironmentalAlert[]>([]);

  const load = useCallback(async () => {
    try {
      setAlerts(await geospatialService.getAlerts(fieldId));
    } catch {
      // Alerts are supplementary; the rest of the field page still stands without them.
      setAlerts([]);
    }
  }, [fieldId]);

  useEffect(() => {
    load();
  }, [load]);

  if (alerts.length === 0) return null;

  const sorted = [...alerts].sort(
    (a, b) => (SEVERITY_RANK[a.severity?.toLowerCase()] ?? 9) - (SEVERITY_RANK[b.severity?.toLowerCase()] ?? 9),
  );

  return (
    <div className="field-alerts" role="region" aria-label={t('fields:alerts.title')}>
      {sorted.map((alert) => {
        const severity = (alert.severity ?? 'medium').toLowerCase();
        const Icon = ICONS[(alert.alertType ?? '').toLowerCase()] ?? AlertTriangle;

        return (
          <article className={`field-alert field-alert--${severity}`} key={alert.id}>
            <span className="field-alert-icon">
              <Icon size={16} aria-hidden />
            </span>
            <div className="field-alert-body">
              <h4>{alert.title}</h4>
              <p>{alert.message}</p>
              <span className="field-alert-confidence">
                {t(`fields:alerts.confidence.${(alert.confidence ?? '').toLowerCase()}`, {
                  defaultValue: alert.confidence,
                })}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default FieldAlertList;
