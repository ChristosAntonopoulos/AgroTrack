import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../components/Common/BrandLogo';
import './LegalPage.css';

type Kind = 'privacy' | 'terms';

const LegalPage: React.FC<{ kind: Kind }> = ({ kind }) => {
  const { t } = useTranslation('legal');
  const points = t(`${kind}.points`, { returnObjects: true });
  const items = Array.isArray(points) ? (points as string[]) : [];

  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link to="/" className="legal-brand">
          <BrandLogo variant="horizontal" tone="on-light" size="sm" alt="Oleachron" />
        </Link>
      </header>
      <article className="legal-body">
        <p className="legal-disclaimer">{t('disclaimer')}</p>
        <h1>{t(`${kind}.title`)}</h1>
        {items.map((item) => (
          <p key={item}>{item}</p>
        ))}
        <p>
          {t('contact')}{' '}
          <a href="mailto:hello@oleachron.com">hello@oleachron.com</a>
        </p>
        <p>
          <Link to="/">{t('back')}</Link>
        </p>
      </article>
    </main>
  );
};

export const PrivacyPage = () => <LegalPage kind="privacy" />;
export const TermsPage = () => <LegalPage kind="terms" />;
