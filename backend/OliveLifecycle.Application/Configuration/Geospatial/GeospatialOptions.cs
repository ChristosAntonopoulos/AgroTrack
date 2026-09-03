namespace OliveLifecycle.Application.Configuration.Geospatial;

public class GeospatialOptions
{
    public const string SectionName = "Geospatial";

    public WeatherOptions Weather { get; set; } = new();
    public SatelliteOptions Satellite { get; set; } = new();
    public TerrainOptions Terrain { get; set; } = new();
    public LandCoverOptions LandCover { get; set; } = new();
    public FireOptions Fires { get; set; } = new();
    public MapOptions Map { get; set; } = new();
    public StorageOptions Storage { get; set; } = new();
    public JobOptions Jobs { get; set; } = new();
    public SlopeClassificationOptions SlopeClassification { get; set; } = new();
    public FrostRiskOptions FrostRisk { get; set; } = new();
    public TaskRulesOptions TaskRules { get; set; } = new();
    public AlertOptions Alerts { get; set; } = new();
}

public class WeatherOptions
{
    public string Provider { get; set; } = "OpenMeteo";
    public string BaseUrl { get; set; } = "https://api.open-meteo.com/v1";
    public string? ApiKey { get; set; }
    public int RefreshMinutes { get; set; } = 60;
    public int GridRoundingDecimals { get; set; } = 2;
    public int ForecastDays { get; set; } = 7;

    /// <summary>Days of history requested so rain totals and ET sums have real past values.</summary>
    public int PastDays { get; set; } = 7;

    /// <summary>Assumed water applied per completed irrigation task, used by the field water balance.</summary>
    public double IrrigationMmPerTask { get; set; } = 10;
}

public class SatelliteOptions
{
    /// <summary>
    /// Earth Search indexes the public Sentinel-2 L2A COG archive, whose assets are
    /// readable over plain HTTPS without credentials. Copernicus Data Space exposes
    /// the same scenes but requires an account, so it is a drop-in alternative once
    /// keys are configured.
    /// </summary>
    public string StacBaseUrl { get; set; } = "https://earth-search.aws.element84.com/v1";

    public string Collection { get; set; } = "sentinel-2-l2a";
    public int MaxCloudCover { get; set; } = 20;
    public int DiscoveryIntervalHours { get; set; } = 24;

    /// <summary>How far back scene discovery looks for a usable observation.</summary>
    public int SearchWindowDays { get; set; } = 30;

    /// <summary>Native resolution of the 10 m Sentinel-2 bands, used as the analysis grid.</summary>
    public double AnalysisPixelSizeMetres { get; set; } = 10;

    /// <summary>Upper bound on overlay dimensions; larger fields are analysed on a coarser grid.</summary>
    public int MaxRasterDimension { get; set; } = 2048;

    /// <summary>
    /// Below this share of usable (cloud-free, in-boundary) pixels an observation is
    /// recorded but flagged unusable, rather than driving alerts from a sliver of field.
    /// </summary>
    public double MinUsablePixelPercent { get; set; } = 40;

    /// <summary>Reflectance scaling applied to Sentinel-2 L2A digital numbers.</summary>
    public double ReflectanceScale { get; set; } = 10000;

    /// <summary>L2A products since baseline 04.00 carry a 1000 DN offset.</summary>
    public double ReflectanceOffset { get; set; } = -1000;

    /// <summary>Days of observations retained per field before older rasters are pruned.</summary>
    public int RetentionDays { get; set; } = 400;

    public bool GenerateOverlays { get; set; } = true;
}

public class TerrainOptions
{
    public string DemSource { get; set; } = "CopernicusGlo30";
    public string FallbackDem { get; set; } = "Glo90";
    public string OpenTopographyBaseUrl { get; set; } = "https://portal.opentopography.org/API/globaldem";

    /// <summary>Keyless batched elevation lookup backed by the Copernicus DEM.</summary>
    public string ElevationApiUrl { get; set; } = "https://api.open-meteo.com/v1/elevation";
}

