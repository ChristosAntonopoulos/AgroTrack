import React, { createContext, useContext, useMemo, useState } from 'react';

type DockAdd = {
  hideHome: boolean;
  onAdd: () => void;
} | null;

type DockState = {
  visible: boolean;
  add: DockAdd;
  setAdd: (next: DockAdd) => void;
};

const DockContext = createContext<DockState>({
  visible: false,
  add: null,
  setAdd: () => {},
});

export const DockProvider: React.FC<{ visible: boolean; children: React.ReactNode }> = ({
  visible,
  children,
}) => {
  const [add, setAdd] = useState<DockAdd>(null);
  const value = useMemo(() => ({ visible, add, setAdd }), [visible, add]);
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
};

export const useDock = (): DockState => useContext(DockContext);
