import { useCallback, useState } from 'react';
import type { PhotoLightboxItem } from './PhotoLightbox';

export type PhotoLightboxState = {
  open: boolean;
  items: PhotoLightboxItem[];
  index: number;
};

const empty: PhotoLightboxState = { open: false, items: [], index: 0 };

/** Lightweight controller for the shared PhotoLightbox. */
export function usePhotoLightbox() {
  const [state, setState] = useState<PhotoLightboxState>(empty);

  const openAt = useCallback((items: PhotoLightboxItem[], index = 0) => {
    if (!items.length) return;
    const safe = Math.max(0, Math.min(index, items.length - 1));
    setState({ open: true, items, index: safe });
  }, []);

  const close = useCallback(() => {
    setState(empty);
  }, []);

  const setIndex = useCallback((index: number) => {
    setState((prev) => (prev.open ? { ...prev, index } : prev));
  }, []);

  return { ...state, openAt, close, setIndex };
}
