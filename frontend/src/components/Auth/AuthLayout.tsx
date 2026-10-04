import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Shield } from 'lucide-react';
import { useLocale } from '../../context/LocaleProvider';
import { useTheme } from '../../context/ThemeContext';
import { SUPPORTED_LOCALES, SupportedLocale } from '../../i18n/config';
import BrandLogo from '../Common/BrandLogo';
import ThemeModeToggle from '../Common/ThemeModeToggle';
import LoginHero from './LoginHero';
import '../../pages/LoginPage.css';

const ease = [0.22, 1, 0.36, 1] as const;

const AuthLayout: React.FC = () => {
  const { t } = useTranslation(['auth', 'common', 'settings']);
  const { locale, setLocale } = useLocale();
  const { resolvedTheme } = useTheme();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const isDarkTheme = resolvedTheme === 'dark';
  const isRegister = location.pathname.startsWith('/register');
  const bilingualLocales = SUPPORTED_LOCALES.filter((l) => l.code === 'en' || l.code === 'el');

  return (
    <div
      className={`login-page${isRegister ? ' register-page' : ''}${
        isDarkTheme ? ' login-page--dark' : ' login-page--light'
      }`}
    >
      <div className="login-page-bg" aria-hidden="true" />

      <div className="login-page-chrome" aria-label={t('common:preferences', { defaultValue: 'Preferences' })}>
        <ThemeModeToggle surface="auth" />

        <div className="login-lang-switch" role="group" aria-label={t('common:language', { defaultValue: 'Language' })}>
          {bilingualLocales.map((lang, index) => (
            <React.Fragment key={lang.code}>
              {index > 0 && <span className="login-lang-sep" aria-hidden>|</span>}
              <button
                type="button"
                className={locale === lang.code ? 'active' : ''}
                onClick={() => setLocale(lang.code as SupportedLocale)}
                aria-pressed={locale === lang.code}
              >
                {lang.code.toUpperCase()}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="login-page-layout">
        <section
          className={`login-page-hero${isRegister ? ' login-page-hero--register' : ''}`}
          aria-label={t('auth:login.heroEyebrow')}
        >
          <div className="login-page-hero-media" aria-hidden="true">
            <AnimatePresence initial={false}>
              <motion.div
                key={isRegister ? 'register-bg' : 'login-bg'}
                className={`login-page-hero-photo login-page-hero-photo--${isRegister ? 'register' : 'login'}`}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.7, ease }}
              />
            </AnimatePresence>
          </div>
          <LoginHero variant={isRegister ? 'register' : 'login'} />
        </section>

        <section className="login-page-panel">
          <div className="login-card">
            <div className="login-card-brand">
              <div className="login-card-lockup">
                <BrandLogo
                  variant="stacked"
                  tone={isDarkTheme ? 'on-dark' : 'on-light'}
                  size="lg"
                  alt={t('auth:login.appName')}
                />
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                className="login-card-body"
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -14 }}
                transition={{ duration: 0.42, ease }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="login-mobile-belief">
            {t(isRegister ? 'auth:register.heroTitle' : 'auth:login.heroTitle')}
          </p>

          <p className="login-security">
            <Shield size={14} aria-hidden />
            {t('auth:login.securityNote')}
          </p>
        </section>
      </div>
    </div>
  );
};

export default AuthLayout;
