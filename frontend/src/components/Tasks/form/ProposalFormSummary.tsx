import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FieldWeather } from '../../../services/geospatialService';
import type { TaskProposal } from '../../../services/fieldWorkService';
import {
  evaluateProposalWeather,
  formatRecommendedPeriod,
  proposalExplanation,
  weatherExplanationCopy,
} from '../../../utils/proposalPresentation';

interface ProposalFormSummaryProps {
  proposal: TaskProposal;
  weather?: FieldWeather | null;
}

const ProposalFormSummary: React.FC<ProposalFormSummaryProps> = ({ proposal, weather }) => {
  const { t, i18n } = useTranslation('tasks');
  const period = formatRecommendedPeriod(proposal, i18n.language);
  const evaluated = evaluateProposalWeather(proposal, weather);
  const weatherCopy = weatherExplanationCopy(evaluated.kind, evaluated.facts, i18n.language);

  return (
    <aside className="task-proposal-summary" aria-label={t('fieldWork.form.proposalSummary')}>
      <p>
        <strong>{t('fieldWork.form.whyProposed')}</strong>
        {proposalExplanation(proposal, i18n.language)}
      </p>
      {period ? (
        <p>
          <strong>{t('fieldWork.form.recommendedWindow')}</strong>
          {period}
        </p>
      ) : null}
      <p>
        <strong>{t('fieldWork.form.weather')}</strong>
        {evaluated.kind === 'unknown'
          ? t('fieldWork.weather.unknown')
          : weatherCopy.headline || weatherCopy.facts.join(' · ') || t('fieldWork.form.weatherLater')}
      </p>
    </aside>
  );
};

export default ProposalFormSummary;
