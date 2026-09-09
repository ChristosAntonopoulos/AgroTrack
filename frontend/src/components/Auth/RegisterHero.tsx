import React from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, MapPin, CalendarDays, Check } from 'lucide-react';
import './RegisterHero.css';

const RegisterHero: React.FC = () => {
  const { t } = useTranslation('auth');

  const steps = [
    { icon: UserPlus, text: t('register.stepAccount') },
    { icon: MapPin, text: t('register.stepFields') },
    { icon: CalendarDays, text: t('register.stepSeason') },
  ];

  const benefits = [
    t('register.benefitPlanning'),
    t('register.benefitMonitoring'),
    t('register.benefitCollaboration'),
  ];

  return (
    <div className="register-hero">
      <div className="register-hero-copy">
        <h1>{t('register.heroTitle')}</h1>
        <p>{t('register.heroSubtitle')}</p>
      </div>

      <ol className="register-hero-steps">
        {steps.map(({ icon: Icon, text }, index) => (
          <li key={text}>
            <span className="register-hero-step-num" aria-hidden>
              {index + 1}
            </span>
            <Icon size={18} aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ol>

      <div className="register-hero-panel">
        <p className="register-hero-panel-label">{t('register.includedTitle')}</p>
        <ul className="register-hero-benefits">
          {benefits.map((text) => (
            <li key={text}>
              <Check size={16} aria-hidden />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RegisterHero;
