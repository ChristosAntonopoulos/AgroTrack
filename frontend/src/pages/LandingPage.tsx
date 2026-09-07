import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  MessageCircle,
  Smartphone,
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
import {
  ALPHA_APK_URL,
  ALPHA_APK_FILENAME,
  LANDING_CONTACT_EMAIL,
  LANDING_NAV,
} from '../config/landingConfig';
import './LandingPage.css';

import elPhoneToday from '../assets/landing/el-phone-today.png';
import elPhoneFields from '../assets/landing/el-phone-fields.png';
import elPhoneField from '../assets/landing/el-phone-field.png';
import elPhoneTask from '../assets/landing/el-phone-task.png';
import elPhoneHarvest from '../assets/landing/el-phone-harvest.png';
import elWebMoney from '../assets/landing/el-web-money.png';
import elWebField from '../assets/landing/el-web-field.png';
import enPhoneToday from '../assets/landing/en-phone-today.png';
import enPhoneFields from '../assets/landing/en-phone-fields.png';
import enPhoneField from '../assets/landing/en-phone-field.png';
import enPhoneTask from '../assets/landing/en-phone-task.png';
import enPhoneHarvest from '../assets/landing/en-phone-harvest.png';
import enWebMoney from '../assets/landing/en-web-money.png';
import enWebField from '../assets/landing/en-web-field.png';

type ShotKey =
  | 'phoneToday'
  | 'phoneFields'
  | 'phoneField'
  | 'phoneTask'
  | 'phoneHarvest'
  | 'webMoney'
  | 'webField';

const SHOTS_EL: Record<ShotKey, string> = {
  phoneToday: elPhoneToday,
  phoneFields: elPhoneFields,
  phoneField: elPhoneField,
  phoneTask: elPhoneTask,
  phoneHarvest: elPhoneHarvest,
  webMoney: elWebMoney,
  webField: elWebField,
};

const SHOTS_EN: Record<ShotKey, string> = {
  phoneToday: enPhoneToday,
  phoneFields: enPhoneFields,
  phoneField: enPhoneField,
  phoneTask: enPhoneTask,
  phoneHarvest: enPhoneHarvest,
  webMoney: enWebMoney,
  webField: enWebField,
};

const shotsFor = (locale: SupportedLocale): Record<ShotKey, string> =>
  locale === 'el' ? SHOTS_EL : SHOTS_EN;

