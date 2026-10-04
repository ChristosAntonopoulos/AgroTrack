import { useEffect, useState } from 'react';

/**
 * Month key (`year-month`) of the chapter that has reached the sticky reading line.
 * Days and month headings both carry `data-month-key`, so a virtualized list still
 * reports the month under the label from whichever row is actually on screen.
 */
export const useReadingMonthKey = (resetKey: string): string | null => {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const sync = () => {
      const bar = document.querySelector('.chrono-now-reading');
      const sticky = document.querySelector('.chronologio-sticky');
      const edge =
        (bar?.getBoundingClientRect().bottom ??
          sticky?.getBoundingClientRect().bottom ??
          96) + 8;
      let key: string | null = null;
      document.querySelectorAll<HTMLElement>('[data-month-key]').forEach((node) => {
        if (node.getBoundingClientRect().top <= edge) {
          key = node.dataset.monthKey || key;
        }
      });
      if (!key) {
        key = document.querySelector<HTMLElement>('[data-month-key]')?.dataset.monthKey || null;
      }
      setActive((prev) => (prev === key ? prev : key));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    };
    sync();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [resetKey]);

  return active;
};
