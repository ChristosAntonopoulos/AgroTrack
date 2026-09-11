import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FieldTask } from '../../services/fieldWorkService';
import type { HarvestRecord } from '../../services/harvestService';

type Props = {
  fieldId: string;
  tasks: FieldTask[];
  harvests: HarvestRecord[];
  taskId: string;
  harvestId: string;
  onTaskChange: (id: string) => void;
  onHarvestChange: (id: string) => void;
  preselectedLabel?: string;
};

const RelatedRecordSelector: React.FC<Props> = ({
  fieldId,
  tasks,
  harvests,
  taskId,
  harvestId,
  onTaskChange,
  onHarvestChange,
  preselectedLabel,
}) => {
  const { t } = useTranslation('capture');
  const [picking, setPicking] = useState<'task' | 'harvest' | null>(
    taskId || harvestId ? (taskId ? 'task' : 'harvest') : null
  );

  useEffect(() => {
    if (taskId) setPicking('task');
    else if (harvestId) setPicking('harvest');
  }, [taskId, harvestId]);

  if (!fieldId) return null;
  const suggestion = tasks[0];
  const noLink = !taskId && !harvestId && picking === null;

  return (
    <div>
      <div className="money-form-label">{t('money.linkTaskOrHarvest')}</div>
      {preselectedLabel ? (
        <p className="money-summary-note">
          {t('money.linkedTo')}: {preselectedLabel}
        </p>
      ) : null}
      {suggestion && !taskId && !harvestId ? (
        <div className="money-trust-strip">
          <span>
            {t('money.possibleLink')} · {suggestion.title}
          </span>
          <button
            type="button"
            onClick={() => {
              setPicking('task');
              onHarvestChange('');
              onTaskChange(suggestion.id);
            }}
          >
            {t('money.connect')}
          </button>
        </div>
      ) : null}
      <div className="money-date-quick" role="group" aria-label={t('money.linkTaskOrHarvest')}>
        <button
          type="button"
          className={`money-chip${picking === 'task' || Boolean(taskId) ? ' is-active' : ''}`}
          aria-pressed={picking === 'task' || Boolean(taskId)}
          onClick={() => {
            setPicking('task');
            onHarvestChange('');
          }}
        >
          {t('money.pickTask')}
        </button>
        <button
          type="button"
          className={`money-chip${picking === 'harvest' || Boolean(harvestId) ? ' is-active' : ''}`}
          aria-pressed={picking === 'harvest' || Boolean(harvestId)}
          onClick={() => {
            setPicking('harvest');
            onTaskChange('');
          }}
        >
          {t('money.pickHarvest')}
        </button>
        <button
          type="button"
          className={`money-chip${noLink ? ' is-active' : ''}`}
          aria-pressed={noLink}
          onClick={() => {
            onTaskChange('');
            onHarvestChange('');
            setPicking(null);
          }}
        >
          {t('money.noLink')}
        </button>
      </div>
      {picking === 'task' ? (
        <label className="money-form-label" style={{ marginTop: 12 }}>
          {t('money.relatedTask')}
          <select
            value={taskId}
            onChange={(e) => onTaskChange(e.target.value)}
            aria-label={t('money.relatedTask')}
          >
            <option value="">{t('money.none')}</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
            {taskId && !tasks.some((task) => task.id === taskId) ? (
              <option value={taskId}>{taskId}</option>
            ) : null}
          </select>
        </label>
      ) : null}
      {picking === 'harvest' ? (
        <label className="money-form-label" style={{ marginTop: 12 }}>
          {t('money.relatedHarvest')}
          <select
            value={harvestId}
            onChange={(e) => onHarvestChange(e.target.value)}
            aria-label={t('money.relatedHarvest')}
          >
            <option value="">{t('money.none')}</option>
            {harvests.map((harvest) => (
              <option key={harvest.id} value={harvest.id}>
                {harvest.harvestDate.slice(0, 10)}
                {harvest.millName ? ` · ${harvest.millName}` : ''}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
};

export default RelatedRecordSelector;
