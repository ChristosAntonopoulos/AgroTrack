import React, { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { OwnerActivationStepId } from '../../onboarding/steps';
import { ONBOARDING_TARGETS } from '../../onboarding/steps';
import './FocusSpotlight.css';

type Props = {
  step: OwnerActivationStepId;
  /** When omitted, Escape does nothing (createGrove must finish name/colour). */
  onSkip?: () => void;
};

type Rect = { top: number; left: number; width: number; height: number };

type BoundaryFocus = 'search' | 'map';

const PAD = 8;

const unionRect = (rects: DOMRect[]): Rect | null => {
  if (!rects.length) return null;
  let top = rects[0].top;
  let left = rects[0].left;
  let right = rects[0].right;
  let bottom = rects[0].bottom;
  for (let i = 1; i < rects.length; i += 1) {
    const r = rects[i];
    top = Math.min(top, r.top);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  return {
    top: Math.max(0, top - PAD),
    left: Math.max(0, left - PAD),
    width: right - left + PAD * 2,
    height: bottom - top + PAD * 2,
  };
};

const queryRect = (selector: string): DOMRect | null => {
  const el = document.querySelector(selector);
  return el ? el.getBoundingClientRect() : null;
};

const readBoundaryFocus = (): BoundaryFocus => {
  const root = document.querySelector('[data-onboarding-boundary-phase]');
  const phase = root?.getAttribute('data-onboarding-boundary-phase');
  const located = root?.getAttribute('data-onboarding-located') === 'true';
  if (phase === 'locate' && !located) return 'search';
  if (!located && phase !== 'drawing' && phase !== 'done') return 'search';
  return 'map';
};

/** Dim + ring only — tip lives in the top activation bar so the map stays clear. */
const FocusSpotlight: React.FC<Props> = ({ step, onSkip }) => {
  const { t } = useTranslation('onboarding');
  const [rect, setRect] = useState<Rect | null>(null);

  const measure = () => {
    if (step === 'createGrove') {
      const parts = [
        queryRect(`[data-onboarding-target="${ONBOARDING_TARGETS.groveName}"]`),
        queryRect(`[data-onboarding-target="${ONBOARDING_TARGETS.groveColor}"]`),
        queryRect(`[data-onboarding-target="${ONBOARDING_TARGETS.createCta}"]`),
      ].filter((r): r is DOMRect => Boolean(r));
      setRect(unionRect(parts));
      return;
    }

    const focus = readBoundaryFocus();
    const primary =
      focus === 'search'
        ? queryRect(`[data-onboarding-target="${ONBOARDING_TARGETS.boundarySearch}"]`)
        : queryRect(`[data-onboarding-target="${ONBOARDING_TARGETS.boundaryMap}"]`);
    if (!primary) {
      setRect(null);
      return;
    }

    const parts = [primary];
    const el =
      focus === 'search'
        ? document.querySelector(`[data-onboarding-target="${ONBOARDING_TARGETS.boundarySearch}"]`)
        : document.querySelector(`[data-onboarding-target="${ONBOARDING_TARGETS.boundaryMap}"]`);
    const menu = el?.querySelector('.boundary-place-suggestions, .location-search-results');
    if (menu) parts.push(menu.getBoundingClientRect());

    if (focus === 'map') {
      const save = queryRect(`[data-onboarding-target="${ONBOARDING_TARGETS.boundarySave}"]`);
      if (save) parts.push(save);
    }

    setRect(unionRect(parts));
  };

  useLayoutEffect(() => {
    measure();
  }, [step]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    // Gentle remeasure — CSS transitions smooth the visual jump between targets.
    const id = window.setInterval(measure, 900);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      window.clearInterval(id);
    };
  }, [step]);

  // After a step change, wait a frame so the new target is laid out, then ease onto it.
  useEffect(() => {
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => measure());
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [step]);

  useEffect(() => {
    if (!onSkip) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  if (!rect) return null;

  const label =
    step === 'createGrove'
      ? t('spotlight.createGrove.title')
      : t('spotlight.drawBoundary.title');

  return createPortal(
    <div className="focus-spotlight" role="presentation" aria-hidden>
      <div className="focus-spotlight-block" style={{ top: 0, left: 0, right: 0, height: rect.top }} />
      <div
        className="focus-spotlight-block"
        style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }}
      />
      <div
        className="focus-spotlight-block"
        style={{
          top: rect.top,
          left: rect.left + rect.width,
          right: 0,
          height: rect.height,
        }}
      />
      <div
        className="focus-spotlight-block"
        style={{ top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }}
      />
      <div
        className="focus-spotlight-ring"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
        aria-label={label}
      />
    </div>,
    document.body
  );
};

export default FocusSpotlight;
