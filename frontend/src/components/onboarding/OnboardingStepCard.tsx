import React from 'react';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../Common/BrandLogo';
import { ONBOARDING_JOURNEY_TOTAL } from '../../onboarding/steps';
import './NavCoach.css';

type Props = {
  step: number;
  title: string;
  body: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/** Shared onboarding card: step number, one outcome, a note from the team. */
const OnboardingStepCard: React.FC<Props> = ({ step, title, body, className, style, children }) => {
  const { t } = useTranslation('onboarding');

  return (
    <article className={className} style={style}>
      <span className="onboarding-step-badge" aria-hidden>
        {step}
      </span>
      <header className="nav-coach-top">
        <BrandLogo variant="mark" tone="on-light" size="xs" />
        <span className="nav-coach-progress">
          {t('coach.progress', { current: step, total: ONBOARDING_JOURNEY_TOTAL })}
        </span>
      </header>
      <h2>{title}</h2>
      <p>{body}</p>
      {children}
      <ol className="nav-coach-dots" aria-hidden>
        {Array.from({ length: ONBOARDING_JOURNEY_TOTAL }, (_, index) => (
          <li
            key={index}
            className={index + 1 === step ? 'is-current' : index + 1 < step ? 'is-done' : undefined}
          />
        ))}
      </ol>
      <p className="nav-coach-team">{t('coach.team')}</p>
    </article>
  );
};

export default OnboardingStepCard;
