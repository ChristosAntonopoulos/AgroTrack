import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { getSeasonStartYear } from '../utils/harvestSeason';
import {
  loadCampaign,
  moveField,
  pauseCampaign,
  resumeCampaign,
  saveCampaign,
  startCampaign,
  stopCampaign,
  toggleGroveDone,
  upsertDayLog,
} from '../harvestCampaign/storage';
import {
  emptyCampaign,
  isHarvestLive,
  type HarvestCampaign,
  type HarvestDayLog,
} from '../harvestCampaign/types';

type HarvestCampaignApi = {
  campaign: HarvestCampaign;
  seasonStartYear: number;
  isLive: boolean;
  isActive: boolean;
  ready: boolean;
  start: (input: {
    fieldOrder: string[];
    millName?: string;
    expectedOilLitres?: number | null;
  }) => Promise<void>;
  stop: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  reorder: (fieldId: string, direction: -1 | 1) => Promise<void>;
  setFieldOrder: (fieldOrder: string[]) => Promise<void>;
  markGroveDone: (fieldId: string) => Promise<void>;
  logDay: (log: HarvestDayLog) => Promise<void>;
};

const HarvestCampaignContext = createContext<HarvestCampaignApi | null>(null);

export const HarvestCampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const seasonStartYear = useMemo(() => getSeasonStartYear(), []);
  const userId = user?.id || '';
  const [campaign, setCampaign] = useState<HarvestCampaign>(() => emptyCampaign(seasonStartYear));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isAuthenticated || !userId) {
        if (!cancelled) {
          setCampaign(emptyCampaign(seasonStartYear));
          setReady(true);
        }
        return;
      }
      setReady(false);
      const loaded = await loadCampaign(userId, seasonStartYear);
      if (!cancelled) {
        setCampaign(loaded);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId, seasonStartYear]);

  const commit = useCallback(
    async (next: HarvestCampaign) => {
      setCampaign(next);
      if (userId) {
        try {
          await saveCampaign(userId, next);
        } catch {
          // Keep in-memory state even if persistence fails.
        }
      }
    },
    [userId]
  );

  const value = useMemo<HarvestCampaignApi>(
    () => ({
      campaign,
      seasonStartYear,
      isLive: isHarvestLive(campaign.status),
      isActive: campaign.status === 'active',
      ready,
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
    [campaign, commit, seasonStartYear, ready]
  );

  return (
    <HarvestCampaignContext.Provider value={value}>{children}</HarvestCampaignContext.Provider>
  );
};

export const useHarvestCampaign = (): HarvestCampaignApi => {
  const ctx = useContext(HarvestCampaignContext);
  if (!ctx) throw new Error('useHarvestCampaign must be used inside HarvestCampaignProvider');
  return ctx;
};

export const useHarvestCampaignOptional = (): HarvestCampaignApi | null =>
  useContext(HarvestCampaignContext);
