import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Leaf,
  MapPin,
  ListTodo,
  History,
  CalendarDays,
  Users,
  Activity,
  Wallet,
  Sprout,
  Smartphone,
  Monitor,
  ChevronDown,
  Download,
  Mail,
  Check,
  AlertCircle,
  BookOpen,
  Eye,
  ClipboardList,
  LogIn,
  X,
  Menu,
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

type WebTab = 'dashboard' | 'calendar' | 'fields' | 'history';

const LandingPage: React.FC = () => {
  const { t } = useTranslation('landing');
  const { locale, setLocale } = useLocale();
  const [scrolled, setScrolled] = useState(false);
  const [webTab, setWebTab] = useState<WebTab>('dashboard');
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
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

  const faqKeys = [1, 2, 3, 4, 5, 6, 7, 8] as const;

  const submitDemo = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(t('demo.mailtoSubject'));
    const body = encodeURIComponent(
      `Name: ${demoForm.name}\nEmail: ${demoForm.email}\nOrganization: ${demoForm.org}\n\n${demoForm.message}`
    );
    window.location.href = `mailto:${LANDING_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setDemoOpen(false);
  };

  const webTabs: { id: WebTab; label: string; desc: string }[] = [
    { id: 'dashboard', label: t('web.tabDashboard'), desc: t('web.dashboardDesc') },
    { id: 'calendar', label: t('web.tabCalendar'), desc: t('web.calendarDesc') },
    { id: 'fields', label: t('web.tabFields'), desc: t('web.fieldsDesc') },
    { id: 'history', label: t('web.tabHistory'), desc: t('web.historyDesc') },
  ];

  return (
    <div className="landing">
      <div className="landing-page-bg" aria-hidden />

      <header className={`landing-header${scrolled ? ' landing-header--scrolled' : ''}`}>
        <div className="landing-header-inner">
          <a href="#top" className="landing-brand" onClick={(e) => { e.preventDefault(); scrollTo('top'); }}>
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
              {(['en', 'el'] as SupportedLocale[]).map((code) => (
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
                {(['en', 'el'] as SupportedLocale[]).map((code) => (
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
              <Link to="/login" className="landing-btn landing-btn--primary landing-btn--block" onClick={() => setMobileMenuOpen(false)}>
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
        {/* Hero */}
        <section className="landing-hero">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <h1>{t('hero.title')}</h1>
              <p className="landing-lead">{t('hero.subtitle')}</p>
              <div className="landing-hero-ctas">
                <Link to="/login" className="landing-btn landing-btn--hero-primary">
                  <LogIn size={18} aria-hidden />
                  {t('hero.ctaLogin')}
                </Link>
                <Link to="/register" className="landing-btn landing-btn--hero-secondary">
                  {t('hero.ctaRegister')}
                </Link>
                <a href={ALPHA_APK_URL} download={ALPHA_APK_FILENAME} className="landing-btn landing-btn--hero-ghost">
                  <Download size={18} aria-hidden />
                  {t('hero.ctaDownload')}
                </a>
                <button type="button" className="landing-btn landing-btn--hero-ghost" onClick={() => setDemoOpen(true)}>
                  {t('hero.ctaDemo')}
                </button>
              </div>
              <p className="landing-trust">{t('hero.trust')}</p>
            </div>

            <div className="landing-hero-aside">
              <article className="landing-login-card">
                <BrandLogo size="md" alt={t('brand')} rounded />
                <h2>{t('hero.loginCardTitle')}</h2>
                <p>{t('hero.loginCardText')}</p>
                <Link to="/login" className="landing-btn landing-btn--primary landing-btn--block">
                  <LogIn size={18} aria-hidden />
                  {t('hero.loginCardButton')}
                </Link>
                <p className="landing-login-card-meta">
                  <Link to="/register">{t('hero.ctaRegister')}</Link>
                </p>
                <a href={ALPHA_APK_URL} download={ALPHA_APK_FILENAME} className="landing-login-card-apk">
                  <Download size={14} aria-hidden />
                  {t('hero.apkHint')}
                </a>
              </article>

              <div className="landing-hero-visual" aria-hidden>
              <div className="landing-mock-laptop">
                <div className="landing-mock-bar">
                  <span /><span /><span />
                </div>
                <div className="landing-mock-screen">
                  <div className="landing-mock-sidebar" />
                  <div className="landing-mock-main">
                    <div className="landing-mock-stat-row">
                      <div className="landing-mock-stat" />
                      <div className="landing-mock-stat" />
                      <div className="landing-mock-stat" />
                    </div>
                    <div className="landing-mock-chart" />
                    <div className="landing-mock-list">
                      <div /><div /><div />
                    </div>
                  </div>
                </div>
              </div>
              <div className="landing-mock-phone">
                <div className="landing-mock-phone-notch" />
                <p className="landing-mock-phone-title">{t('hero.mockToday')}</p>
                <div className="landing-mock-task" />
                <div className="landing-mock-task landing-mock-task--done" />
                <div className="landing-mock-task" />
                <span className="landing-mock-phone-btn">{t('hero.mockComplete')}</span>
              </div>
              <div className="landing-float landing-float--1">{t('hero.floatTasks')}</div>
              <div className="landing-float landing-float--2">{t('hero.floatFields')}</div>
              <div className="landing-float landing-float--3">{t('hero.floatProgress')}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Product */}
        <section id="product" className="landing-section">
          <div className="landing-container landing-section-head">
            <h2>{t('product.title')}</h2>
            <p>{t('product.text')}</p>
          </div>
          <div className="landing-container landing-cards-3">
            {[
              { icon: MapPin, title: t('product.fieldsTitle'), text: t('product.fieldsText') },
              { icon: ListTodo, title: t('product.tasksTitle'), text: t('product.tasksText') },
              { icon: History, title: t('product.historyTitle'), text: t('product.historyText') },
            ].map(({ icon: Icon, title, text }) => (
              <article key={title} className="landing-card">
                <div className="landing-card-icon"><Icon size={22} strokeWidth={1.75} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Pain points */}
        <section className="landing-section landing-section--muted">
          <div className="landing-container landing-section-head">
            <h2>{t('pain.title')}</h2>
          </div>
          <div className="landing-container landing-cards-4">
            {[
              { icon: AlertCircle, title: t('pain.forgotten'), text: t('pain.forgottenText') },
              { icon: Eye, title: t('pain.visibility'), text: t('pain.visibilityText') },
              { icon: ClipboardList, title: t('pain.clarity'), text: t('pain.clarityText') },
              { icon: BookOpen, title: t('pain.scattered'), text: t('pain.scatteredText') },
            ].map(({ icon: Icon, title, text }) => (
              <article key={title} className="landing-card landing-card--flat">
                <div className="landing-card-icon landing-card-icon--muted"><Icon size={20} strokeWidth={1.75} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="landing-section">
          <div className="landing-container landing-section-head">
            <h2>{t('features.title')}</h2>
          </div>
          <div className="landing-container landing-features-grid">
            {[
              { icon: MapPin, title: t('features.fieldMgmt'), text: t('features.fieldMgmtText'), badge: '12 fields' },
              { icon: Sprout, title: t('features.lifecycle'), text: t('features.lifecycleText'), badge: 'Low season' },
              { icon: CalendarDays, title: t('features.calendar'), text: t('features.calendarText'), badge: 'This week' },
              { icon: Users, title: t('features.assignments'), text: t('features.assignmentsText'), badge: '3 assigned' },
              { icon: Activity, title: t('features.activity'), text: t('features.activityText'), badge: '24 logged' },
              { icon: Wallet, title: t('features.expenses'), text: t('features.expensesText'), badge: '€ tracked' },
            ].map(({ icon: Icon, title, text, badge }) => (
              <article key={title} className="landing-feature">
                <div className="landing-feature-top">
                  <div className="landing-card-icon"><Icon size={20} strokeWidth={1.75} /></div>
                  <span className="landing-feature-badge">{badge}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Web app */}
        <section id="web-app" className="landing-section landing-section--olive">
          <div className="landing-container">
            <div className="landing-section-head landing-section-head--light">
              <h2>{t('web.title')}</h2>
              <p>{t('web.text')}</p>
            </div>
            <div className="landing-web-tabs" role="tablist">
              {webTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={webTab === tab.id}
                  className={webTab === tab.id ? 'active' : ''}
                  onClick={() => setWebTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="landing-web-preview" role="tabpanel">
              <div className={`landing-web-mock landing-web-mock--${webTab}`}>
                <div className="landing-web-mock-chrome">
                  <Monitor size={14} aria-hidden />
                  <span>{webTabs.find((x) => x.id === webTab)?.label}</span>
                </div>
                <div className="landing-web-mock-body" />
              </div>
              <p className="landing-web-desc">{webTabs.find((x) => x.id === webTab)?.desc}</p>
            </div>
          </div>
        </section>

        {/* Mobile */}
        <section id="mobile-app" className="landing-section">
          <div className="landing-container landing-mobile-grid">
            <div>
              <h2>{t('mobile.title')}</h2>
              <p className="landing-lead">{t('mobile.text')}</p>
              <a href={ALPHA_APK_URL} download={ALPHA_APK_FILENAME} className="landing-btn landing-btn--primary">
                <Download size={18} aria-hidden />
                {t('mobile.cta')}
              </a>
              <p className="landing-note">{t('mobile.note')}</p>
            </div>
            <div className="landing-mobile-phones">
              {[
                { title: t('mobile.todayTitle'), text: t('mobile.todayText') },
                { title: t('mobile.detailTitle'), text: t('mobile.detailText') },
                { title: t('mobile.activityTitle'), text: t('mobile.activityText') },
                { title: t('mobile.calendarTitle'), text: t('mobile.calendarText') },
              ].map(({ title, text }, i) => (
                <div key={title} className={`landing-phone-card landing-phone-card--${i + 1}`}>
                  <Smartphone size={16} aria-hidden />
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Audience */}
        <section className="landing-section landing-section--muted">
          <div className="landing-container landing-section-head">
            <h2>{t('audience.title')}</h2>
          </div>
          <div className="landing-container landing-audience-grid">
            <article className="landing-audience-card">
              <h3>{t('audience.ownerTitle')}</h3>
              <ul>
                {(t('audience.ownerBenefits', { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}><Check size={16} aria-hidden />{item}</li>
                ))}
              </ul>
              <button type="button" className="landing-btn landing-btn--outline" onClick={() => setDemoOpen(true)}>
                {t('audience.ownerCta')}
              </button>
            </article>
            <article className="landing-audience-card landing-audience-card--accent">
              <h3>{t('audience.producerTitle')}</h3>
              <ul>
                {(t('audience.producerBenefits', { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}><Check size={16} aria-hidden />{item}</li>
                ))}
              </ul>
              <a href={ALPHA_APK_URL} download={ALPHA_APK_FILENAME} className="landing-btn landing-btn--primary">
                {t('audience.producerCta')}
              </a>
            </article>
          </div>
        </section>

        {/* Steps */}
        <section className="landing-section">
          <div className="landing-container landing-section-head">
            <h2>{t('steps.title')}</h2>
          </div>
          <div className="landing-container landing-steps">
            {[
              { n: 1, title: t('steps.step1Title'), text: t('steps.step1Text') },
              { n: 2, title: t('steps.step2Title'), text: t('steps.step2Text') },
              { n: 3, title: t('steps.step3Title'), text: t('steps.step3Text') },
            ].map(({ n, title, text }) => (
              <article key={n} className="landing-step">
                <span className="landing-step-num">{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="landing-section landing-section--muted">
          <div className="landing-container landing-section-head">
            <h2>{t('pricing.title')}</h2>
            <p>{t('pricing.subtitle')}</p>
          </div>
          <div className="landing-container landing-pricing-grid">
            <article className="landing-price landing-price--featured">
              <span className="landing-price-badge">{t('pricing.alphaBadge')}</span>
              <h3>{t('pricing.alphaName')}</h3>
              <p className="landing-price-amount">{t('pricing.alphaPrice')}</p>
              <p className="landing-price-for">{t('pricing.alphaFor')}</p>
              <ul>
                {(t('pricing.alphaIncludes', { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}><Check size={14} aria-hidden />{item}</li>
                ))}
              </ul>
              <a href={ALPHA_APK_URL} download={ALPHA_APK_FILENAME} className="landing-btn landing-btn--primary landing-btn--block">
                {t('pricing.alphaCta')}
              </a>
            </article>
            <article className="landing-price">
              <h3>{t('pricing.ownerName')}</h3>
              <p className="landing-price-amount">{t('pricing.ownerPrice')}</p>
              <p className="landing-price-for">{t('pricing.ownerFor')}</p>
              <ul>
                {(t('pricing.ownerIncludes', { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}><Check size={14} aria-hidden />{item}</li>
                ))}
              </ul>
              <button type="button" className="landing-btn landing-btn--outline landing-btn--block" onClick={() => setDemoOpen(true)}>
                {t('pricing.ownerCta')}
              </button>
            </article>
            <article className="landing-price">
              <h3>{t('pricing.teamName')}</h3>
              <p className="landing-price-amount">{t('pricing.teamPrice')}</p>
              <p className="landing-price-for">{t('pricing.teamFor')}</p>
              <ul>
                {(t('pricing.teamIncludes', { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}><Check size={14} aria-hidden />{item}</li>
                ))}
              </ul>
              <button type="button" className="landing-btn landing-btn--outline landing-btn--block" onClick={() => setDemoOpen(true)}>
                {t('pricing.teamCta')}
              </button>
            </article>
          </div>
        </section>

        {/* Alpha APK */}
        <section id="alpha-apk" className="landing-section">
          <div className="landing-container landing-alpha-grid">
            <div className="landing-section-head">
              <h2>{t('alpha.title')}</h2>
              <p>{t('alpha.text')}</p>
            </div>
            <article className="landing-apk-card">
              <div className="landing-apk-head">
                <Leaf size={28} aria-hidden />
                <div>
                  <h3>{t('alpha.cardTitle')}</h3>
                  <span className="landing-apk-status">{t('alpha.statusValue')}</span>
                </div>
              </div>
              <dl className="landing-apk-meta">
                <div><dt>{t('alpha.version')}</dt><dd>{t('alpha.versionValue')}</dd></div>
                <div><dt>{t('alpha.platform')}</dt><dd>{t('alpha.platformValue')}</dd></div>
                <div><dt>{t('alpha.updated')}</dt><dd>{t('alpha.updatedValue')}</dd></div>
                <div><dt>{t('alpha.size')}</dt><dd>{t('alpha.sizeValue')}</dd></div>
              </dl>
              <a href={ALPHA_APK_URL} download={ALPHA_APK_FILENAME} className="landing-btn landing-btn--primary landing-btn--block">
                <Download size={18} aria-hidden />
                {t('alpha.download')}
              </a>
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
                    {(t('alpha.installSteps', { returnObjects: true }) as string[]).map((step, i) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              <p className="landing-apk-warning"><AlertCircle size={14} aria-hidden />{t('alpha.safety')}</p>
              <p className="landing-apk-warning landing-apk-warning--soft">{t('alpha.dataWarning')}</p>
            </article>
          </div>
        </section>

        {/* Roadmap */}
        <section className="landing-section landing-section--muted">
          <div className="landing-container landing-section-head">
            <h2>{t('roadmap.title')}</h2>
            <p className="landing-roadmap-note">{t('roadmap.disclaimer')}</p>
          </div>
          <div className="landing-container landing-roadmap-grid">
            {[
              { title: t('roadmap.now'), items: t('roadmap.nowItems', { returnObjects: true }) as string[] },
              { title: t('roadmap.next'), items: t('roadmap.nextItems', { returnObjects: true }) as string[] },
              { title: t('roadmap.later'), items: t('roadmap.laterItems', { returnObjects: true }) as string[] },
            ].map(({ title, items }) => (
              <article key={title} className="landing-roadmap-col">
                <h3>{title}</h3>
                <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ */}
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

        {/* Final CTA */}
        <section className="landing-cta">
          <div className="landing-container landing-cta-inner">
            <h2>{t('cta.title')}</h2>
            <p>{t('cta.text')}</p>
            <div className="landing-hero-ctas landing-hero-ctas--centered">
              <Link to="/login" className="landing-btn landing-btn--light">
                <LogIn size={18} aria-hidden />
                {t('hero.ctaLogin')}
              </Link>
              <a href={ALPHA_APK_URL} className="landing-btn landing-btn--ghost">
                <Download size={18} aria-hidden />
                {t('cta.download')}
              </a>
              <button type="button" className="landing-btn landing-btn--ghost" onClick={() => setDemoOpen(true)}>
                {t('cta.demo')}
              </button>
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
                <button key={id} type="button" onClick={() => scrollTo(id)}>{t(`header.${key}`)}</button>
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
              {(['en', 'el'] as SupportedLocale[]).map((code) => (
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
          <div className="landing-modal" role="dialog" aria-labelledby="demo-title" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="landing-modal-close" onClick={() => setDemoOpen(false)} aria-label="Close">
              <X size={20} />
            </button>
            <h2 id="demo-title">{t('demo.title')}</h2>
            <p>{t('demo.subtitle')}</p>
            <form onSubmit={submitDemo}>
              <label>
                {t('demo.name')}
                <input required value={demoForm.name} onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })} />
              </label>
              <label>
                {t('demo.email')}
                <input type="email" required value={demoForm.email} onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })} />
              </label>
              <label>
                {t('demo.organization')}
                <input value={demoForm.org} onChange={(e) => setDemoForm({ ...demoForm, org: e.target.value })} />
              </label>
              <label>
                {t('demo.message')}
                <textarea rows={4} value={demoForm.message} onChange={(e) => setDemoForm({ ...demoForm, message: e.target.value })} />
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
