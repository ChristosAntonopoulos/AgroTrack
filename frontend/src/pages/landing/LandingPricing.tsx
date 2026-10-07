import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import './LandingPricing.css';

interface FaqItem {
  q: string;
  a: string;
}

/**
 * Landing pricing + FAQ. Deliberately shows NO prices: they come from the store
 * (RevenueCat Offerings) inside the app, so marketing copy can never drift from billing.
 */
export const LandingPricing: React.FC = () => {
  const { t } = useTranslation('subscription');
  const list = (key: string) => {
    const value = t(key, { returnObjects: true });
    return Array.isArray(value) ? (value as string[]) : [];
  };

  return (
    <section id="pricing" className="lp-section lp-section--ivory lp-pricing" aria-labelledby="pricing-title">
      <div className="landing-container">
        <div className="lp-section-copy">
          <h2 id="pricing-title">{t('landing.pricing.title')}</h2>
          <p>{t('landing.pricing.sub')}</p>
        </div>

        <div className="lp-pricing-grid">
          <article className="lp-plan">
            <h3>{t('landing.pricing.free.name')}</h3>
            <p className="lp-plan-tagline">{t('landing.pricing.free.tagline')}</p>
            <ul>
              {list('landing.pricing.free.items').map((item) => (
                <li key={item}>
                  <Check size={16} strokeWidth={2.5} aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="lp-plan lp-plan--pro">
            <span className="lp-plan-badge">{t('landing.pricing.pro.badge')}</span>
            <h3>{t('landing.pricing.pro.name')}</h3>
            <p className="lp-plan-tagline">{t('landing.pricing.pro.tagline')}</p>
            <ul>
              {list('landing.pricing.pro.items').map((item) => (
                <li key={item}>
                  <Check size={16} strokeWidth={2.5} aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>

        <p className="lp-pricing-note">{t('landing.pricing.priceNote')}</p>
        <div className="lp-pricing-cta">
          <Link to="/register" className="landing-btn landing-btn--primary landing-btn--lg">
            {t('landing.pricing.cta')}
          </Link>
          <p className="lp-pricing-trust">{t('landing.pricing.trust')}</p>
        </div>
      </div>
    </section>
  );
};

export const LandingFaq: React.FC = () => {
  const { t } = useTranslation('subscription');
  const items = t('landing.faq.items', { returnObjects: true });
  const faqs: FaqItem[] = Array.isArray(items) ? (items as FaqItem[]) : [];

  return (
    <section id="faq" className="lp-section lp-faq" aria-labelledby="faq-title">
      <div className="landing-container">
        <div className="lp-section-copy">
          <h2 id="faq-title">{t('landing.faq.title')}</h2>
        </div>
        <div className="lp-faq-list">
          {faqs.map((item) => (
            <details key={item.q} className="lp-faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};
