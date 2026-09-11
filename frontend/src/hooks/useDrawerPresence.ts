import { useEffect, useRef, useState } from 'react';

/** Match RightDrawer exit (220ms) plus a short paint buffer. */
export const DRAWER_EXIT_MS = 240;

const exitDelayMs = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return DRAWER_EXIT_MS;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : DRAWER_EXIT_MS;
};

/**
 * Keep a sheet mounted after its trigger clears so RightDrawer can play exit.
 * Drive `open` from the live value; render while `mounted`.
 */
export function useDrawerPresence<T>(value: T | null | undefined | false): {
  mounted: boolean;
  open: boolean;
  value: T | null;
} {
  const active = value ? (value as T) : null;
  const [held, setHeld] = useState<T | null>(active);
  const heldRef = useRef(held);
  heldRef.current = held;

  useEffect(() => {
    if (active != null) {
      setHeld(active);
      return undefined;
    }
    if (heldRef.current == null) return undefined;
    const id = window.setTimeout(() => setHeld(null), exitDelayMs());
    return () => window.clearTimeout(id);
  }, [active]);

  const current = active ?? held;

  return {
    mounted: current != null,
    open: active != null,
    value: current,
  };
}
