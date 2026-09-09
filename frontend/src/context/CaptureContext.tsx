import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { CaptureContext, CaptureSavedDetail, CaptureType } from '../capture/types';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import CaptureDrawer from '../components/Capture/CaptureDrawer';

type CaptureApi = {
  openCapture: (ctx?: CaptureContext) => void;
  closeCapture: () => void;
  isOpen: boolean;
};

const CaptureContextValue = createContext<CaptureApi | null>(null);

export const CaptureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<CaptureContext>({});
  const [toast, setToast] = useState<string | null>(null);

  const openCapture = useCallback((ctx?: CaptureContext) => {
    setContext(ctx || {});
    setOpen(true);
  }, []);

  const closeCapture = useCallback(() => {
    setOpen(false);
  }, []);

  const onSaved = useCallback((detail: CaptureSavedDetail, message: string) => {
    window.dispatchEvent(new CustomEvent(CAPTURE_SAVED_EVENT, { detail }));
    setToast(message);
    setOpen(false);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const value = useMemo(
    () => ({ openCapture, closeCapture, isOpen: open }),
    [openCapture, closeCapture, open]
  );

  return (
    <CaptureContextValue.Provider value={value}>
      {children}
      <CaptureDrawer
        open={open}
        context={context}
        onClose={closeCapture}
        onContextChange={setContext}
        onSaved={onSaved}
      />
      {toast ? (
        <div className="capture-toast" role="status">
          {toast}
        </div>
      ) : null}
    </CaptureContextValue.Provider>
  );
};

export const useCapture = (): CaptureApi => {
  const ctx = useContext(CaptureContextValue);
  if (!ctx) {
    throw new Error('useCapture must be used within CaptureProvider');
  }
  return ctx;
};

export const useCaptureOptional = (): CaptureApi | null => useContext(CaptureContextValue);

export type { CaptureType, CaptureContext };
