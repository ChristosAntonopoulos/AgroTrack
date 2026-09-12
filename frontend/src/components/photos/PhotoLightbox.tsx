import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import './PhotoLightbox.css';

export type PhotoLightboxItem = {
  id: string;
  src: string;
  alt?: string;
  thumbnailSrc?: string;
};

export type PhotoLightboxProps = {
  open: boolean;
  items: PhotoLightboxItem[];
  index: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
};

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Fullscreen photo viewer shared across Photo Hub, Chronologio, and media grids.
 * Keyboard: ←/→ navigate, Esc closes (capture phase so drawers stay open underneath).
 */
const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  open,
  items,
  index,
  onClose,
  onIndexChange,
}) => {
  const { t } = useTranslation('photos');
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(index);

  useEffect(() => {
    if (open) setActive(index);
  }, [index, open]);

  const count = items.length;
  const safeIndex = count === 0 ? 0 : ((active % count) + count) % count;
  const current = count > 0 ? items[safeIndex] : null;
  const canNav = count > 1;

  const go = useCallback(
    (delta: number) => {
      if (!canNav) return;
      setActive((prev) => {
        const next = (prev + delta + count) % count;
        onIndexChange?.(next);
        return next;
      });
    },
    [canNav, count, onIndexChange]
  );

  useEffect(() => {
    if (!open) return;

    const activeEl = document.activeElement;
    triggerRef.current = activeEl instanceof HTMLElement ? activeEl : null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      closeBtnRef.current?.focus({ preventScroll: true });
    }, 20);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(-1);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        go(1);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => !node.hasAttribute('disabled') && node.getAttribute('aria-hidden') !== 'true'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', onKey, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      triggerRef.current?.focus?.({ preventScroll: true });
    };
  }, [go, onClose, open]);

  if (!open || !current || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="photo-lightbox"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      ref={dialogRef}
    >
      <button
        type="button"
        className="photo-lightbox-backdrop"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="photo-lightbox-chrome">
        <p id={titleId} className="photo-lightbox-counter">
          {t('viewer.counter', { current: safeIndex + 1, total: count })}
        </p>
        <button
          ref={closeBtnRef}
          type="button"
          className="photo-lightbox-btn photo-lightbox-close"
          onClick={onClose}
          aria-label={t('viewer.close')}
        >
          <X size={22} aria-hidden />
        </button>
      </div>

      {canNav ? (
        <button
          type="button"
          className="photo-lightbox-btn photo-lightbox-nav is-prev"
          onClick={() => go(-1)}
          aria-label={t('viewer.prev')}
        >
          <ChevronLeft size={28} aria-hidden />
        </button>
      ) : null}

      <div className="photo-lightbox-stage">
        <img
          key={current.id}
          src={current.src}
          alt={current.alt || t('detail.title')}
          className="photo-lightbox-image"
          draggable={false}
        />
      </div>

      {canNav ? (
        <button
          type="button"
          className="photo-lightbox-btn photo-lightbox-nav is-next"
          onClick={() => go(1)}
          aria-label={t('viewer.next')}
        >
          <ChevronRight size={28} aria-hidden />
        </button>
      ) : null}
    </div>,
    document.body
  );
};

export default PhotoLightbox;
