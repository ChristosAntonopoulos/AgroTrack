import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { CapturePageSnapshot } from '../capture/openContext';

type StackEntry = { id: number; snapshot: CapturePageSnapshot };

type CapturePageApi = {
  /** Latest snapshot registered by the active screen (Chronologio, Harvest, …). */
  snapshot: CapturePageSnapshot | null;
  pushSnapshot: (snapshot: CapturePageSnapshot) => number;
  updateSnapshot: (id: number, snapshot: CapturePageSnapshot) => void;
  popSnapshot: (id: number) => void;
};

const CapturePageContextValue = createContext<CapturePageApi | null>(null);

/**
 * Thin registry so FAB / bottom nav / Header can inherit field + date from the
 * screen the farmer is looking at, without prop-drilling through layout.
 * Nested screens push/pop so a child Chronologio cannot wipe a parent grove.
 */
export const CapturePageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stack, setStack] = useState<StackEntry[]>([]);
  const nextId = useRef(1);

  const pushSnapshot = useCallback((snapshot: CapturePageSnapshot): number => {
    const id = nextId.current++;
    setStack((prev) => [...prev, { id, snapshot }]);
    return id;
  }, []);

  const updateSnapshot = useCallback((id: number, snapshot: CapturePageSnapshot) => {
    setStack((prev) => prev.map((entry) => (entry.id === id ? { ...entry, snapshot } : entry)));
  }, []);

  const popSnapshot = useCallback((id: number) => {
    setStack((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const snapshot = stack.length ? stack[stack.length - 1].snapshot : null;

  const value = useMemo(
    () => ({
      snapshot,
      pushSnapshot,
      updateSnapshot,
      popSnapshot,
    }),
    [snapshot, pushSnapshot, updateSnapshot, popSnapshot]
  );

  return (
    <CapturePageContextValue.Provider value={value}>{children}</CapturePageContextValue.Provider>
  );
};

export const useCapturePageOptional = (): CapturePageApi | null =>
  useContext(CapturePageContextValue);

export const useCapturePage = (): CapturePageApi => {
  const ctx = useContext(CapturePageContextValue);
  if (!ctx) {
    throw new Error('useCapturePage must be used within CapturePageProvider');
  }
  return ctx;
};

/**
 * Register a page snapshot while mounted; clear only this registration on unmount.
 * Safe no-op outside CapturePageProvider.
 */
export const useRegisterCapturePage = (snapshot: CapturePageSnapshot | null): void => {
  const api = useCapturePageOptional();
  const idRef = useRef<number | null>(null);
  const key = snapshot
    ? [
        snapshot.sourcePage,
        snapshot.fieldId,
        snapshot.occurredAt,
        snapshot.harvestId,
        snapshot.taskId,
        snapshot.dateNeedsChoice ? '1' : '0',
        snapshot.periodLabel,
      ].join('|')
    : '';

  React.useEffect(() => {
    if (!api || !snapshot) {
      if (api && idRef.current != null) {
        api.popSnapshot(idRef.current);
        idRef.current = null;
      }
      return;
    }
    if (idRef.current == null) {
      idRef.current = api.pushSnapshot(snapshot);
    } else {
      api.updateSnapshot(idRef.current, snapshot);
    }
    // key encodes the snapshot fields we care about
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, key]);

  React.useEffect(() => {
    return () => {
      if (api && idRef.current != null) {
        api.popSnapshot(idRef.current);
        idRef.current = null;
      }
    };
  }, [api]);
};
