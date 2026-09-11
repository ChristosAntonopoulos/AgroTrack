import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { getSeasonStartYear } from '../utils/harvestSeason';
import {
  loadCampaign,
  pauseCampaign,
  resumeCampaign,
  saveCampaign,
  startCampaign,
  stopCampaign,
  toggleGroveDone,
  upsertDayLog,
  moveField,
} from '../harvestCampaign/storage';
import { emptyCampaign, isHarvestLive, type HarvestCampaign, type HarvestDayLog } from '../harvestCampaign/types';

type HarvestCampaignApi = {
  campaign: HarvestCampaign;
  seasonStartYear: number;
  isLive: boolean;
  isActive: boolean;
  start: (input: { fieldOrder: string[]; millName?: string; expectedOilLitres?: number | null }) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  reorder: (fieldId: string, direction: -1 | 1) => void;
  setFieldOrder: (fieldOrder: string[]) => void;
  markGroveDone: (fieldId: string) => void;
  logDay: (log: HarvestDayLog) => void;
};

const HarvestCampaignContext = createContext<HarvestCampaignApi | null>(null);

export const HarvestCampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const seasonStartYear = useMemo(() => getSeasonStartYear(), []);
  const userId = user?.userId || '';
  const [campaign, setCampaign] = useState<HarvestCampaign>(() => emptyCampaign(seasonStartYear));

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setCampaign(emptyCampaign(seasonStartYear));
      return;
    }
    setCampaign(loadCampaign(userId, seasonStartYear));
  }, [isAuthenticated, userId, seasonStartYear]);

  const commit = useCallback(
    (next: HarvestCampaign) => {
      setCampaign(next);
      if (userId) saveCampaign(userId, next);
    },
    [userId]
  );

  useEffect(() => {
    const live = isHarvestLive(campaign.status);
    document.documentElement.dataset.harvestMode = live ? campaign.status : 'off';
    return () => {
      delete document.documentElement.dataset.harvestMode;
    };
  }, [campaign.status]);

  const value = useMemo<HarvestCampaignApi>(
    () => ({
      campaign,
      seasonStartYear,
      isLive: isHarvestLive(campaign.status),
      isActive: campaign.status === 'active',
      start: (input) => commit(startCampaign(campaign, input)),
      stop: () => commit(stopCampaign(campaign)),
      pause: () => commit(pauseCampaign(campaign)),
      resume: () => commit(resumeCampaign(campaign)),
      reorder: (fieldId, direction) =>
        commit({ ...campaign, fieldOrder: moveField(campaign.fieldOrder, fieldId, direction) }),
      setFieldOrder: (fieldOrder) => commit({ ...campaign, fieldOrder }),
      markGroveDone: (fieldId) => commit(toggleGroveDone(campaign, fieldId)),
      logDay: (log) => commit(upsertDayLog(campaign, log)),
    }),
    [campaign, commit, seasonStartYear]
  );

  return <HarvestCampaignContext.Provider value={value}>{children}</HarvestCampaignContext.Provider>;
};

export const useHarvestCampaign = (): HarvestCampaignApi => {
  const ctx = useContext(HarvestCampaignContext);
  if (!ctx) throw new Error('useHarvestCampaign must be used inside HarvestCampaignProvider');
  return ctx;
};

export const useHarvestCampaignOptional = (): HarvestCampaignApi | null =>
  useContext(HarvestCampaignContext);
