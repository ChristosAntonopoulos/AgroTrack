import React from 'react';
import { useTranslation } from 'react-i18next';
import { History, Wallet, BookOpen } from 'lucide-react';
import './LoginHero.css';

const LoginHero: React.FC = () => {
  const { t } = useTranslation('auth');

  const features = [
    {
      icon: History,
      title: t('login.featureTimelineTitle'),
      text: t('login.featureTimelineText'),
      prominent: true,
    },
    {
      icon: Wallet,
      title: t('login.featureCostsTitle'),
      text: t('login.featureCostsText'),
    },
    {
      icon: BookOpen,
      title: t('login.featureKnowledgeTitle'),
      text: t('login.featureKnowledgeText'),
    },
  ];

  return (
    <div className="login-hero">
      <p className="login-hero-eyebrow">{t('login.heroEyebrow')}</p>

      <div className="login-hero-copy">
        <h1>{t('login.heroTitle')}</h1>
        <p>{t('login.heroSubtitle')}</p>
      </div>

      <ul className="login-hero-features">
        {features.map(({ icon: Icon, title, text, prominent }) => (
          <li key={title} className={prominent ? 'login-hero-feature login-hero-feature--primary' : 'login-hero-feature'}>
            <span className="login-hero-feature-icon" aria-hidden>
              <Icon size={20} />
            </span>
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LoginHero;
