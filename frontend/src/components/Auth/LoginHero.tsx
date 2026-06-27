import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Sprout, Users, MapPin, ListTodo, Droplets, Activity } from 'lucide-react';
import BrandLogo from '../Common/BrandLogo';
import './LoginHero.css';

const LoginHero: React.FC = () => {
  const { t } = useTranslation('auth');

  const features = [
    { icon: CalendarDays, text: t('login.featurePlanning') },
    { icon: Sprout, text: t('login.featureMonitoring') },
    { icon: Users, text: t('login.featureCollaboration') },
  ];

  const stats = [
    { icon: MapPin, label: t('login.statFields'), value: '12', tone: 'olive' },
    { icon: ListTodo, label: t('login.statTasks'), value: '8', tone: 'amber' },
    { icon: Droplets, label: t('login.statIrrigation'), value: '3', tone: 'blue' },
    { icon: Activity, label: t('login.statHealth'), value: '94%', tone: 'green' },
  ];

  return (
    <div className="login-hero">
      <div className="login-hero-brand">
        <BrandLogo size="sm" className="login-hero-logo" alt="" />
        <div>
          <p className="login-hero-app">{t('login.appName')}</p>
          <p className="login-hero-tagline">{t('login.platformTagline')}</p>
        </div>
      </div>

      <div className="login-hero-copy">
        <h1>{t('login.heroTitle')}</h1>
        <p>{t('login.heroSubtitle')}</p>
      </div>

      <ul className="login-hero-features">
        {features.map(({ icon: Icon, text }) => (
          <li key={text}>
            <Icon size={18} aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <div className="login-hero-summary">
        <p className="login-hero-summary-label">{t('login.summaryTitle')}</p>
        <div className="login-hero-stats">
          {stats.map(({ icon: Icon, label, value, tone }) => (
            <div key={label} className={`login-hero-stat login-hero-stat--${tone}`}>
              <Icon size={16} aria-hidden />
              <div>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="login-hero-activity">
          <span className="login-hero-activity-dot" aria-hidden />
          <p>{t('login.recentActivity')}</p>
        </div>
      </div>
    </div>
  );
};

export default LoginHero;
