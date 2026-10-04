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

  const syncItems = useCallback((items: PhotoLightboxItem[]) => {
    setState((prev) => {
      if (!prev.open) return prev;
      const same =
        prev.items.length === items.length &&
        prev.items.every(
          (item, i) =>
            item.id === items[i]?.id &&
            item.src === items[i]?.src &&
            item.context === items[i]?.context
        );
      if (same) return prev;
      const index = Math.min(prev.index, Math.max(0, items.length - 1));
      return { ...prev, items, index };
    });
  }, []);

  return { ...state, openAt, close, setIndex, syncItems };
}
