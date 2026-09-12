import React from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import type { FieldTask } from '../../services/fieldWorkService';
import { resolveWeatherKind } from '../../utils/taskWeather';

interface WeatherRescheduleNudgeProps {
  task: FieldTask;
  suggestedDate?: string;
  onMove: () => void;
  onKeep: () => void;
}

/** Non-mutating weather prompt — never auto-moves the task. */
const WeatherRescheduleNudge: React.FC<WeatherRescheduleNudgeProps> = ({
  task,
  suggestedDate,
  onMove,
  onKeep,
}) => {
  const { t } = useTranslation('tasks');
  const kind = resolveWeatherKind(task.weatherSuitability);
  if (kind !== 'caution' && kind !== 'unsuitable') return null;

  return (
    <aside className="tasks-weather-nudge" role="status">
      <strong>{t('fieldWork.weatherNudge.title')}</strong>
      <p>{t('fieldWork.weatherNudge.body')}</p>
      {suggestedDate ? (
        <p>{t('fieldWork.reschedule.suggested', { date: suggestedDate })}</p>
      ) : null}
      <div className="tasks-weather-nudge-actions">
        <Button variant="primary" size="lg" onClick={onMove}>
          {t('fieldWork.reschedule.moveToSuggested')}
        </Button>
        <Button variant="outline" size="lg" onClick={onKeep}>
          {t('fieldWork.reschedule.keep')}
        </Button>
      </div>
    </aside>
  );
};

export default WeatherRescheduleNudge;
