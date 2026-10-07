import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../components/Common/BrandLogo';
import { LANDING_SUPPORT_EMAIL } from '../config/landingConfig';
import './LegalPage.css';

type Kind = 'privacy' | 'terms';

type LegalSection = { heading?: string; paragraphs?: string[] };

const PUBLIC_PRIVACY_URL = 'https://theolivelot.com/privacy/';
const PUBLIC_DELETE_ACCOUNT_URL = 'https://theolivelot.com/delete-account/';

const LegalPage: React.FC<{ kind: Kind }> = ({ kind }) => {
  const { t } = useTranslation('legal');
  const disclaimer = t('disclaimer');
  const updated = t(`${kind}.updated`, { defaultValue: '' });
  const intro = t(`${kind}.intro`, { defaultValue: '' });
  const sectionsRaw = t(`${kind}.sections`, { returnObjects: true, defaultValue: [] });
  const sections = Array.isArray(sectionsRaw) ? (sectionsRaw as LegalSection[]) : [];
  const pointsRaw = t(`${kind}.points`, { returnObjects: true, defaultValue: [] });
  const points = Array.isArray(pointsRaw) ? (pointsRaw as string[]) : [];

  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link to="/" className="legal-brand">
          <BrandLogo variant="horizontal" tone="on-light" size="md" alt="The Olive Lot" />
        </Link>
      </header>
      <article className="legal-body">
        {disclaimer ? <p className="legal-disclaimer">{disclaimer}</p> : null}
        <h1>{t(`${kind}.title`)}</h1>
        {updated ? <p className="legal-updated">{updated}</p> : null}
        {intro ? <p>{intro}</p> : null}
        {sections.map((section) => (
          <section key={section.heading || section.paragraphs?.[0]} className="legal-section">
            {section.heading ? <h2>{section.heading}</h2> : null}
            {(section.paragraphs || []).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
        {points.map((item) => (
          <p key={item}>{item}</p>
        ))}
        {kind === 'privacy' ? (
          <>
            <p>
              <a href={PUBLIC_PRIVACY_URL} target="_blank" rel="noopener noreferrer">
                {t('viewOnline')}
              </a>
            </p>
            <p>
              <a href={PUBLIC_DELETE_ACCOUNT_URL} target="_blank" rel="noopener noreferrer">
                {t('deleteAccountOnline')}
              </a>
            </p>
          </>
        ) : null}
        <p>
          {t('contact')}{' '}
          <a href={`mailto:${LANDING_SUPPORT_EMAIL}`}>{LANDING_SUPPORT_EMAIL}</a>
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
