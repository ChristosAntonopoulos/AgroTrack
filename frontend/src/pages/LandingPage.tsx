import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PenLine,
  CalendarClock,
  Share2,
  ClipboardList,
  Camera,
  CloudSun,
  CircleDollarSign,
  Heart,
  Users,
  Landmark,
  Download,
  Mail,
  Check,
  ChevronDown,
  LogIn,
  X,
  Menu,
  AlertCircle,
} from 'lucide-react';
import { useLocale } from '../context/LocaleProvider';
import { SupportedLocale } from '../i18n/config';
import BrandLogo from '../components/Common/BrandLogo';
import ThemeModeToggle from '../components/Common/ThemeModeToggle';
import {
  ALPHA_APK_URL,
  ALPHA_APK_FILENAME,
  LANDING_CONTACT_EMAIL,
  LANDING_NAV,
} from '../config/landingConfig';
import './LandingPage.css';

import elPhoneField from '../assets/landing/el-phone-field.png';
import elPhoneTask from '../assets/landing/el-phone-task.png';
import enPhoneField from '../assets/landing/en-phone-field.png';
import enPhoneTask from '../assets/landing/en-phone-task.png';

type ShotKey = 'phoneField' | 'phoneTask';

const SHOTS_EL: Record<ShotKey, string> = {
  phoneField: elPhoneField,
  phoneTask: elPhoneTask,
};

const SHOTS_EN: Record<ShotKey, string> = {
  phoneField: enPhoneField,
  phoneTask: enPhoneTask,
};

const shotsFor = (locale: SupportedLocale): Record<ShotKey, string> =>
  locale === 'el' ? SHOTS_EL : SHOTS_EN;

const PROMISES = [
  { key: 'record', icon: PenLine },
  { key: 'data', icon: CalendarClock },
  { key: 'pass', icon: Share2 },
] as const;

const CHRONO_PILLARS = [
  { key: 'tasks', icon: ClipboardList },
  { key: 'notes', icon: Camera },
  { key: 'weather', icon: CloudSun },
  { key: 'harvest', icon: CircleDollarSign },
] as const;

const SHARE_ROLES = [
  { key: 'family', icon: Heart },
  { key: 'partners', icon: Users },
  { key: 'agronomist', icon: Landmark },
] as const;

