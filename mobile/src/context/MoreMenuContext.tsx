import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * @deprecated More is a real tab now. Kept so any leftover imports compile.
 */
type MoreMenuApi = {
  openMore: () => void;
  closeMore: () => void;
  isOpen: boolean;
};

const Ctx = createContext<MoreMenuApi | null>(null);

export const MoreMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const openMore = useCallback(() => setOpen(true), []);
  const closeMore = useCallback(() => setOpen(false), []);
  const value = useMemo(
    () => ({ openMore, closeMore, isOpen: open }),
    [openMore, closeMore, open]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useMoreMenu = (): MoreMenuApi => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMoreMenu must be used within MoreMenuProvider');
  return ctx;
};

export const useMoreMenuOptional = (): MoreMenuApi | null => useContext(Ctx);
