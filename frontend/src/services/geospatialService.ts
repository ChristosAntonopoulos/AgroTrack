import api from './api';

export interface DataSourceMetadata {
  source: string;
  sourceUrl?: string;
  attribution?: string;
  licence?: string;
  spatialResolution?: string;
  temporalResolution?: string;
  valueType: string;
  sourceDate?: string;
  lastUpdatedAt?: string;
  isRegionalEstimate?: boolean;
  confidenceNote?: string;
}

export interface CurrentWeather {
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPercent: number;
  windSpeedKmh: number;
  windGustKmh: number;
  precipitationMm: number;
  weatherCode: number;
  description: string;
  highC: number;
  lowC: number;
}

export interface RainIntelligence {
  previous1hMm: number;
  previous6hMm: number;
  previous12hMm: number;
  previous24hMm: number;
  previous48hMm: number;
  previous7dMm: number;
  forecast3hMm: number;
  forecast6hMm: number;
  forecast12hMm: number;
  forecast24hMm: number;
  forecast48hMm: number;
}

export interface WindIntelligence {
  currentSpeedKmh: number;
  currentGustKmh: number;
  maxNext6hKmh: number;
  maxNext12hKmh: number;
  maxNext24hKmh: number;
  dominantDirection?: string;
}

export type FrostRiskLevel = 'None' | 'Low' | 'Moderate' | 'High' | 'Critical';

export interface FrostRisk {
  level: FrostRiskLevel;
  window?: string;
  forecastMinTempC?: number;
  weatherSourceResolution?: string;
  terrainResolution?: string;
  confidence: string;
}

export interface FieldWeather {
  fieldId: string;
  stale: boolean;
  lastUpdatedAt?: string;
  current?: CurrentWeather;
  rain: RainIntelligence;
  wind: WindIntelligence;
  frost: FrostRisk;
  evapotranspiration: { todayMm: number; last7DaysMm: number };
  waterBalance: { rainMm: number; et0Mm: number; irrigationMm: number; balanceMm: number; label: string };
  metadata: DataSourceMetadata;
}

export interface TerrainSummary {
  minElevationM?: number;
  maxElevationM?: number;
  averageElevationM?: number;
  medianElevationM?: number;
  elevationRangeM?: number;
  averageSlopePercent?: number;
  maxSlopePercent?: number;
  averageSlopeDegrees?: number;
  maxSlopeDegrees?: number;
  dominantAspect?: string;
  dominantSlopeClass?: string;
  slopeZonePercent?: Record<string, number>;
  sampleCount?: number;
  metadata: DataSourceMetadata;
}

export interface LandCoverSummary {
  dominantClass?: string;
  percentByClass: Record<string, number>;
  metadata: DataSourceMetadata;
}

export interface SoilSummary {
  ph?: number;
  clayPercent?: number;
  sandPercent?: number;
  siltPercent?: number;
  organicCarbonPercent?: number;
  isRegionalEstimate: boolean;
  metadata: DataSourceMetadata;
}

export interface ClosestFire {
  distanceKm: number;
  direction?: string;
  detectedAt: string;
  confidence?: string;
}

export interface EnvironmentalSummary {
  intersectsNatura: boolean;
  distanceToNearestNaturaKm?: number;
  nearestNaturaSite?: string;
  nearestNaturaSiteCode?: string;
  nearestNaturaSiteType?: string;
  closestFire?: ClosestFire;
  metadata: DataSourceMetadata;
}

export interface SatelliteSummary {
  latestObservationId?: string;
  observationDate?: string;
  cloudCoverPercent?: number;
  /** Cloud cover measured over this field, which is what limits the reading. */
  fieldCloudCoverPercent?: number;
  usablePixelPercent?: number;
  ndviMean?: number;
  ndviMedian?: number;
  ndviTrendLabel?: string;
  ndviChangePercent?: number;
  comparedToObservationDate?: string;
  areaBelowBaselinePercent?: number;
  ndmiMean?: number;
  ndreMean?: number;
  ndwiMean?: number;
  saviMean?: number;
  metadata: DataSourceMetadata;
}

export type SpatialProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';

