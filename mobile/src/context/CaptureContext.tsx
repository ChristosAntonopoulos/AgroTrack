import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, DeviceEventEmitter } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CaptureContext as CaptureCtx, CaptureSavedDetail, CaptureSavedOptions } from '../capture/types';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import CaptureSheet from '../components/capture/CaptureSheet';
import { getFinancialTransactionService } from '../services/serviceFactory';

type CaptureApi = {
  openCapture: (ctx?: CaptureCtx) => void;
  closeCapture: () => void;
  isOpen: boolean;
};

const Ctx = createContext<CaptureApi | null>(null);

export const CaptureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation(['capture', 'common']);
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<CaptureCtx>({});

  const openCapture = useCallback((ctx?: CaptureCtx) => {
    setContext(ctx || {});
    setOpen(true);
  }, []);

  const closeCapture = useCallback(() => setOpen(false), []);

  const onSaved = useCallback(
    (detail: CaptureSavedDetail, message: string, options?: CaptureSavedOptions) => {
      DeviceEventEmitter.emit(CAPTURE_SAVED_EVENT, detail);
      setOpen(false);
      const transactionId = options?.transactionId;
      const status = options?.status;
      const reopen = options?.reopen;
      const buttons: Array<{ text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }> = [];
      if (transactionId && status === 'posted') {
        buttons.push({
          text: t('capture:money.undo'),
          style: 'destructive',
          onPress: () => {
            void getFinancialTransactionService().void(transactionId, t('capture:money.undoReason'));
          },
        });
      } else if (transactionId && status === 'draft') {
        buttons.push({
          text: t('capture:money.undo'),
          style: 'destructive',
          onPress: () => {
            void getFinancialTransactionService().deleteDraft(transactionId);
          },
        });
      }
      if (reopen) {
        buttons.push({
          text: t('capture:money.addAnother'),
          onPress: () => {
            setContext(reopen);
            setOpen(true);
          },
        });
      }
      buttons.push({ text: t('common:ok', { defaultValue: 'OK' }) });
      Alert.alert('', message, buttons);
    },
    [t]
  );

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