const LandingPage: React.FC = () => {
  const { t } = useTranslation('landing');
  const { locale, setLocale } = useLocale();
  const shots = shotsFor(locale);
  const [scrolled, setScrolled] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoForm, setDemoForm] = useState({ name: '', email: '', org: '', message: '' });

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

  const submitDemo = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(t('demo.mailtoSubject'));
    const body = encodeURIComponent(
      `Name: ${demoForm.name}\nEmail: ${demoForm.email}\nOrganization: ${demoForm.org}\n\n${demoForm.message}`
    );
    window.location.href = `mailto:${LANDING_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setDemoOpen(false);
  };

  const headerCtas = (
    <>
      <Link
        to="/login"
        className="landing-btn landing-btn--outline landing-btn--sm landing-btn--on-hero landing-header-signin"
      >
        <LogIn size={16} aria-hidden />
        <span>{t('header.signIn')}</span>
      </Link>
      <Link to="/register" className="landing-btn landing-btn--primary landing-btn--sm landing-header-start">
        {t('header.startFree')}
      </Link>
    </>
  );

  const knowledgeTitle = t('knowledge.title').split('\n');
  const futureTitle = t('future.title').split('\n');

  return (
    <div className="landing">
      <div className="landing-page-bg" aria-hidden />

      <header className={`landing-header${scrolled ? ' landing-header--scrolled' : ''}`}>
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
              tone={scrolled ? 'on-light' : 'on-dark'}
              size="sm"
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
              <ThemeModeToggle surface={scrolled ? 'landing-scrolled' : 'landing'} />
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
                <ThemeModeToggle surface={scrolled ? 'landing-scrolled' : 'landing'} />
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
        {/* 1. HERO — mood: deep olive */}
        <section className="landing-hero landing-mood-hero">
          <div className="landing-mood-layer" aria-hidden data-mood="hero" />
          <div className="landing-container landing-hero-grid landing-hero-grid--solo">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow">{t('hero.eyebrow')}</p>
              <h1>{t('hero.title')}</h1>
              <p className="landing-definition">{t('hero.definition')}</p>
              <p className="landing-lead">{t('hero.sub')}</p>
              <ul className="landing-hero-benefits">
                {lines('hero.benefits').map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="landing-hero-ctas">
                <Link to="/register" className="landing-btn landing-btn--hero-primary">
                  {t('hero.ctaPrimary')}
                </Link>
                <button
                  type="button"
                  className="landing-btn landing-btn--hero-secondary"
                  onClick={() => scrollTo('how-it-works')}
                >
                  {t('hero.ctaSecondary')}
                </button>
              </div>
              <p className="landing-trust">{t('hero.trust')}</p>
            </div>
          </div>
        </section>

        {/* 2. Three practical cards */}
        <section id="features" className="landing-section landing-mood-grove">
          <div className="landing-mood-layer" aria-hidden data-mood="grove" />
          <div className="landing-container landing-shift-grid">
            {PROMISES.map(({ key, icon: Icon }) => (
              <article key={key} className="landing-shift-card">
                <div className="landing-card-icon">
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                <h3>{t(`promises.${key}Title`)}</h3>
                <p>{t(`promises.${key}Text`)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 3. Problem — mood: warm paper */}
        <section className="landing-section landing-mood-paper">
          <div className="landing-mood-layer" aria-hidden data-mood="paper" />
          <div className="landing-container landing-prose">
            <h2>{t('problem.title')}</h2>
            <ul className="landing-questions">
              {lines('problem.lines').map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            <p>{t('problem.bridge')}</p>
            <p>{t('problem.solution')}</p>
            <p className="landing-close">{t('problem.close')}</p>
          </div>
        </section>

        {/* 4. Chapter / memory — mood: olive dark */}
        <section className="landing-section landing-section--olive landing-mood-olive">
          <div className="landing-mood-layer" aria-hidden data-mood="olive" />
          <div className="landing-container landing-moment">
            <h2>{t('brandMoment.title')}</h2>
            <p className="landing-moment-intro">{t('brandMoment.intro')}</p>
            <ol className="landing-flow">
              {lines('brandMoment.flow').map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="landing-close">{t('brandMoment.close')}</p>
          </div>
        </section>

        {/* 5. Chronologio product — mood: clean */}
        <section id="chronologio" className="landing-section landing-section--clean landing-mood-clean">
          <div className="landing-container landing-chrono">
            <div className="landing-section-head landing-section-head--left">
              <h2>{t('chronologio.title')}</h2>
              <p>{t('chronologio.text')}</p>
            </div>
            <div className="landing-chrono-body">
              <div className="landing-pillar-grid">
                {CHRONO_PILLARS.map(({ key, icon: Icon }) => (
                  <article key={key} className="landing-pillar">
                    <div className="landing-card-icon">
                      <Icon size={20} strokeWidth={1.75} />
                    </div>
                    <h3>{t(`chronologio.${key}Title`)}</h3>
                    <p>{t(`chronologio.${key}Text`)}</p>
                  </article>
                ))}
              </div>
              <figure className="landing-device landing-device--phone">
                <img src={shots.phoneField} alt={t('chronologio.shotAlt')} />
              </figure>
            </div>
            <p className="landing-chrono-foot">{t('chronologio.foot')}</p>
            <Link to="/register" className="landing-btn landing-btn--primary">
              {t('chronologio.cta')}
            </Link>
          </div>
        </section>

        {/* 6. Differentiation — data the farmer knows */}
        <section className="landing-section landing-mood-know">
          <div className="landing-mood-layer" aria-hidden data-mood="know" />
          <div className="landing-container landing-prose landing-knowledge">
            <h2>
              {knowledgeTitle.map((line) => (
                <span key={line} className="landing-title-line">
                  {line}
                </span>
              ))}
            </h2>
            <p>{t('knowledge.p1')}</p>
            <p>{t('knowledge.p2')}</p>
            <p className="landing-knowledge-close">{t('knowledge.close')}</p>
          </div>
        </section>

        {/* 7. One grove / one memory */}
        <section className="landing-section landing-section--cream landing-mood-clean">
          <div className="landing-container">
            <div className="landing-section-head">
              <h2>{t('beforeAfter.title')}</h2>
            </div>
            <div className="landing-compare">
              <article className="landing-compare-card">
                <h3>{t('beforeAfter.beforeTitle')}</h3>
                <ul>
                  {lines('beforeAfter.beforeItems').map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className="landing-compare-card landing-compare-card--after">
                <h3>{t('beforeAfter.afterTitle')}</h3>
                <ul>
                  {lines('beforeAfter.afterItems').map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </div>
            <p className="landing-section-close">{t('beforeAfter.close')}</p>
          </div>
        </section>

        {/* 8. Transfer / heritage — sharing */}
        <section id="partners" className="landing-section landing-mood-share">
          <div className="landing-mood-layer" aria-hidden data-mood="share" />
          <div className="landing-container landing-share-body">
            <div className="landing-section-head landing-section-head--left">
              <h2>{t('sharing.title')}</h2>
              <p>{t('sharing.text')}</p>
            </div>
            <div className="landing-shift-grid">
              {SHARE_ROLES.map(({ key, icon: Icon }) => (
                <article key={key} className="landing-shift-card">
                  <div className="landing-card-icon">
                    <Icon size={22} strokeWidth={1.75} />
                  </div>
                  <h3>{t(`sharing.${key}Title`)}</h3>
                  <p>{t(`sharing.${key}Text`)}</p>
                </article>
              ))}
            </div>
            <p className="landing-section-close">{t('sharing.close')}</p>
          </div>
        </section>

        {/* 9. Compounding years */}
        <section className="landing-section landing-section--cream landing-mood-clean">
          <div className="landing-container landing-years-wrap">
            <h2>{t('timeValue.title')}</h2>
            <ol className="landing-years">
              <li>
                <span>1</span>
                <div>
                  <strong>{t('timeValue.year1Label')}</strong>
                  <p>{t('timeValue.year1')}</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>{t('timeValue.year2Label')}</strong>
                  <p>{t('timeValue.year2')}</p>
                </div>
              </li>
              <li>
                <span>3+</span>
                <div>
                  <strong>{t('timeValue.year3Label')}</strong>
                  <p>{t('timeValue.year3')}</p>
                </div>
              </li>
            </ol>
            <ul className="landing-questions landing-questions--inline">
              {lines('timeValue.questions').map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            <p className="landing-knowledge-close">{t('timeValue.close')}</p>
          </div>
        </section>

        {/* 10. Field simplicity + product shot */}
        <section className="landing-section landing-mood-clean">
          <div className="landing-container landing-simple">
            <div className="landing-prose landing-prose--flush">
              <h2>{t('simpleUse.title')}</h2>
              <ul className="landing-questions">
                {lines('simpleUse.lines').map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <ul className="landing-actions">
                {lines('simpleUse.steps').map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <ul className="landing-bullet-row">
                {lines('simpleUse.bullets').map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <figure className="landing-device landing-device--phone">
              <img src={shots.phoneTask} alt={t('simpleUse.shotAlt')} />
            </figure>
          </div>
        </section>

        {/* 11. Onboarding */}
        <section id="how-it-works" className="landing-section landing-section--cream landing-mood-clean">
          <div className="landing-container landing-section-head">
            <h2>{t('steps.title')}</h2>
            <p>{t('steps.lead')}</p>
          </div>
          <div className="landing-container landing-steps">
            {[1, 2, 3].map((n) => (
              <article key={n} className="landing-step">
                <span className="landing-step-num">{n}</span>
                <h3>{t(`steps.step${n}Title`)}</h3>
                <p>{t(`steps.step${n}Text`)}</p>
              </article>
            ))}
          </div>
          <div className="landing-container landing-section-cta">
            <Link to="/register" className="landing-btn landing-btn--primary">
              {t('steps.cta')}
            </Link>
          </div>
        </section>

        {/* 12. Continuity — mood: earth-dark */}
        <section className="landing-section landing-section--earth landing-mood-earth">
          <div className="landing-mood-layer" aria-hidden data-mood="earth" />
          <div className="landing-container landing-moment">
            <h2>
              {futureTitle.map((line) => (
                <span key={line} className="landing-title-line">
                  {line}
                </span>
              ))}
            </h2>
            <div className="landing-future-grid">
              <article>
                <h3>{t('future.pastTitle')}</h3>
                <p>{t('future.pastText')}</p>
              </article>
              <article>
                <h3>{t('future.todayTitle')}</h3>
                <p>{t('future.todayText')}</p>
              </article>
              <article>
                <h3>{t('future.nextTitle')}</h3>
                <p>{t('future.nextText')}</p>
              </article>
            </div>
            <p className="landing-close">{t('future.close')}</p>
          </div>
        </section>

        {/* 13. Free plan */}
        <section id="pricing" className="landing-section landing-section--clean landing-mood-clean">
          <div className="landing-container landing-alpha-grid">
            <div className="landing-section-head">
              <h2>{t('alpha.title')}</h2>
              <p>{t('alpha.text')}</p>
            </div>
            <article className="landing-apk-card">
              <div className="landing-apk-head">
                <span className="landing-app-icon" aria-hidden>
                  <BrandLogo variant="app-icon" tone="on-light" size="md" alt="" />
                </span>
                <div>
                  <h3>{t('alpha.cardTitle')}</h3>
                  <p className="landing-price-amount">{t('alpha.price')}</p>
                </div>
              </div>
              <ul className="landing-apk-includes">
                {lines('alpha.includes').map((item) => (
                  <li key={item}>
                    <Check size={14} aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="landing-trust landing-trust--on-light">{t('alpha.trust')}</p>
              <Link to="/register" className="landing-btn landing-btn--primary landing-btn--block">
                {t('alpha.webCta')}
              </Link>
              <a
                href={ALPHA_APK_URL}
                download={ALPHA_APK_FILENAME}
                className="landing-btn landing-btn--outline landing-btn--block"
              >
                <Download size={18} aria-hidden />
                {t('alpha.download')}
              </a>
              <p className="landing-apk-hint">{t('alpha.downloadHint')}</p>
              <button
                type="button"
                className="landing-apk-guide-toggle"
                onClick={() => setInstallOpen((v) => !v)}
                aria-expanded={installOpen}
              >
                {t('alpha.installGuide')}
                <ChevronDown size={16} className={installOpen ? 'open' : ''} aria-hidden />
              </button>
              {installOpen ? (
                <div className="landing-apk-guide">
                  <h4>{t('alpha.installTitle')}</h4>
                  <ol>
                    {lines('alpha.installSteps').map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
              <p className="landing-apk-warning">
                <AlertCircle size={14} aria-hidden />
                {t('alpha.safety')}
              </p>
            </article>
          </div>
        </section>

        {/* 14. Final CTA — mood: earth */}
        <section className="landing-cta landing-mood-earth">
          <div className="landing-mood-layer" aria-hidden data-mood="cta" />
          <div className="landing-container landing-cta-inner">
            <p className="landing-eyebrow">{t('cta.kicker')}</p>
            <h2>{t('cta.title')}</h2>
            <p>{t('cta.text')}</p>
            <div className="landing-hero-ctas landing-hero-ctas--centered">
              <Link to="/register" className="landing-btn landing-btn--light">
                {t('cta.primary')}
              </Link>
              <button type="button" className="landing-btn landing-btn--ghost" onClick={() => setDemoOpen(true)}>
                {t('cta.secondary')}
              </button>
            </div>
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
                size="sm"
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
              {t('footer.contactEmail')}
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
        <div className="landing-container landing-footer-bottom">
          <span>{t('footer.privacy')}</span>
          <span>{t('footer.terms')}</span>
        </div>
      </footer>

      {demoOpen ? (
        <div className="landing-modal-backdrop" role="presentation" onClick={() => setDemoOpen(false)}>
          <div
            className="landing-modal"
            role="dialog"
            aria-labelledby="demo-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="landing-modal-close"
              onClick={() => setDemoOpen(false)}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <h2 id="demo-title">{t('demo.title')}</h2>
            <p>{t('demo.subtitle')}</p>
            <form onSubmit={submitDemo}>
              <label>
                {t('demo.name')}
                <input
                  required
                  value={demoForm.name}
                  onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                />
              </label>
              <label>
                {t('demo.email')}
                <input
                  type="email"
                  required
                  value={demoForm.email}
                  onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                />
              </label>
              <label>
                {t('demo.organization')}
                <input
                  value={demoForm.org}
                  onChange={(e) => setDemoForm({ ...demoForm, org: e.target.value })}
                />
              </label>
              <label>
                {t('demo.message')}
                <textarea
                  rows={4}
                  value={demoForm.message}
                  onChange={(e) => setDemoForm({ ...demoForm, message: e.target.value })}
                />
              </label>
              <button type="submit" className="landing-btn landing-btn--primary landing-btn--block">
                {t('demo.submit')}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LandingPage;
