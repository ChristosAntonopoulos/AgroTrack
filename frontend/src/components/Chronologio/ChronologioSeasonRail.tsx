import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { agriculturalYearFor } from '../../chronologio/agriculturalYear';

type Props = {
  years: number[];
  activeYear: number;
  onSelectYear: (year: number) => void;
};

const ChronologioSeasonRail: React.FC<Props> = ({ years, activeYear, onSelectYear }) => {
  const { t } = useTranslation('chronologio');
  const reduceMotion = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const currentAgri = agriculturalYearFor(new Date());
  const ordered = [...years].sort((a, b) => a - b);
  const activeIndex = Math.max(0, ordered.indexOf(activeYear));

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [activeYear, reduceMotion]);

  const step = (delta: -1 | 1) => {
    const next = ordered[activeIndex + delta];
    if (next != null) onSelectYear(next);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'Home' && ordered[0] != null) {
      event.preventDefault();
      onSelectYear(ordered[0]);
    } else if (event.key === 'End' && ordered[ordered.length - 1] != null) {
      event.preventDefault();
      onSelectYear(ordered[ordered.length - 1]);
    }
  };

  if (ordered.length === 0) return null;

  return (
    <nav className="chrono-season-rail" aria-label={t('seasonRail.label')} onKeyDown={onKeyDown}>
      <button
        type="button"
        className="chrono-season-rail-arrow"
        onClick={() => step(-1)}
        disabled={activeIndex <= 0}
        aria-label={t('seasonRail.previous')}
      >
        <ChevronLeft size={20} />
      </button>
      <div className="chrono-season-rail-scroller" ref={scrollerRef}>
        {ordered.map((year) => {
          const active = year === activeYear;
          const current = year === currentAgri;
          return (
            <button
              key={year}
              ref={active ? activeRef : undefined}
              type="button"
              className={`chrono-season-rail-item${active ? ' is-active' : ''}${current ? ' is-current' : ''}`}
              onClick={() => onSelectYear(year)}
              aria-current={active ? 'true' : undefined}
            >
              <span>{year}</span>
              {current ? <span className="chrono-season-rail-badge">{t('seasonRail.inProgress')}</span> : null}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="chrono-season-rail-arrow"
        onClick={() => step(1)}
        disabled={activeIndex >= ordered.length - 1}
        aria-label={t('seasonRail.next')}
      >
        <ChevronRight size={20} />
      </button>
    </nav>
  );
};

export default ChronologioSeasonRail;