const LandingPage: React.FC = () => {
  const { t } = useTranslation('landing');
  const { locale, setLocale } = useLocale();
  const shots = shotsFor(locale);
  const [scrolled, setScrolled] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(1);
  const [installOpen, setInstallOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoForm, setDemoForm] = useState({ name: '', email: '', org: '', message: '' });

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

  const faqKeys = [1, 2, 3, 4, 5, 6] as const;

  const submitDemo = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(t('demo.mailtoSubject'));
    const body = encodeURIComponent(
      `Name: ${demoForm.name}\nEmail: ${demoForm.email}\nOrganization: ${demoForm.org}\n\n${demoForm.message}`
    );
    window.location.href = `mailto:${LANDING_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setDemoOpen(false);
  };

  const noteRows: { key: string; shot: ShotKey; frame: 'phone' | 'laptop' }[] = [
    { key: 'fields', shot: 'phoneFields', frame: 'phone' },
    { key: 'today', shot: 'phoneToday', frame: 'phone' },
    { key: 'harvest', shot: 'phoneHarvest', frame: 'phone' },
    { key: 'costs', shot: 'webMoney', frame: 'laptop' },
    { key: 'history', shot: 'phoneField', frame: 'phone' },
  ];

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
            <BrandLogo size="sm" alt={t('brand')} rounded />
            <span>{t('brand')}</span>
            <span className="landing-alpha-pill">{t('alphaBadge')}</span>
          </a>

          <nav className="landing-nav" aria-label="Main">
            {LANDING_NAV.map(({ id, key }) => (
              <button key={id} type="button" onClick={() => scrollTo(id)}>
                {t(`header.${key}`)}
              </button>
            ))}
          </nav>

          <div className="landing-header-actions">
            <div className="landing-lang landing-lang--desktop" role="group" aria-label="Language">
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
            <Link to="/login" className="landing-btn landing-btn--primary landing-btn--sm landing-header-signin">
              <LogIn size={16} aria-hidden />
              <span>{t('header.signIn')}</span>
            </Link>
            <a
              href={ALPHA_APK_URL}
              download={ALPHA_APK_FILENAME}
              className="landing-btn landing-btn--outline landing-btn--sm landing-btn--on-hero landing-header-download"
            >
              <Download size={16} aria-hidden />
              <span>{t('header.downloadAlpha')}</span>
            </a>
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
              <Link
                to="/login"
                className="landing-btn landing-btn--primary landing-btn--block"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LogIn size={18} aria-hidden />
                {t('header.signIn')}
              </Link>
              <a
                href={ALPHA_APK_URL}
                download={ALPHA_APK_FILENAME}
                className="landing-btn landing-btn--outline landing-btn--block"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Download size={18} aria-hidden />
                {t('header.downloadAlpha')}
              </a>
            </div>
          </div>
        ) : null}
      </header>

      <main id="top">
        <section className="landing-hero">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <h1>{t('hero.title')}</h1>
              <p className="landing-lead">{t('hero.subtitle')}</p>
              <div className="landing-hero-ctas">
                <Link to="/register" className="landing-btn landing-btn--hero-primary">
                  {t('hero.ctaPrimary')}
                </Link>
                <a
                  href={ALPHA_APK_URL}
                  download={ALPHA_APK_FILENAME}
                  className="landing-btn landing-btn--hero-secondary"
                >
                  <Download size={18} aria-hidden />
                  {t('hero.ctaSecondary')}
                </a>
              </div>
              <button type="button" className="landing-text-link" onClick={() => setDemoOpen(true)}>
                {t('hero.ctaDemo')}
              </button>
              <p className="landing-trust">{t('hero.trust')}</p>
            </div>

            <div className="landing-hero-visual">
              <figure className="landing-device landing-device--phone landing-device--hero">
                <img src={shots.phoneToday} alt={t('hero.shotAlt')} />
              </figure>
            </div>
          </div>
        </section>

        <section id="product" className="landing-section landing-section--cream">
          <div className="landing-container landing-section-head">
            <h2>{t('shift.title')}</h2>
            <p>{t('shift.text')}</p>
          </div>
          <div className="landing-container landing-shift-grid">
            {[
              { icon: BookOpen, title: t('shift.paperTitle'), text: t('shift.paperText') },
              { icon: MessageCircle, title: t('shift.chatTitle'), text: t('shift.chatText') },
              { icon: Smartphone, title: t('shift.phoneTitle'), text: t('shift.phoneText') },
            ].map(({ icon: Icon, title, text }) => (
              <article key={title} className="landing-shift-card">
                <div className="landing-card-icon">
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-container landing-section-head">
            <h2>{t('notes.title')}</h2>
            <p>{t('notes.text')}</p>
          </div>
          <div className="landing-container landing-notes">
            {noteRows.map(({ key, shot, frame }, index) => (
              <article
                key={key}
                className={`landing-note-row${index % 2 === 1 ? ' landing-note-row--flip' : ''}`}
              >
                <div className="landing-note-copy">
                  <h3>{t(`notes.${key}Title`)}</h3>
                  <p>{t(`notes.${key}Text`)}</p>
                </div>
                <figure className={`landing-device landing-device--${frame}`}>
                  <img src={shots[shot]} alt={t(`notes.${key}Alt`)} />
                </figure>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-section--muted">
          <div className="landing-container landing-section-head">
            <h2>{t('audience.title')}</h2>
          </div>
          <div className="landing-container landing-audience-grid">
            <article className="landing-audience-card">
              <h3>{t('audience.ownerTitle')}</h3>
              <p>{t('audience.ownerText')}</p>
              <figure className="landing-device landing-device--laptop landing-device--embedded">
                <img src={shots.webField} alt={t('audience.ownerAlt')} />
              </figure>
            </article>
            <article className="landing-audience-card landing-audience-card--accent">
              <h3>{t('audience.producerTitle')}</h3>
              <p>{t('audience.producerText')}</p>
              <figure className="landing-device landing-device--phone landing-device--embedded">
                <img src={shots.phoneTask} alt={t('audience.producerAlt')} />
              </figure>
            </article>
          </div>
        </section>

        <section id="how-it-works" className="landing-section">
          <div className="landing-container landing-section-head">
            <h2>{t('steps.title')}</h2>
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
        </section>

        <section id="download" className="landing-section landing-section--muted">
          <div className="landing-container landing-alpha-grid">
            <div className="landing-section-head">
              <h2>{t('alpha.title')}</h2>
              <p>{t('alpha.text')}</p>
            </div>
            <article className="landing-apk-card">
              <div className="landing-apk-head">
                <BrandLogo size="md" alt={t('brand')} rounded />
                <div>
                  <h3>{t('alpha.cardTitle')}</h3>
                  <p className="landing-price-amount">{t('alpha.price')}</p>
                </div>
              </div>
              <ul className="landing-apk-includes">
                {(t('alpha.includes', { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}>
                    <Check size={14} aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <dl className="landing-apk-meta">
                <div>
                  <dt>{t('alpha.version')}</dt>
                  <dd>{t('alpha.versionValue')}</dd>
                </div>
                <div>
                  <dt>{t('alpha.platform')}</dt>
                  <dd>{t('alpha.platformValue')}</dd>
                </div>
                <div>
                  <dt>{t('alpha.status')}</dt>
                  <dd>{t('alpha.statusValue')}</dd>
                </div>
              </dl>
              <a
                href={ALPHA_APK_URL}
                download={ALPHA_APK_FILENAME}
                className="landing-btn landing-btn--primary landing-btn--block"
              >
                <Download size={18} aria-hidden />
                {t('alpha.download')}
              </a>
              <Link to="/register" className="landing-btn landing-btn--outline landing-btn--block">
                {t('alpha.webCta')}
              </Link>
              <button
                type="button"
                className="landing-apk-guide-toggle"
                onClick={() => setInstallOpen((v) => !v)}
                aria-expanded={installOpen}
              >
                {t('alpha.installGuide')}
                <ChevronDown size={16} className={installOpen ? 'open' : ''} aria-hidden />
              </button>
              {installOpen && (
                <div className="landing-apk-guide">
                  <h4>{t('alpha.installTitle')}</h4>
                  <ol>
                    {(t('alpha.installSteps', { returnObjects: true }) as string[]).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              <p className="landing-apk-warning">
                <AlertCircle size={14} aria-hidden />
                {t('alpha.safety')}
              </p>
            </article>
          </div>
        </section>

        <section id="faq" className="landing-section">
          <div className="landing-container landing-faq-wrap">
            <h2>{t('faq.title')}</h2>
            <div className="landing-faq-list">
              {faqKeys.map((n) => (
                <article key={n} className={`landing-faq-item${faqOpen === n ? ' open' : ''}`}>
                  <button
                    type="button"
                    className="landing-faq-q"
                    onClick={() => setFaqOpen(faqOpen === n ? null : n)}
                    aria-expanded={faqOpen === n}
                  >
                    {t(`faq.q${n}`)}
                    <ChevronDown size={18} aria-hidden />
                  </button>
                  {faqOpen === n && <p className="landing-faq-a">{t(`faq.a${n}`)}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-cta">
          <div className="landing-container landing-cta-inner">
            <h2>{t('cta.title')}</h2>
            <p>{t('cta.text')}</p>
            <div className="landing-hero-ctas landing-hero-ctas--centered">
              <Link to="/register" className="landing-btn landing-btn--light">
                {t('cta.primary')}
              </Link>
              <a href={ALPHA_APK_URL} download={ALPHA_APK_FILENAME} className="landing-btn landing-btn--ghost">
                <Download size={18} aria-hidden />
                {t('cta.secondary')}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-grid">
          <div>
            <div className="landing-footer-brand">
              <BrandLogo size="sm" alt={t('brand')} rounded />
              <span>{t('brand')}</span>
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

      {demoOpen && (
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
      )}
    </div>
  );
};

export default LandingPage;