export interface FieldSpatialProfile {
  fieldId: string;
  processingStatus: SpatialProcessingStatus;
  processingError?: string;
  calculatedAt?: string;
  version: number;
  geometry?: { areaSqm: number; centroidLat: number; centroidLng: number; bbox: number[] };
  terrain?: TerrainSummary;
  landCover?: LandCoverSummary;
  soil?: SoilSummary;
  environment?: EnvironmentalSummary;
  satellite?: SatelliteSummary;
  weather?: {
    currentTemperatureC?: number;
    rainNext24hMm?: number;
    windSpeedKmh?: number;
    frostRiskLevel?: string;
    metadata: DataSourceMetadata;
  };
}

export interface FieldEnvironmentalAlert {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  message: string;
  validFrom?: string;
  validTo?: string;
  confidence: string;
  relatedTaskId?: string;
}

export interface VegetationIndexStats {
  mean: number;
  median: number;
  minimum: number;
  maximum: number;
  standardDeviation: number;
  p10: number;
  p90: number;
  /** Pixels behind these statistics after cloud and boundary masking. */
  validPixelCount: number;
  trendLabel?: string;
}

export interface FieldSatelliteObservation {
  id: string;
  fieldId: string;
  observationDate: string;
  cloudCoverPercent: number;
  fieldCloudCoverPercent?: number;
  usablePixelPercent?: number;
  isUsable: boolean;
  source: string;
  resolution: string;
  ndvi?: VegetationIndexStats;
  ndmi?: VegetationIndexStats;
  ndre?: VegetationIndexStats;
  ndwi?: VegetationIndexStats;
  savi?: VegetationIndexStats;
  ndviChangePercent?: number;
  comparedToObservationDate?: string;
  areaDeclinePercent?: number;
  areaIncreasePercent?: number;
  areaBelowBaselinePercent?: number;
  trueColorUrl?: string;
  ndviUrl?: string;
  ndmiUrl?: string;
  ndreUrl?: string;
  ndwiUrl?: string;
  saviUrl?: string;
  ndviChangeUrl?: string;
  /** [minLng, minLat, maxLng, maxLat] the overlay images should be drawn within. */
  overlayBounds?: number[];
  metadata: DataSourceMetadata;
}

/** Lightweight entry for the satellite date selector. */
export interface SatelliteDate {
  observationId: string;
  observationDate: string;
  cloudCoverPercent: number;
  fieldCloudCoverPercent?: number;
  usablePixelPercent?: number;
  isUsable: boolean;
  ndviMean?: number;
  hasTrueColor: boolean;
  hasNdvi: boolean;
}

export interface FieldIntelligenceSummary {
  processingStatus: SpatialProcessingStatus;
  weather?: FieldWeather;
  terrain?: TerrainSummary;
  landCover?: LandCoverSummary;
  soil?: SoilSummary;
  vegetation?: SatelliteSummary;
  environment?: EnvironmentalSummary;
  alerts: FieldEnvironmentalAlert[];
}

export interface MapLayerDefinition {
  id: string;
  name: string;
  category: string;
  layerType: string;
  tileUrlTemplate?: string;
  provider: string;
  attribution: string;
  licence: string;
  sourceUrl?: string;
  spatialResolution?: string;
  defaultVisible: boolean;
  advanced: boolean;
}

export interface MapLayerCatalog {
  baseLayers: MapLayerDefinition[];
  overlayLayers: MapLayerDefinition[];
}

export interface LegendStop {
  /** Position along the ramp from 0 to 1. */
  position: number;
  value: number;
  colour: string;
}

export interface LayerLegend {
  minimum: number;
  maximum: number;
  stops: LegendStop[];
}

export interface MapLayerData {
  layerId: string;
  type: string;
  tileUrlTemplate?: string;
  /** [minLng, minLat, maxLng, maxLat] for image overlays. */
  bounds?: number[];
  imageUrl?: string;
  defaultOpacity: number;
  /** False when the layer has no data yet, so the UI can disable rather than show an empty map. */
  available: boolean;
  attribution?: string;
  spatialResolution?: string;
  legend?: LayerLegend;
  unavailableReason?: string;
}

export interface FieldMapData {
  fieldId: string;
  observationId?: string;
  observationDate?: string;
  layers: MapLayerData[];
}

