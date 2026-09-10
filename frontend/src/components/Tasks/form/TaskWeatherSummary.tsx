import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FieldWeather } from '../../../services/geospatialService';
import type { TaskProposal } from '../../../services/fieldWorkService';
import {
  evaluateProposalWeather,
  proposalChips,
  weatherExplanationCopy,
} from '../../../utils/proposalPresentation';
import WeatherSuitabilityBadge from '../WeatherSuitabilityBadge';
import '../TaskProposalCard.css';

interface TaskWeatherSummaryProps {
  templateCode?: string;
  weather?: FieldWeather | null;
}

const TaskWeatherSummary: React.FC<TaskWeatherSummaryProps> = ({ templateCode, weather }) => {
  const { t, i18n } = useTranslation('tasks');
  const stub = { templateCode: templateCode || '' } as unknown as TaskProposal;
  const evaluated = evaluateProposalWeather(stub, weather);
  if (evaluated.kind === 'not_sensitive') return null;

  const chip = proposalChips(stub, evaluated.kind)[0];
  const copy = weatherExplanationCopy(evaluated.kind, evaluated.facts, i18n.language);
  const label =
    evaluated.kind === 'unknown'
      ? t('fieldWork.weather.unknown')
      : chip
        ? t(chip.labelKey)
        : t('fieldWork.weather.unknown');

  return (
    <div className="task-form-weather">
      {chip ? (
        <WeatherSuitabilityBadge chip={chip} label={label} headline={copy.headline} facts={copy.facts} />
      ) : (
        <p className="task-form-help">{copy.headline}</p>
      )}
      {copy.facts.length > 0 ? (
        <ul className="task-form-help">
          {copy.facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      ) : copy.headline ? (
        <p className="task-form-help">{copy.headline}</p>
      ) : null}
    </div>
  );
};

export default TaskWeatherSummary;
