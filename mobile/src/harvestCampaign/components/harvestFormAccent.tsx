import React, { createContext, useContext } from 'react';
import { harvestFormAccent, type HarvestFormAccentKey } from '../../theme';

const AccentContext = createContext<HarvestFormAccentKey>('default');

export const HarvestFormAccentProvider = AccentContext.Provider;

export const useHarvestFormAccent = () => {
  const key = useContext(AccentContext);
  return harvestFormAccent[key] ?? harvestFormAccent.default;
};