export interface DailyWeatherSnapshot {
  date: string;
  minTemperatureC?: number;
  maxTemperatureC?: number;
  rainTotalMm?: number;
  et0Mm?: number;
}

export interface DataSourceHealth {
  sourceId: string;
  displayName: string;
  status: string;
  lastSuccessfulUpdate?: string;
  lastError?: string;
  details?: string;
}

export interface GeospatialJobFailure {
  jobType: string;
  fieldId?: string;
  attempts: number;
  lastError?: string;
  failedAt: string;
}

export interface GeospatialJobStatus {
  pending: number;
  processing: number;
  completed: number;
  partial: number;
  failed: number;
  recentFailures: GeospatialJobFailure[];
}

export const geospatialService = {
  getFieldWeather: async (fieldId: string): Promise<FieldWeather> => {
    const response = await api.get<FieldWeather>(`/api/v1/fields/${fieldId}/weather`);
    return response.data;
  },

  getWeatherHistory: async (fieldId: string, from?: string, to?: string): Promise<DailyWeatherSnapshot[]> => {
    const response = await api.get<{ snapshots: DailyWeatherSnapshot[] }>(
      `/api/v1/fields/${fieldId}/weather/history`,
      { params: { from, to } }
    );
    return response.data.snapshots ?? [];
  },

  getSpatialProfile: async (fieldId: string): Promise<FieldSpatialProfile> => {
    const response = await api.get<FieldSpatialProfile>(`/api/v1/fields/${fieldId}/spatial-profile`);
    return response.data;
  },

  getIntelligence: async (fieldId: string): Promise<FieldIntelligenceSummary> => {
    const response = await api.get<FieldIntelligenceSummary>(`/api/v1/fields/${fieldId}/intelligence`);
    return response.data;
  },

  getAlerts: async (fieldId: string): Promise<FieldEnvironmentalAlert[]> => {
    const response = await api.get<FieldEnvironmentalAlert[]>(`/api/v1/fields/${fieldId}/alerts`);
    return response.data;
  },

  getSatelliteObservations: async (fieldId: string): Promise<FieldSatelliteObservation[]> => {
    const response = await api.get<FieldSatelliteObservation[]>(`/api/v1/fields/${fieldId}/satellite`);
    return response.data;
  },

  getSatelliteObservation: async (fieldId: string, observationId: string): Promise<FieldSatelliteObservation> => {
    const response = await api.get<FieldSatelliteObservation>(
      `/api/v1/fields/${fieldId}/satellite/${observationId}`
    );
    return response.data;
  },

  /** Observation dates for the date selector, including cloud-affected ones. */
  getSatelliteDates: async (fieldId: string): Promise<SatelliteDate[]> => {
    const response = await api.get<SatelliteDate[]>(`/api/v1/fields/${fieldId}/satellite/dates`);
    return response.data;
  },

  /** Queues processing so a grower can refresh imagery without waiting for the daily job. */
  refreshSatellite: async (fieldId: string, catalogItemId?: string): Promise<void> => {
    await api.post(`/api/v1/fields/${fieldId}/satellite/refresh`, null, {
      params: catalogItemId ? { catalogItemId } : undefined,
    });
  },

  /** Queues terrain, weather, environment and a satellite search for this field. */
  refreshIntelligence: async (fieldId: string): Promise<void> => {
    await api.post(`/api/v1/fields/${fieldId}/intelligence/refresh`);
  },

  getMapData: async (fieldId: string, layerIds: string[], observationId?: string): Promise<FieldMapData> => {
    const response = await api.get<FieldMapData>(`/api/v1/fields/${fieldId}/map-data`, {
      params: { layers: layerIds.join(','), observationId },
    });
    return response.data;
  },

  getMapLayers: async (): Promise<MapLayerCatalog> => {
    const response = await api.get<MapLayerCatalog>('/api/v1/map/layers');
    return response.data;
  },

  getDataSourceHealth: async (): Promise<DataSourceHealth[]> => {
    const response = await api.get<DataSourceHealth[]>('/api/v1/admin/data-sources');
    return response.data;
  },

  getGeospatialJobStatus: async (): Promise<GeospatialJobStatus> => {
    const response = await api.get<GeospatialJobStatus>('/api/v1/admin/data-sources/jobs');
    return response.data;
  },
};
