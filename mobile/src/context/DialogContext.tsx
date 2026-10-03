import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import AlertDialog, {
  type AlertDialogButton,
  type AlertDialogTone,
} from '../components/ui/AlertDialog';

export type ShowDialogOptions = {
  title?: string;
  message?: string;
  tone?: AlertDialogTone;
  buttons?: AlertDialogButton[];
  dismissible?: boolean;
};

type DialogApi = {
  /** Themed replacement for React Native Alert.alert. */
  show: (options: ShowDialogOptions) => void;
  hide: () => void;
};

const DialogContext = createContext<DialogApi | null>(null);

type ActiveDialog = ShowDialogOptions & { id: number };

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [active, setActive] = useState<ActiveDialog | null>(null);
  const seq = useRef(0);

  const hide = useCallback(() => setActive(null), []);

  const show = useCallback((options: ShowDialogOptions) => {
    seq.current += 1;
    setActive({ ...options, id: seq.current });
  }, []);

  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      <AlertDialog
        key={active?.id ?? 'idle'}
        open={Boolean(active)}
        onClose={hide}
        title={active?.title}
        message={active?.message}
        tone={active?.tone ?? 'default'}
        buttons={active?.buttons}
        dismissible={active?.dismissible ?? true}
      />
    </DialogContext.Provider>
  );
};

export const useDialog = (): DialogApi => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
};

export const useDialogOptional = (): DialogApi | null => useContext(DialogContext);
