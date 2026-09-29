import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';
import { onboardingStepNumber, type GuideTargetId } from '../../onboarding/steps';
import OnboardingStepCard from './OnboardingStepCard';
import './NavCoach.css';

const PAD = 8;

const visibleTarget = (id: GuideTargetId): DOMRect | null => {
  const nodes = document.querySelectorAll(`[data-guide-target="${id}"]`);
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) continue;
    if (rect.bottom < 8 || rect.right < 8) continue;
    if (rect.top > window.innerHeight - 8 || rect.left > window.innerWidth - 8) continue;
    return rect;
  }
  return null;
};

/** Dims the page around one control and names the next tap. */
const NavCoach: React.FC = () => {
  const activation = useOwnerActivationOptional();
  const { t } = useTranslation('onboarding');
  const beat = activation?.guideBeat ?? null;
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!beat) {
      setRect(null);
      return;
    }
    const measure = () => {
      const next = visibleTarget(beat);
      setRect((prev) => {
        if (!next) return null;
        if (
          prev &&
          Math.abs(prev.x - next.x) < 1 &&
          Math.abs(prev.y - next.y) < 1 &&
          Math.abs(prev.width - next.width) < 1 &&
          Math.abs(prev.height - next.height) < 1
        ) {
          return prev;
        }
        return next;
      });
    };
    measure();
    const interval = window.setInterval(measure, 300);
    window.addEventListener('resize', measure);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', measure);
    };
  }, [beat]);

  if (!beat || !rect) return null;

  const hole = {
    left: Math.max(0, rect.left - PAD),
    top: Math.max(0, rect.top - PAD),
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };
  const holeBottom = hole.top + hole.height;
  const holeRight = hole.left + hole.width;
  const welcome = beat === 'fieldsNav';
  const step = onboardingStepNumber(beat);
  const placeBelow = hole.top < window.innerHeight * 0.42 || holeBottom + 220 < window.innerHeight;
  const cardWidth = Math.min(360, window.innerWidth - 32);
  const cardLeft = Math.min(Math.max(16, hole.left), window.innerWidth - cardWidth - 16);

  return createPortal(
    <div className="nav-coach" role="dialog" aria-label={t(`coach.${beat}.title`)}>
      <div className="nav-coach-dim" style={{ top: 0, left: 0, right: 0, height: hole.top }} />
      <div className="nav-coach-dim" style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} />
      <div className="nav-coach-dim" style={{ top: hole.top, left: holeRight, right: 0, height: hole.height }} />
      <div className="nav-coach-dim" style={{ top: holeBottom, left: 0, right: 0, bottom: 0 }} />
      <div
        className="nav-coach-ring"
        style={{
          left: hole.left,
          top: hole.top,
          width: hole.width,
          height: hole.height,
          borderRadius: beat === 'homeButton' ? 12 : 14,
        }}
      />
      <OnboardingStepCard
        step={step}
        title={t(`coach.${beat}.title`)}
        body={t(`coach.${beat}.body`)}
        className={welcome ? 'nav-coach-card nav-coach-card--welcome' : 'nav-coach-card'}
        style={
          welcome
            ? undefined
            : placeBelow
              ? { top: holeBottom + 16, left: cardLeft, width: cardWidth }
              : { bottom: window.innerHeight - hole.top + 16, left: cardLeft, width: cardWidth }
        }
      />
    </div>,
    document.body
  );
};

export default NavCoach;
