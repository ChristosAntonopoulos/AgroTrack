import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FieldMapData,
  MapLayerData,
  MapLayerDefinition,
  SatelliteDate,
  geospatialService,
} from '../services/geospatialService';

/**
 * Only raster overlays are drawable here. Terrain and soil are published as summary
 * statistics, and vector layers are already drawn from data the client holds.
 */
const DRAWABLE_LAYER_TYPE = 'raster';

/** Layers whose imagery comes from a satellite observation, so a date applies to them. */
export const SATELLITE_LAYER_IDS = ['truecolor', 'ndvi', 'ndvi-change', 'ndmi', 'ndre', 'ndwi', 'savi'];

export interface FieldMapLayersState {
  /** Overlay layers available to choose from, in catalogue order. */
  definitions: MapLayerDefinition[];
  /** Resolved data for the active layer, including availability and legend. */
  activeLayer?: MapLayerData;
  /** Overlay for the comparison date when compare mode is on. */
  compareLayer?: MapLayerData;
  dates: SatelliteDate[];
  selectedDateId?: string;
  compareDateId?: string;
  loading: boolean;
  error?: string;
  selectLayer: (layerId: string | undefined) => void;
  selectDate: (observationId: string) => void;
  selectCompareDate: (observationId: string | undefined) => void;
  activeLayerId?: string;
  refresh: () => void;
}

/**
 * Loads the overlay catalogue, the observation dates and the resolved overlay for
 * the layer a grower has selected. Only the selected layer is requested, because
 * each one resolves to a stored raster the backend has to look up.
 */
export const useFieldMapLayers = (fieldId: string | undefined): FieldMapLayersState => {
  const [definitions, setDefinitions] = useState<MapLayerDefinition[]>([]);
  const [dates, setDates] = useState<SatelliteDate[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string>();
  const [selectedDateId, setSelectedDateId] = useState<string>();
  const [compareDateId, setCompareDateId] = useState<string>();
  const [mapData, setMapData] = useState<FieldMapData>();
  const [compareData, setCompareData] = useState<FieldMapData>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      try {
        const catalog = await geospatialService.getMapLayers();
        if (cancelled) return;
        setDefinitions(catalog.overlayLayers.filter((l) => l.layerType === DRAWABLE_LAYER_TYPE));
      } catch {
        // The map stays usable with its base layers when the catalogue is unreachable.
        if (!cancelled) setDefinitions([]);
      }
    };

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fieldId) return;
    let cancelled = false;

    const loadDates = async () => {
      try {
        const available = await geospatialService.getSatelliteDates(fieldId);
        if (cancelled) return;
        setDates(available);
        const firstUsable = available.find((d) => d.isUsable)?.observationId;
        setSelectedDateId((current) => current ?? firstUsable);
        if (firstUsable) {
          setActiveLayerId((current) => current ?? 'ndvi');
        }
      } catch {
        if (!cancelled) setDates([]);
      }
    };

    loadDates();
    return () => {
      cancelled = true;
    };
  }, [fieldId, reloadToken]);

  useEffect(() => {
    if (!fieldId || !activeLayerId) {
      setMapData(undefined);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(undefined);

    const loadLayer = async () => {
      try {
        const data = await geospatialService.getMapData(fieldId, [activeLayerId], selectedDateId);
        if (!cancelled) setMapData(data);
      } catch {
        if (!cancelled) setError('mapLayerLoadFailed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadLayer();
    return () => {
      cancelled = true;
    };
  }, [fieldId, activeLayerId, selectedDateId, reloadToken]);

  useEffect(() => {
    if (!fieldId || !activeLayerId || !compareDateId) {
      setCompareData(undefined);
      return;
    }

    let cancelled = false;

    const loadCompare = async () => {
      try {
        const data = await geospatialService.getMapData(fieldId, [activeLayerId], compareDateId);
        if (!cancelled) setCompareData(data);
      } catch {
        if (!cancelled) setCompareData(undefined);
      }
    };

    loadCompare();
    return () => {
      cancelled = true;
    };
  }, [fieldId, activeLayerId, compareDateId, reloadToken]);

  const selectLayer = useCallback((layerId: string | undefined) => {
    setActiveLayerId(layerId);
    if (!layerId) {
      setCompareDateId(undefined);
    }
  }, []);

  const selectCompareDate = useCallback((observationId: string | undefined) => {
    setCompareDateId(observationId);
  }, []);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  const activeLayer = useMemo(() => mapData?.layers?.[0], [mapData]);
  const compareLayer = useMemo(() => compareData?.layers?.[0], [compareData]);

  return {
    definitions,
    activeLayer,
    compareLayer,
    dates,
    selectedDateId: mapData?.observationId ?? selectedDateId,
    compareDateId,
    loading,
    error,
    selectLayer,
    selectDate: setSelectedDateId,
    selectCompareDate,
    activeLayerId,
    refresh,
  };
};