public class LandCoverOptions
{
    /// <summary>ESA WorldCover is published as an open WMS by Terrascope (VITO).</summary>
    public string WmsUrl { get; set; } = "https://services.terrascope.be/wms/v2";
    public string LayerName { get; set; } = "WORLDCOVER_2021_MAP";
    public int GridSize { get; set; } = 9;
}

public class FireOptions
{
    public string FirmsBaseUrl { get; set; } = "https://firms.modaps.eosdis.nasa.gov/api/country/csv";
    public string? MapKey { get; set; }
    public int RefreshMinutes { get; set; } = 120;

    /// <summary>Fires beyond this distance from a field are not reported on that field.</summary>
    public double SearchRadiusKm { get; set; } = 50;

    public string CountryCode { get; set; } = "GRC";
    public string SourceDataset { get; set; } = "VIIRS_SNPP_NRT";

    /// <summary>Days of detections to request (FIRMS allows 1-10).</summary>
    public int DayRange { get; set; } = 1;
}

public class MapOptions
{
    public string BaseMapProvider { get; set; } = "OpenFreeMap";
    public string StyleUrl { get; set; } = "https://tiles.openfreemap.org/styles/liberty";
    public string SatelliteTileUrl { get; set; } = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    public string StreetTileUrl { get; set; } = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

    /// <summary>
    /// Terrascope publishes ESA WorldCover as an open WMTS whose REST parameters map
    /// onto a standard XYZ template, so both Leaflet and MapLibre can consume it.
    /// </summary>
    public string LandCoverTileUrl { get; set; } =
        "https://services.terrascope.be/wmts/v2?layer=WORLDCOVER_2021_MAP&style=&tilematrixset=EPSG:3857" +
        "&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix=EPSG:3857:{z}&TileCol={x}&TileRow={y}";

    public bool CadastreLayerEnabled { get; set; }

    /// <summary>
    /// Tile template for the Hellenic Cadastre reference imagery. Left empty because
    /// the endpoint is not an open XYZ service; the layer stays hidden until set.
    /// </summary>
    public string? CadastreTileUrl { get; set; }
}

public class StorageOptions
{
    public string RasterRoot { get; set; } = "geospatial";
}

public class JobOptions
{
    public bool Enabled { get; set; } = true;
    public int WeatherRefreshMinutes { get; set; } = 60;
    public int FireRefreshMinutes { get; set; } = 120;
    public int SnapshotHourUtc { get; set; } = 0;
}

public class SlopeClassificationOptions
{
    public double FlatMaxPercent { get; set; } = 5;
    public double ModerateMaxPercent { get; set; } = 12;
    public double SteepMaxPercent { get; set; } = 20;
}

public class FrostRiskOptions
{
    public double LowTempC { get; set; } = 4;
    public double ModerateTempC { get; set; } = 2;
    public double HighTempC { get; set; } = 1;
    public double CriticalTempC { get; set; } = 0;
}

public class TaskRulesOptions
{
    public double SprayingMaxWindKmh { get; set; } = 20;
    public double SprayingMaxGustKmh { get; set; } = 30;
    public double SprayingMinHumidityPercent { get; set; } = 40;
    public double SprayingMaxHumidityPercent { get; set; } = 90;
    public double IrrigationRainThresholdMm { get; set; } = 5;
    public double HarvestMaxWindKmh { get; set; } = 35;
    public double HeatStressTempC { get; set; } = 35;
}

/// <summary>Thresholds for the field-level environmental alerts.</summary>
public class AlertOptions
{
    /// <summary>Forecast maximum above which a heat-stress advisory is raised.</summary>
    public double HeatAlertTempC { get; set; } = 38;

    /// <summary>An active fire closer than this to the field centroid is alerted on.</summary>
    public double FireProximityKm { get; set; } = 10;

    /// <summary>NDVI drop against the field's own baseline that counts as an anomaly.</summary>
    public double VegetationDropPercent { get; set; } = 15;

    /// <summary>
    /// Share of the field that must be below its baseline before a drop is treated as a
    /// real field-wide anomaly rather than a few noisy pixels.
    /// </summary>
    public double VegetationDeclineAreaPercent { get; set; } = 20;

    /// <summary>Observations older than this no longer justify a vegetation alert.</summary>
    public int VegetationMaxObservationAgeDays { get; set; } = 21;
}
