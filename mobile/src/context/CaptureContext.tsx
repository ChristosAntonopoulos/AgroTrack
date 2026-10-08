import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useTranslation } from 'react-i18next';
import type { CaptureContext as CaptureCtx, CaptureSavedDetail, CaptureSavedOptions } from '../capture/types';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { buildCaptureOpenContext } from '../capture/openContext';
import CaptureSheet from '../components/capture/CaptureSheet';
import { getFinancialTransactionService } from '../services/serviceFactory';
import { useDialog } from './DialogContext';
import { getFocusedRoute } from '../navigation/dockRoute';
import type { AlertDialogButton } from '../components/ui/AlertDialog';
import { CapturePageProvider, useCapturePageOptional } from './CapturePageContext';

type CaptureApi = {
  openCapture: (ctx?: CaptureCtx) => void;
  closeCapture: () => void;
  isOpen: boolean;
};

const Ctx = createContext<CaptureApi | null>(null);

const CaptureProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation(['capture', 'common']);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const page = useCapturePageOptional();
  const pageRef = useRef(page);
  pageRef.current = page;
  const dialog = useDialog();
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<CaptureCtx>({});

  const openCapture = useCallback(
    (ctx?: CaptureCtx) => {
      const focused = getFocusedRoute(navigation.getState());
      setContext(
        buildCaptureOpenContext({
          routeName: focused.name,
          params: focused.params,
          explicit: ctx,
          page: pageRef.current?.snapshot,
        })
      );
      setOpen(true);
    },
    [navigation]
  );

  const closeCapture = useCallback(() => setOpen(false), []);

  const onSaved = useCallback(
    (detail: CaptureSavedDetail, message: string, options?: CaptureSavedOptions) => {
      DeviceEventEmitter.emit(CAPTURE_SAVED_EVENT, detail);
      setOpen(false);
      const transactionId = options?.transactionId;
      const status = options?.status;
      const reopen = options?.reopen;
      const buttons: AlertDialogButton[] = [];
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
          text: t('capture:addAnother', { defaultValue: t('capture:money.addAnother') }),
          onPress: () => {
            setContext(reopen);
            setOpen(true);
          },
        });
      }
      if (options?.skipDialog) return;
      dialog.show({
        title: message,
        buttons: buttons.length
          ? [...buttons, { text: t('common:ok', { defaultValue: 'OK' }), style: 'cancel' }]
          : [{ text: t('common:ok', { defaultValue: 'OK' }) }],
      });
    },
    [dialog, t]
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

export const CaptureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CapturePageProvider>
    <CaptureProviderInner>{children}</CaptureProviderInner>
  </CapturePageProvider>
);

export const useCapture = (): CaptureApi => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCapture must be used within CaptureProvider');
  return ctx;
};

export const useCaptureOptional = (): CaptureApi | null => useContext(Ctx);
