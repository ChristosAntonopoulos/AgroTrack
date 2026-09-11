import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Sheet from '../components/ui/Sheet';
import MoreMenuPanel from '../components/layout/MoreMenuPanel';

type MoreMenuApi = {
  openMore: () => void;
  closeMore: () => void;
  isOpen: boolean;
};

const Ctx = createContext<MoreMenuApi | null>(null);

export const MoreMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation(['common', 'nav']);
  const [open, setOpen] = useState(false);
  const openMore = useCallback(() => setOpen(true), []);
  const closeMore = useCallback(() => setOpen(false), []);
  const value = useMemo(
    () => ({ openMore, closeMore, isOpen: open }),
    [openMore, closeMore, open]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <Sheet
        open={open}
        onClose={closeMore}
        edge="left"
        size="md"
        title={t('common:moreNav', { defaultValue: t('nav:more') })}
        flush
        scrollable={false}
      >
        <MoreMenuPanel onNavigate={closeMore} />
      </Sheet>
    </Ctx.Provider>
  );
};

export const useMoreMenu = (): MoreMenuApi => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMoreMenu must be used within MoreMenuProvider');
  return ctx;
};

export const useMoreMenuOptional = (): MoreMenuApi | null => useContext(Ctx);
