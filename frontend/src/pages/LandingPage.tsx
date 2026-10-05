import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Mail,
  ChevronDown,
  LogIn,
  X,
  Menu,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useLocale } from '../context/LocaleProvider';
import { SupportedLocale } from '../i18n/config';
import BrandLogo from '../components/Common/BrandLogo';
import ThemeModeToggle from '../components/Common/ThemeModeToggle';
import {
  ALPHA_APK_URL,
  ALPHA_APK_FILENAME,
  LANDING_CONTACT_EMAIL,
  LANDING_SUPPORT_EMAIL,
  LANDING_NAV,
} from '../config/landingConfig';
import {
  ChronologioCentre,
  FamilyStage,
  FarmerProof,
  FourQuestions,
  GroveDashboard,
  HarvestJourney,
  MapStage,
  MemoryYears,
  OilStore,
  OilTinCluster,
  YearFlow,
} from './landing/LandingStages';
import './LandingPage.css';
import './landing/LandingStory.css';

const LandingPage: React.FC = () => {
  const { t } = useTranslation('landing');
  const { locale, setLocale } = useLocale();
  const [scrolled, setScrolled] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [apkOpen, setApkOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const lines = useCallback(
    (key: string) => {
      const value = t(key, { returnObjects: true });
      return Array.isArray(value) ? (value as string[]) : [];
    },
    [t]
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = useCallback((id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const headerCtas = (
    <>
      <Link
        to="/login"
        className="landing-btn landing-btn--outline landing-btn--sm landing-header-signin"
      >
        <LogIn size={16} aria-hidden />
        <span>{t('header.signIn')}</span>
      </Link>
      <Link to="/register" className="landing-btn landing-btn--primary landing-btn--sm landing-header-start">
        {t('header.startFree')}
      </Link>
    </>
  );

  return (
    <div className="landing landing--archive">
      <div className="landing-page-bg" aria-hidden />

      <header className={`landing-header landing-header--scrolled${scrolled ? ' is-stuck' : ''}`}>
        <div className="landing-header-inner">
          <a
            href="#top"
            className="landing-brand"
            onClick={(e) => {
              e.preventDefault();
              scrollTo('top');
            }}
          >
            <BrandLogo
              className="landing-brand-lockup"
              variant="horizontal"
              tone="on-light"
              size="md"
              alt={t('brand')}
            />
          </a>

          <nav className="landing-nav" aria-label="Main">
            {LANDING_NAV.map(({ id, key }) => (
              <button key={id} type="button" onClick={() => scrollTo(id)}>
                {t(`header.${key}`)}
              </button>
            ))}
          </nav>

          <div className="landing-header-actions">
            <div className="landing-chrome-prefs landing-chrome-prefs--desktop">
              <ThemeModeToggle surface="landing-scrolled" />
              <div className="landing-lang" role="group" aria-label="Language">
                {(['el', 'en'] as SupportedLocale[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={locale === code ? 'active' : ''}
                    onClick={() => setLocale(code)}
                    aria-pressed={locale === code}
                  >
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {headerCtas}
            <button
              type="button"
              className="landing-menu-btn"
              aria-expanded={mobileMenuOpen}
              aria-controls="landing-mobile-menu"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div id="landing-mobile-menu" className="landing-mobile-menu" role="dialog" aria-modal="true">
            <nav className="landing-mobile-nav" aria-label="Mobile">
              {LANDING_NAV.map(({ id, key }) => (
                <button key={id} type="button" onClick={() => scrollTo(id)}>
                  {t(`header.${key}`)}
                </button>
              ))}
            </nav>
            <div className="landing-mobile-menu-actions">
              <div className="landing-chrome-prefs">
                <ThemeModeToggle surface="landing-scrolled" />
                <div className="landing-lang" role="group" aria-label="Language">
                  {(['el', 'en'] as SupportedLocale[]).map((code) => (
                    <button
                      key={code}
                      type="button"
                      className={locale === code ? 'active' : ''}
                      onClick={() => setLocale(code)}
                      aria-pressed={locale === code}
                    >
                      {code.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <Link
                to="/login"
                className="landing-btn landing-btn--outline landing-btn--block"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LogIn size={18} aria-hidden />
                {t('header.signIn')}
              </Link>
              <Link
                to="/register"
                className="landing-btn landing-btn--primary landing-btn--block"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('header.startFree')}
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main id="top">
        <section className="lp-hero" aria-labelledby="hero-title">
          <div className="landing-container lp-hero-grid">
            <div className="lp-hero-copy">
              {t('hero.eyebrow') ? <p className="lp-eyebrow">{t('hero.eyebrow')}</p> : null}
              <h1 id="hero-title">
                {t('hero.title')}
                {t('hero.titleLine') ? <span className="lp-hero-line">{t('hero.titleLine')}</span> : null}
              </h1>
              <p className="lp-lead lp-measure">{t('hero.sub')}</p>
              <div className="lp-ctas">
                <Link to="/register" className="landing-btn landing-btn--primary landing-btn--lg">
                  {t('hero.ctaPrimary')}
                </Link>
                <button
                  type="button"
                  className="landing-btn landing-btn--outline landing-btn--lg"
                  onClick={() => scrollTo('how-it-works')}
                >
                  {t('hero.ctaSecondary')}
                </button>
              </div>
              <p className="lp-reassurance">{t('hero.trust')}</p>
            </div>
            <div className="lp-hero-visual">
              <GroveDashboard />
            </div>
          </div>
        </section>

        <section className="lp-editorial" aria-labelledby="problem-title">
          <div className="lp-editorial-photo" role="img" aria-label={t('problem.photoAlt')} />
          <div className="lp-editorial-copy">
            <h2 id="problem-title" className="lp-preline">
              {t('problem.title')}
            </h2>
            <ul className="lp-problem-asks">
              {lines('problem.asks').map((ask) => (
                <li key={ask}>{ask}</li>
              ))}
            </ul>
            <p className="lp-problem-now">{t('problem.now')}</p>
          </div>
        </section>

        <section id="keeps" className="lp-section lp-section--ivory" aria-labelledby="keeps-title">
          <div className="landing-container">
            <div className="lp-section-copy">
              <h2 id="keeps-title">
                {t('questions.title')}
                <span className="lp-hero-line">{t('questions.titleLine')}</span>
              </h2>
            </div>
            <FourQuestions />
            <p className="lp-bridge lp-bridge--lead">{t('questions.close')}</p>
          </div>
        </section>

        <section className="lp-section lp-section--flow" aria-labelledby="flow-title">
          <div className="landing-container">
            <div className="lp-section-copy">
              <h2 id="flow-title">
                {t('flow.title')}
                {t('flow.titleLine') ? <span className="lp-hero-line">{t('flow.titleLine')}</span> : null}
              </h2>
            </div>
            <YearFlow />
            <p className="lp-flow-line">{t('flow.line')}</p>
          </div>
        </section>

        <section className="lp-section lp-section--harvest" aria-labelledby="harvest-title">
          <div className="landing-container">
            <div className="lp-section-copy">
              <h2 id="harvest-title">{t('harvest.title')}</h2>
            </div>
            <HarvestJourney />
          </div>
        </section>

        <section className="lp-section lp-section--oil" aria-labelledby="oil-title">
          <div className="landing-container">
            <div className="lp-oil-compose">
              <OilTinCluster />
              <div className="lp-oil-overlay">
                <div className="lp-section-copy lp-section-copy--left lp-measure">
                  <h2 id="oil-title">
                    {t('oil.title')}
                    {t('oil.titleLine') ? <span className="lp-hero-line">{t('oil.titleLine')}</span> : null}
                  </h2>
                  <p>{t('oil.text')}</p>
                </div>
                <OilStore />
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section lp-section--field" aria-labelledby="map-title">
          <div className="landing-container lp-split">
            <div className="lp-section-copy lp-section-copy--left lp-measure">
              <h2 id="map-title">{t('map.title')}</h2>
              <p className="lp-map-lead">{t('map.sub')}</p>
              <p className="lp-map-owns">{t('map.ownsLead')}</p>
              <ul className="lp-knows lp-knows--inline">
                {lines('map.knows').map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <MapStage />
          </div>
        </section>

        <section id="chronologio" className="lp-chrono" aria-labelledby="chrono-title">
          <div className="landing-container">
            <ChronologioCentre />
            <MemoryYears />
          </div>
        </section>

        <section id="for-whom" className="lp-section lp-section--family" aria-labelledby="family-title">
          <div className="landing-container">
            <div className="lp-section-copy">
              <h2 id="family-title">{t('family.title')}</h2>
              <p className="lp-family-sub">{t('family.sub')}</p>
            </div>
            <FamilyStage />
          </div>
        </section>

        <FarmerProof />

        <section id="how-it-works" className="lp-section lp-section--stone" aria-labelledby="steps-title">
          <div className="landing-container">
            <div className="lp-section-copy">
              <h2 id="steps-title">{t('steps.title')}</h2>
            </div>
            <ol className="lp-steps">
              {[1, 2, 3].map((n) => (
                <li key={n} className={n === 3 ? 'lp-steps__payoff' : undefined}>
                  <span>{n}</span>
                  <h3>{t(`steps.step${n}Title`)}</h3>
                  <p>{t(`steps.step${n}Text`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="pricing" className="lp-killer" aria-labelledby="killer-title">
          <div className="landing-container">
            <h2 id="killer-title">
              {t('killer.line1')}
              <span className="lp-hero-line">{t('killer.line2')}</span>
            </h2>
            <p className="lp-killer-offer">{t('cta.text')}</p>
            <Link to="/register" className="landing-btn landing-btn--primary landing-btn--lg">
              {t('cta.primary')}
            </Link>
            <p className="lp-killer-note">{t('cta.note')}</p>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-grid">
          <div>
            <div className="landing-footer-brand">
              <BrandLogo
                className="landing-footer-lockup"
                variant="horizontal"
                tone="on-dark"
                size="md"
                alt={t('brand')}
              />
              <span className="landing-alpha-pill">{t('footer.version')}</span>
            </div>
            <p>{t('footer.description')}</p>
          </div>
          <div>
            <h4>{t('footer.product')}</h4>
            <nav>
              {LANDING_NAV.map(({ id, key }) => (
                <button key={id} type="button" onClick={() => scrollTo(id)}>
                  {t(`header.${key}`)}
                </button>
              ))}
            </nav>
          </div>
          <div>
            <h4>{t('footer.contact')}</h4>
            <a href={`mailto:${LANDING_CONTACT_EMAIL}`}>
              <Mail size={14} aria-hidden />
              {LANDING_CONTACT_EMAIL}
            </a>
            <a href={`mailto:${LANDING_SUPPORT_EMAIL}`}>
              <Mail size={14} aria-hidden />
              {LANDING_SUPPORT_EMAIL}
            </a>
            <div className="landing-lang landing-lang--footer">
              {(['el', 'en'] as SupportedLocale[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  className={locale === code ? 'active' : ''}
                  onClick={() => setLocale(code)}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="landing-container">
          <details
            className="lp-apk"
            open={apkOpen}
            onToggle={(e) => setApkOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary>
              <Download size={16} aria-hidden />
              {t('alpha.androidTestTitle')}
              <ChevronDown size={16} className={apkOpen ? 'open' : ''} aria-hidden />
            </summary>
            <div className="lp-apk-body">
              <p>{t('alpha.downloadHint')}</p>
              <p className="lp-apk-why">
                <ShieldCheck size={16} aria-hidden />
                {t('alpha.safetyWhy')}
              </p>
              <p className="lp-apk-meta">
                {t('alpha.version')}: {t('alpha.versionValue')} · {t('alpha.released')}:{' '}
                {t('alpha.releasedValue')}
              </p>
              <a href={ALPHA_APK_URL} download={ALPHA_APK_FILENAME} className="landing-btn landing-btn--outline">
                <Download size={18} aria-hidden />
                {t('alpha.download')}
              </a>
              <button
                type="button"
                className="lp-apk-guide-toggle"
                onClick={() => setInstallOpen((v) => !v)}
                aria-expanded={installOpen}
              >
                {t('alpha.installGuide')}
              </button>
              {installOpen ? (
                <div>
                  <h4>{t('alpha.installTitle')}</h4>
                  <ol>
                    {lines('alpha.installSteps').map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
              <p className="lp-apk-warning">
                <AlertCircle size={14} aria-hidden />
                {t('alpha.safety')}
              </p>
            </div>
          </details>
        </div>
        <div className="landing-container landing-footer-bottom">
          <Link to="/privacy">{t('footer.privacy')}</Link>
          <Link to="/terms">{t('footer.terms')}</Link>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
