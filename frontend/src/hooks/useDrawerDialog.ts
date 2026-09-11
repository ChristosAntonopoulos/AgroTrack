import { useEffect, useId, useRef } from 'react';

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

type Options = {
  open: boolean;
  onClose: () => void;
  /** Change this when the drawer shows a different record so the body resets to the top. */
  resetKey?: string;
};

type StackEntry = {
  panel: HTMLElement | null;
  onClose: () => void;
};

const stack: StackEntry[] = [];
let keyBound = false;

const top = () => stack[stack.length - 1];

const onDocumentKey = (event: KeyboardEvent) => {
  const current = top();
  if (!current) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    current.onClose();
    return;
  }

  if (event.key !== 'Tab' || !current.panel) return;
  const focusable = Array.from(current.panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
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

const bindKeys = () => {
  if (keyBound) return;
  document.addEventListener('keydown', onDocumentKey);
  keyBound = true;
};

const unbindKeys = () => {
  if (!keyBound || stack.length > 0) return;
  document.removeEventListener('keydown', onDocumentKey);
  keyBound = false;
};

/**
 * Shared drawer chrome: lock background scroll, reset the body scroll
 * container to the top, move focus to the heading, restore it on close.
 * Nested drawers share one scroll lock and only the topmost handles Escape.
 */
export function useDrawerDialog({ open, onClose, resetKey }: Options) {
  const headingId = useId();
  const drawerScrollContainer = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const entryRef = useRef<StackEntry | null>(null);

  useEffect(() => {
    if (!open) return;

    const active = document.activeElement;
    triggerRef.current = active instanceof HTMLElement ? active : null;

    const root = document.getElementById('root');
    const previousOverflow = document.body.style.overflow;
    const previousInert = root instanceof HTMLElement ? root.hasAttribute('inert') : false;
    const wasFirst = stack.length === 0;

    if (wasFirst) {
      document.body.style.overflow = 'hidden';
      if (root instanceof HTMLElement) {
        root.setAttribute('inert', '');
        root.inert = true;
      }
    }

    const entry: StackEntry = {
      panel: panelRef.current,
      onClose: () => onCloseRef.current(),
    };
    entryRef.current = entry;
    stack.push(entry);
    bindKeys();

    const resetScrollAndFocus = () => {
      entry.panel = panelRef.current;
      drawerScrollContainer.current?.scrollTo?.({ top: 0, left: 0 });
      if (panelRef.current) panelRef.current.scrollTop = 0;
      headingRef.current?.focus({ preventScroll: true });
    };

    const frame = window.requestAnimationFrame(resetScrollAndFocus);
    const later = window.setTimeout(resetScrollAndFocus, 220);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(later);
      const idx = stack.lastIndexOf(entry);
      if (idx >= 0) stack.splice(idx, 1);
      entryRef.current = null;
      unbindKeys();
      if (stack.length === 0) {
        document.body.style.overflow = previousOverflow;
        if (root instanceof HTMLElement) {
          root.inert = previousInert;
          if (previousInert) root.setAttribute('inert', '');
          else root.removeAttribute('inert');
        }
      }
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (entryRef.current) entryRef.current.panel = panelRef.current;
    drawerScrollContainer.current?.scrollTo?.({ top: 0, left: 0 });
    if (panelRef.current) panelRef.current.scrollTop = 0;
    headingRef.current?.focus({ preventScroll: true });
  }, [open, resetKey]);

  return {
    headingId,
    headingRef,
    panelRef,
    drawerScrollContainer,
  };
}
