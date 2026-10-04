import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';
import './MapExploreCue.css';

/** Quiet top-left caption while the grower looks at the map on their own. */
const MapExploreCue: React.FC = () => {
  const { t } = useTranslation('onboarding');
  const activation = useOwnerActivationOptional();

  if (!activation || activation.navCoachPhase !== 'linger') return null;
  if (activation.awaitingFirstObservation || activation.completion.firstObservation) return null;

  return (
    <aside className="map-explore-cue" role="status">
      <p className="map-explore-cue-line">{t('mapExplore.caption')}</p>
      <button type="button" className="map-explore-cue-cta" onClick={activation.continueToHistory}>
        {t('mapExplore.cta')}
      </button>
    </aside>
  );
};

export default MapExploreCue;
