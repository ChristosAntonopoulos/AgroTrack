import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { CapturePageSnapshot } from '../capture/openContext';

type StackEntry = { id: number; snapshot: CapturePageSnapshot; key: string };

type CapturePageApi = {
  snapshot: CapturePageSnapshot | null;
  pushSnapshot: (snapshot: CapturePageSnapshot, key: string) => number;
  updateSnapshot: (id: number, snapshot: CapturePageSnapshot, key: string) => void;
  popSnapshot: (id: number) => void;
};

const CapturePageContextValue = createContext<CapturePageApi | null>(null);

const snapshotKey = (snapshot: CapturePageSnapshot): string =>
  [
    snapshot.sourcePage,
    snapshot.fieldId,
    snapshot.occurredAt,
    snapshot.harvestId,
    snapshot.taskId,
    snapshot.dateNeedsChoice ? '1' : '0',
    snapshot.periodLabel,
  ].join('|');

export const CapturePageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stack, setStack] = useState<StackEntry[]>([]);
  const nextId = useRef(1);

  const pushSnapshot = useCallback((snapshot: CapturePageSnapshot, key: string): number => {
    const id = nextId.current++;
    setStack((prev) => [...prev, { id, snapshot, key }]);
    return id;
  }, []);

  const updateSnapshot = useCallback((id: number, snapshot: CapturePageSnapshot, key: string) => {
    setStack((prev) => {
      const current = prev.find((entry) => entry.id === id);
      if (!current || current.key === key) return prev;
      return prev.map((entry) => (entry.id === id ? { ...entry, snapshot, key } : entry));
    });
  }, []);

  const popSnapshot = useCallback((id: number) => {
    setStack((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const snapshot = stack.length ? stack[stack.length - 1].snapshot : null;

  const value = useMemo(
    () => ({ snapshot, pushSnapshot, updateSnapshot, popSnapshot }),
    [snapshot, pushSnapshot, updateSnapshot, popSnapshot]
  );

  return (
    <CapturePageContextValue.Provider value={value}>{children}</CapturePageContextValue.Provider>
  );
};

export const useCapturePageOptional = (): CapturePageApi | null =>
  useContext(CapturePageContextValue);

/**
 * Registers the active screen's capture defaults.
 * Must not re-run when CapturePageProvider re-renders after push/update —
 * that used to recurse into Maximum update depth on History and other tabs.
 */
export const useRegisterCapturePage = (snapshot: CapturePageSnapshot | null): void => {
  const api = useCapturePageOptional();
  const apiRef = useRef(api);
  apiRef.current = api;
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const idRef = useRef<number | null>(null);
  const key = snapshot ? snapshotKey(snapshot) : '';

  React.useEffect(() => {
    const current = apiRef.current;
    const next = snapshotRef.current;
    if (!current || !next || !key) {
      if (current && idRef.current != null) {
        current.popSnapshot(idRef.current);
        idRef.current = null;
      }
      return;
    }
    if (idRef.current == null) {
      idRef.current = current.pushSnapshot(next, key);
    } else {
      current.updateSnapshot(idRef.current, next, key);
    }
  }, [key]);

  React.useEffect(() => {
    return () => {
      const current = apiRef.current;
      if (current && idRef.current != null) {
        current.popSnapshot(idRef.current);
        idRef.current = null;
      }
    };
  }, []);
};
