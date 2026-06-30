import React from 'react';
import { useTranslation } from 'react-i18next';
import { Map, FileText, Hash } from 'lucide-react';
import { AddFieldMethod } from '../../services/fieldService';
import './AddFieldWizard.css';

interface Props {
  method: AddFieldMethod | null;
  onSelect: (method: AddFieldMethod) => void;
}

const AddFieldMethodStep: React.FC<Props> = ({ method, onSelect }) => {
  const { t } = useTranslation('fields');

  const cards: { id: AddFieldMethod; icon: React.ReactNode; title: string; desc: string }[] = [
    {
      id: 'draw',
      icon: <Map size={28} />,
      title: t('addField.methods.draw.title'),
      desc: t('addField.methods.draw.desc'),
    },
    {
      id: 'cadastre',
      icon: <FileText size={28} />,
      title: t('addField.methods.cadastre.title'),
      desc: t('addField.methods.cadastre.desc'),
    },
    {
      id: 'kaek',
      icon: <Hash size={28} />,
      title: t('addField.methods.kaek.title'),
      desc: t('addField.methods.kaek.desc'),
    },
  ];

  return (
    <div className="add-field-method-step">
      <h2>{t('addField.methods.title')}</h2>
      <p className="field-form-panel-desc">{t('addField.methods.subtitle')}</p>
      <div className="add-field-method-grid">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className={`add-field-method-card ${method === card.id ? 'active' : ''}`}
            onClick={() => onSelect(card.id)}
          >
            <div className="add-field-method-icon">{card.icon}</div>
            <strong>{card.title}</strong>
            <p>{card.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AddFieldMethodStep;
