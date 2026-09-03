import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FieldMapData,
  MapLayerData,
  MapLayerDefinition,
  SatelliteDate,
  geospatialService,
} from '../services/geospatialService';

/**
 * Only raster overlays are drawable on the field map. Terrain and soil are published
 * as summary statistics, and vector layers are drawn from data the app already holds.
 */
const DRAWABLE_LAYER_TYPE = 'raster';

/** Layers whose imagery comes from a satellite observation, so a date applies to them. */
export const SATELLITE_LAYER_IDS = ['truecolor', 'ndvi', 'ndvi-change', 'ndmi', 'ndre', 'ndwi', 'savi'];

export interface FieldMapLayersState {
  definitions: MapLayerDefinition[];
  activeLayerId?: string;
  activeLayer?: MapLayerData;
  dates: SatelliteDate[];
  selectedDateId?: string;
  loading: boolean;
  selectLayer: (layerId?: string) => void;
  selectDate: (observationId: string) => void;
  reload: () => void;
}

/**
 * Loads the overlay catalogue, observation dates and the resolved overlay for the
 * selected layer. Everything is served through the cached geospatial service, so the
 * layer a grower last opened still renders in the field without signal.
 */
export const useFieldMapLayers = (fieldId: string | undefined): FieldMapLayersState => {
  const [definitions, setDefinitions] = useState<MapLayerDefinition[]>([]);
  const [dates, setDates] = useState<SatelliteDate[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string>();
  const [selectedDateId, setSelectedDateId] = useState<string>();
  const [mapData, setMapData] = useState<FieldMapData>();
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    geospatialService.getMapLayers().then((catalog) => {
      if (cancelled) return;
      setDefinitions(
        (catalog?.overlayLayers ?? []).filter((layer) => layer.layerType === DRAWABLE_LAYER_TYPE)
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fieldId) return;
    let cancelled = false;

    geospatialService.getSatelliteDates(fieldId).then((available) => {
      if (cancelled) return;
      setDates(available);
      const firstUsable = available.find((d) => d.isUsable)?.observationId;
      setSelectedDateId((current) => current ?? firstUsable);
      if (firstUsable) {
        setActiveLayerId((current) => current ?? 'ndvi');
      }
    });

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

    geospatialService
      .getMapData(fieldId, [activeLayerId], selectedDateId)
      .then((data) => {
        if (!cancelled) setMapData(data ?? undefined);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fieldId, activeLayerId, selectedDateId, reloadToken]);

  const selectLayer = useCallback((layerId?: string) => setActiveLayerId(layerId), []);
  const reload = useCallback(() => setReloadToken((token) => token + 1), []);
  const activeLayer = useMemo(() => mapData?.layers?.[0], [mapData]);

  return {
    definitions,
    activeLayerId,
    activeLayer,
    dates,
    selectedDateId: mapData?.observationId ?? selectedDateId,
    loading,
    selectLayer,
    selectDate: setSelectedDateId,
    reload,
  };
};
