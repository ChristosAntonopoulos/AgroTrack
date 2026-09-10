import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CaptureContext, CaptureSavedDetail, CaptureSavedOptions, CaptureType } from '../capture/types';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import CaptureDrawer from '../components/Capture/CaptureDrawer';
import { getFinancialTransactionService } from '../services/serviceFactory';
import '../components/Capture/Capture.css';

type CaptureApi = {
  openCapture: (ctx?: CaptureContext) => void;
  closeCapture: () => void;
  isOpen: boolean;
};

type ToastState = {
  message: string;
  undo?: () => Promise<void>;
  addAnother?: () => void;
};

const CaptureContextValue = createContext<CaptureApi | null>(null);

export const CaptureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation(['capture']);
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<CaptureContext>({});
  const [toast, setToast] = useState<ToastState | null>(null);

  const openCapture = useCallback((ctx?: CaptureContext) => {
    setContext(ctx || {});
    setOpen(true);
  }, []);

  const closeCapture = useCallback(() => {
    setOpen(false);
  }, []);

  const onSaved = useCallback(
    (detail: CaptureSavedDetail, message: string, options?: CaptureSavedOptions) => {
      window.dispatchEvent(new CustomEvent(CAPTURE_SAVED_EVENT, { detail }));
      const transactionId = options?.transactionId;
      const status = options?.status;
      const reopen = options?.reopen;
      const undoReason = t('capture:money.undoReason');
      setToast({
        message,
        undo:
          transactionId && status === 'posted'
            ? async () => {
                await getFinancialTransactionService().void(transactionId, undoReason);
              }
            : transactionId && status === 'draft'
              ? async () => {
                  await getFinancialTransactionService().deleteDraft(transactionId);
                }
              : undefined,
        addAnother: reopen
          ? () => {
              setToast(null);
              setContext(reopen);
              setOpen(true);
            }
          : undefined,
      });
      setOpen(false);
      window.setTimeout(() => setToast(null), 6000);
    },
    [t]
  );

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
        <div className="capture-toast money-toast" role="status">
          <span>{toast.message}</span>
          {toast.undo ? (
            <button
              type="button"
              className="capture-toast-action"
              onClick={() => {
                void toast.undo?.().finally(() => setToast(null));
              }}
            >
              {t('capture:money.undo')}
            </button>
          ) : null}
          {toast.addAnother ? (
            <button type="button" className="capture-toast-action" onClick={toast.addAnother}>
              {t('capture:money.addAnother')}
            </button>
          ) : null}
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
