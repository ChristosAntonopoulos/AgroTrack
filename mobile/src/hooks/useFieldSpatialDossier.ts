import { useEffect, useMemo, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import {
  FieldIntelligenceSummary,
  FieldSatelliteObservation,
  FieldSpatialProfile,
  SatelliteDate,
  geospatialService,
} from '../services/geospatialService';
import { deriveGreenness, pickLatestGreenPass } from '../utils/fieldDetailsGeo';

const MAX_POLLS = 5;
const POLL_MS = 4000;

const landMissing = (profile: FieldSpatialProfile | null, summary: FieldIntelligenceSummary | null) =>
  !profile?.terrain && !summary?.terrain && !profile?.soil && !summary?.soil;

export function useFieldSpatialDossier(fieldId: string) {
  const [spatial, setSpatial] = useState<FieldSpatialProfile | null>(null);
  const [intel, setIntel] = useState<FieldIntelligenceSummary | null>(null);
  const [satelliteDates, setSatelliteDates] = useState<SatelliteDate[]>([]);
  const [greenObs, setGreenObs] = useState<FieldSatelliteObservation | null>(null);
  const [collecting, setCollecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let didRefresh = false;
    let polls = 0;

    const load = async () => {
      const [profile, summary, dates] = await Promise.all([
        geospatialService.getSpatialProfile(fieldId),
        geospatialService.getIntelligence(fieldId),
        geospatialService.getSatelliteDates(fieldId),
      ]);
      if (cancelled) return;
      setSpatial(profile);
      setIntel(summary);
      setSatelliteDates(dates);

      const pass = pickLatestGreenPass(dates);
      if (pass?.observationId) {
        const obs = await geospatialService.getSatelliteObservation(fieldId, pass.observationId);
        if (!cancelled) setGreenObs(obs);
      } else if (!cancelled) {
        setGreenObs(null);
      }
      if (cancelled) return;

      const pending =
        profile?.processingStatus === 'pending' ||
        profile?.processingStatus === 'processing' ||
        summary?.processingStatus === 'pending' ||
        summary?.processingStatus === 'processing';
      const waiting = landMissing(profile, summary) || pending;
      setCollecting(waiting);

      const net = await NetInfo.fetch();
      const online = net.isConnected ?? true;

      if (waiting && !didRefresh && online) {
        didRefresh = true;
        await geospatialService.refreshIntelligence(fieldId);
      }
      if (waiting && polls < MAX_POLLS && online) {
        polls += 1;
        timer = setTimeout(() => {
          void load();
        }, POLL_MS);
      } else if (!waiting) {
        setCollecting(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [fieldId]);

  const terrain = spatial?.terrain ?? intel?.terrain;
  const soil = spatial?.soil ?? intel?.soil;
  const landCover = spatial?.landCover ?? intel?.landCover;
  const environment = spatial?.environment ?? intel?.environment;
  const satellite = spatial?.satellite ?? intel?.vegetation;
  const green = useMemo(
    () => deriveGreenness(satelliteDates, satellite, greenObs),
    [satelliteDates, satellite, greenObs]
  );

  return {
    spatial,
    intel,
    collecting,
    terrain,
    soil,
    landCover,
    environment,
    satellite,
    green,
  };
}
