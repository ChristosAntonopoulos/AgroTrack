import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, DeviceEventEmitter } from 'react-native';
import type { CaptureContext as CaptureCtx, CaptureSavedDetail } from '../capture/types';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import CaptureSheet from '../components/capture/CaptureSheet';

type CaptureApi = {
  openCapture: (ctx?: CaptureCtx) => void;
  closeCapture: () => void;
  isOpen: boolean;
};

const Ctx = createContext<CaptureApi | null>(null);

export const CaptureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<CaptureCtx>({});

  const openCapture = useCallback((ctx?: CaptureCtx) => {
    setContext(ctx || {});
    setOpen(true);
  }, []);

  const closeCapture = useCallback(() => setOpen(false), []);

  const onSaved = useCallback((detail: CaptureSavedDetail, message: string) => {
    DeviceEventEmitter.emit(CAPTURE_SAVED_EVENT, detail);
    setOpen(false);
    Alert.alert('', message);
  }, []);

  const value = useMemo(
    () => ({ openCapture, closeCapture, isOpen: open }),
    [openCapture, closeCapture, open]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <CaptureSheet
        open={open}
        context={context}
        onClose={closeCapture}
        onContextChange={setContext}
        onSaved={onSaved}
      />
    </Ctx.Provider>
  );
};

export const useCapture = (): CaptureApi => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCapture must be used within CaptureProvider');
  return ctx;
};

export const useCaptureOptional = (): CaptureApi | null => useContext(Ctx);
