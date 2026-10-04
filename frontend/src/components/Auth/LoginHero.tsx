import React from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import './LoginHero.css';

const PILLARS = ['pillar1', 'pillar2', 'pillar3'] as const;

const ease = [0.22, 1, 0.36, 1] as const;

const OliveSprig: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 72 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      d="M2 22C16 22 28 16 42 10C50 6 58 4 70 3"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M18 22C28 18 38 14 52 11"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.7"
    />
    <ellipse cx="24" cy="12" rx="5" ry="2.2" transform="rotate(-28 24 12)" fill="currentColor" />
    <ellipse cx="36" cy="8.5" rx="4.6" ry="2" transform="rotate(-22 36 8.5)" fill="currentColor" />
    <ellipse cx="48" cy="6" rx="4.2" ry="1.8" transform="rotate(-16 48 6)" fill="currentColor" />
    <ellipse cx="32" cy="18" rx="4.4" ry="1.9" transform="rotate(18 32 18)" fill="currentColor" />
    <ellipse cx="44" cy="14.5" rx="4" ry="1.7" transform="rotate(14 44 14.5)" fill="currentColor" />
  </svg>
);

type Props = {
  variant?: 'login' | 'register';
};

const LoginHero: React.FC<Props> = ({ variant = 'login' }) => {
  const { t } = useTranslation('auth');
  const reduceMotion = useReducedMotion();
  const copyNs = variant === 'register' ? 'register' : 'login';
  const titleKey = `${copyNs}.heroTitle`;
  const subtitleKey = `${copyNs}.heroSubtitle`;

  return (
    <div className="login-hero login-hero--photo">
      <p className="login-hero-eyebrow">{t('login.heroEyebrow')}</p>

      <div className="login-hero-copy">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={variant}
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -16 }}
            transition={{ duration: 0.48, ease }}
          >
            <h1>{t(titleKey)}</h1>
            <p>{t(subtitleKey)}</p>

            <ol className="login-hero-pillars">
              {PILLARS.map((key, index) => (
                <li key={key}>
                  <span aria-hidden>{String(index + 1).padStart(2, '0')}</span>
                  {t(`${copyNs}.${key}`)}
                </li>
              ))}
            </ol>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="login-hero-foot">
        <p className="login-hero-motto">{t('login.motto')}</p>
        <OliveSprig className="login-hero-branch" />
      </div>
    </div>
  );
};

export default LoginHero;
