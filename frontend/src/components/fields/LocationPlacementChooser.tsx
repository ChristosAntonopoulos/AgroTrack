import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Navigation, Clock } from 'lucide-react';

export type PlacementChoice = 'search' | 'myLocation' | 'later';

type Props = {
  onChoose: (choice: PlacementChoice) => void;
  locating?: boolean;
};

const LocationPlacementChooser: React.FC<Props> = ({ onChoose, locating = false }) => {
  const { t } = useTranslation('fields');

  const cards: Array<{
    id: PlacementChoice;
    icon: React.ReactNode;
    title: string;
    desc: string;
  }> = [
    {
      id: 'search',
      icon: <MapPin size={22} strokeWidth={1.85} aria-hidden />,
      title: t('createGrove.placement.searchTitle'),
      desc: t('createGrove.placement.searchDesc'),
    },
    {
      id: 'myLocation',
      icon: <Navigation size={22} strokeWidth={1.85} aria-hidden />,
      title: t('createGrove.placement.myLocationTitle'),
      desc: t('createGrove.placement.myLocationDesc'),
    },
    {
      id: 'later',
      icon: <Clock size={22} strokeWidth={1.85} aria-hidden />,
      title: t('createGrove.placement.laterTitle'),
      desc: t('createGrove.placement.laterDesc'),
    },
  ];

  return (
    <div className="field-form-panel location-placement-chooser">
      <h2>{t('createGrove.placement.title')}</h2>
      <p className="field-form-panel-desc">{t('createGrove.placement.subtitle')}</p>
      <div className="location-placement-grid">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className="location-placement-card"
            onClick={() => onChoose(card.id)}
            disabled={locating && card.id === 'myLocation'}
          >
            <span className="location-placement-icon">{card.icon}</span>
            <span className="location-placement-title">{card.title}</span>
            <span className="location-placement-desc">{card.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LocationPlacementChooser;
