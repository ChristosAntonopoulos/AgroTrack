import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { CapturePageSnapshot } from '../capture/openContext';

type StackEntry = { id: number; snapshot: CapturePageSnapshot };

type CapturePageApi = {
  snapshot: CapturePageSnapshot | null;
  pushSnapshot: (snapshot: CapturePageSnapshot) => number;
  updateSnapshot: (id: number, snapshot: CapturePageSnapshot) => void;
  popSnapshot: (id: number) => void;
};

const CapturePageContextValue = createContext<CapturePageApi | null>(null);

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
    () => ({ snapshot, pushSnapshot, updateSnapshot, popSnapshot }),
    [snapshot, pushSnapshot, updateSnapshot, popSnapshot]
  );

  return (
    <CapturePageContextValue.Provider value={value}>{children}</CapturePageContextValue.Provider>
  );
};

export const useCapturePageOptional = (): CapturePageApi | null =>
  useContext(CapturePageContextValue);

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
