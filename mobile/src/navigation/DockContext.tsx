import React, { createContext, useContext } from 'react';

type DockState = {
  visible: boolean;
};

const DockContext = createContext<DockState>({ visible: false });

export const DockProvider: React.FC<{ visible: boolean; children: React.ReactNode }> = ({
  visible,
  children,
}) => <DockContext.Provider value={{ visible }}>{children}</DockContext.Provider>;

export const useDock = (): DockState => useContext(DockContext);
