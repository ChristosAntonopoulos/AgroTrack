import React, { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { nearbyMonthWindow, railMonthLabel, type MonthRailItem } from '../../chronologio/timelineRail';

type Props = {
  label: string;
  labelKey: string;
  months: MonthRailItem[];
  activeKey: string | null;
  onJump: (month: MonthRailItem) => void;
  /** Record counts keyed by `year-month`. Turns the rail into a year navigator. */
  counts?: Record<string, number>;
  /** Months that have a story, even when the record count is zero. */
  activity?: Record<string, boolean>;
  /** Show every month, not only the ones nearest the active one. */
  fullYear?: boolean;
  children: React.ReactNode;
};

const measureReadingTop = () => {
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  const header = parseFloat(styles.getPropertyValue('--header-height')) || 64;
  const safe = parseFloat(styles.getPropertyValue('--safe-top')) || 0;
  const toolbar = document.querySelector('.chronologio-sticky');
  const toolbarHeight = toolbar?.getBoundingClientRect().height ?? 96;
  root.style.setProperty('--chrono-reading-top', `${Math.round(header + safe + toolbarHeight)}px`);
};

/**
 * Sticky month/year chip plus a slim month navigator beside the timeline.
 * The feed itself is the page — this frame does not create a second scroller.
 */
const ChronologioTimelineFrame: React.FC<Props> = ({
  label,
  labelKey,
  months,
  activeKey,
  onJump,
  counts,
  activity,
  fullYear = false,
  children,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const rail = fullYear ? months : nearbyMonthWindow(months, activeKey || months[0]?.key || '');

  useLayoutEffect(() => {
    measureReadingTop();
    const toolbar = document.querySelector('.chronologio-sticky');
    const observer = toolbar ? new ResizeObserver(measureReadingTop) : null;
    if (toolbar && observer) observer.observe(toolbar);
    window.addEventListener('resize', measureReadingTop);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measureReadingTop);
    };
  }, []);

  return (
    <div className="chrono-timeline-frame">
      {label ? (
        <div className="chrono-now-reading">
          <p key={labelKey} className="chrono-now-reading-label">
            {label}
          </p>
        </div>
      ) : null}
      <div className={`chrono-timeline-body${rail.length > 1 ? ' has-rail' : ''}`}>
        {rail.length > 1 ? (
          <nav className="chrono-month-rail" aria-label={t('timeline.monthRail')}>
            {rail.map((month, index) => {
              const selected = month.key === activeKey;
              const name = railMonthLabel(month.month, i18n.language);
              const count = counts?.[month.key] ?? 0;
              const marked = activity ? !!activity[month.key] : count > 0;
              const yearBreak = fullYear && (index === 0 || rail[index - 1].year !== month.year);
              return (
                <React.Fragment key={month.key}>
                {yearBreak ? <span className="chrono-rail-year">{month.year}</span> : null}
                <button
                  type="button"
                  className={`${selected ? 'is-active' : ''}${marked ? ' has-activity' : ''}`}
                  aria-current={selected ? 'true' : undefined}
                  aria-label={t('timeline.jumpToMonth', {
                    month: count > 0 ? `${name} ${month.year}, ${count}` : `${name} ${month.year}`,
                  })}
                  onClick={() => onJump(month)}
                >
                  {fullYear ? <span className="chrono-rail-dot" aria-hidden /> : null}
                  <span>{name}</span>
                  {fullYear && count > 0 ? <span className="chrono-rail-count">{count}</span> : null}
                </button>
                </React.Fragment>
              );
            })}
          </nav>
        ) : null}
        <div className="chrono-timeline-stream">{children}</div>
      </div>
    </div>
  );
};

export default ChronologioTimelineFrame;
