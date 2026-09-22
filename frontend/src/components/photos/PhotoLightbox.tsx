import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, X } from 'lucide-react';
import PhotoFrame from './PhotoFrame';
import './PhotoLightbox.css';

export type PhotoLightboxItem = {
  id: string;
  src: string;
  alt?: string;
  thumbnailSrc?: string;
  context?: string;
};

export type PhotoLightboxProps = {
  open: boolean;
  items: PhotoLightboxItem[];
  index: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  /** When details are open, Escape closes them first and leaves the viewer up. */
  detailsOpen?: boolean;
  onCloseDetails?: () => void;
  /** Tap the photo (without pan/zoom) to open or edit details. */
  onImageActivate?: () => void;
  sidePanel?: React.ReactNode;
  footerAction?: React.ReactNode;
};

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
};

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  open,
  items,
  index,
  onClose,
  onIndexChange,
  detailsOpen = false,
  onCloseDetails,
  onImageActivate,
  sidePanel,
  footerAction,
}) => {
  const { t } = useTranslation('photos');
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(index);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    if (open) setActive(index);
  }, [index, open]);

  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, [active, open]);

  const count = items.length;
  const safeIndex = count === 0 ? 0 : Math.max(0, Math.min(active, count - 1));
  const current = count > 0 ? items[safeIndex] : null;
  const atStart = safeIndex <= 0;
  const atEnd = safeIndex >= count - 1;
  const canNav = count > 1;

  const go = useCallback(
    (delta: number) => {
      if (!canNav) return;
      setActive((prev) => {
        const next = Math.max(0, Math.min(count - 1, prev + delta));
        if (next === prev) return prev;
        onIndexChange?.(next);
        return next;
      });
    },
    [canNav, count, onIndexChange]
  );

  const requestClose = useCallback(() => {
    if (detailsOpen) {
      onCloseDetails?.();
      return;
    }
    onClose();
  }, [detailsOpen, onClose, onCloseDetails]);

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
        requestClose();
        return;
      }
      if (isTypingTarget(event.target)) return;
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
  }, [go, open, requestClose]);

  if (!open || !current || typeof document === 'undefined') return null;

  const zoomTo = (next: number) => {
    const clamped = Math.min(3, Math.max(1, next));
    setScale(clamped);
    if (clamped === 1) setPan({ x: 0, y: 0 });
  };

  const onWheel = (event: React.WheelEvent) => {
    if (!event.ctrlKey && Math.abs(event.deltaY) < 8) return;
    event.preventDefault();
    zoomTo(scale + (event.deltaY < 0 ? 0.25 : -0.25));
  };

  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  return createPortal(
    <div
      className={`photo-lightbox${sidePanel ? ' is-split' : ''}`}
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
        onClick={requestClose}
      />
      <div className="photo-lightbox-main">
        <div className="photo-lightbox-chrome">
          <div className="photo-lightbox-context" id={titleId}>
            {current.context ? <p className="photo-lightbox-context-title">{current.context}</p> : null}
            <p className="photo-lightbox-counter">
              {t('viewer.counter', { current: safeIndex + 1, total: count })}
            </p>
          </div>
          <div className="photo-lightbox-chrome-actions">
            <button
              type="button"
              className="photo-lightbox-btn"
              onClick={() => zoomTo(scale + 0.5)}
              aria-label={t('viewer.zoomIn')}
              disabled={scale >= 3}
            >
              <Plus size={18} aria-hidden />
            </button>
            <button
              type="button"
              className="photo-lightbox-btn"
              onClick={() => zoomTo(scale - 0.5)}
              aria-label={t('viewer.zoomOut')}
              disabled={scale <= 1}
            >
              <Minus size={18} aria-hidden />
            </button>
            <button
              type="button"
              className="photo-lightbox-btn"
              onClick={() => zoomTo(1)}
              aria-label={t('viewer.zoomReset')}
              disabled={scale === 1}
            >
              <RotateCcw size={18} aria-hidden />
            </button>
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
        </div>

        {canNav ? (
          <button
            type="button"
            className="photo-lightbox-btn photo-lightbox-nav is-prev"
            onClick={() => go(-1)}
            aria-label={t('viewer.prev')}
            disabled={atStart}
          >
            <ChevronLeft size={28} aria-hidden />
          </button>
        ) : null}

        <div
          className="photo-lightbox-stage"
          onWheel={onWheel}
          onPointerDown={(event) => {
            (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
            pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (pointers.current.size === 2) {
              const [a, b] = Array.from(pointers.current.values());
              pinch.current = { distance: distance(a, b), scale };
              drag.current = null;
            } else if (scale > 1) {
              drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
            } else {
              drag.current = { x: event.clientX, y: event.clientY, panX: 0, panY: 0 };
            }
          }}
          onPointerMove={(event) => {
            if (!pointers.current.has(event.pointerId)) return;
            pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (pointers.current.size === 2 && pinch.current) {
              const [a, b] = Array.from(pointers.current.values());
              const next = pinch.current.distance
                ? pinch.current.scale * (distance(a, b) / pinch.current.distance)
                : pinch.current.scale;
              zoomTo(next);
              return;
            }
            if (!drag.current) return;
            const dx = event.clientX - drag.current.x;
            const dy = event.clientY - drag.current.y;
            if (scale > 1) {
              setPan({ x: drag.current.panX + dx, y: drag.current.panY + dy });
            }
          }}
          onPointerUp={(event) => {
            const start = drag.current;
            pointers.current.delete(event.pointerId);
            if (pointers.current.size < 2) pinch.current = null;
            if (pointers.current.size === 0 && start && scale === 1) {
              const dx = event.clientX - start.x;
              const dy = event.clientY - start.y;
              if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.4) {
                go(dx < 0 ? 1 : -1);
              } else if (Math.hypot(dx, dy) < 12) {
                onImageActivate?.();
              }
            }
            if (pointers.current.size === 0) drag.current = null;
          }}
          onPointerCancel={() => {
            pointers.current.clear();
            pinch.current = null;
            drag.current = null;
          }}
        >
          <div
            className="photo-lightbox-zoom"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
          >
            <PhotoFrame
              key={current.id}
              src={current.src}
              alt={current.alt || t('detail.title')}
              fit="contain"
              className={`photo-lightbox-frame${onImageActivate ? ' is-editable' : ''}`}
            />
          </div>
        </div>

        {canNav ? (
          <button
            type="button"
            className="photo-lightbox-btn photo-lightbox-nav is-next"
            onClick={() => go(1)}
            aria-label={t('viewer.next')}
            disabled={atEnd}
          >
            <ChevronRight size={28} aria-hidden />
          </button>
        ) : null}

        {footerAction ? <div className="photo-lightbox-footer">{footerAction}</div> : null}
      </div>
      {sidePanel ? (
        <aside className="photo-lightbox-panel" aria-label={t('viewer.openDetails')}>
          {sidePanel}
        </aside>
      ) : null}
    </div>,
    document.body
  );
};

export default PhotoLightbox;
