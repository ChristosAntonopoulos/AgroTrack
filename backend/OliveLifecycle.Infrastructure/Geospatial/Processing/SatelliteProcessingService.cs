using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Application.Services.Geospatial;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Geospatial;
using OliveLifecycle.Core.ValueObjects.Geospatial;
using OliveLifecycle.Infrastructure.Geospatial.Raster;

namespace OliveLifecycle.Infrastructure.Geospatial.Processing;

public interface ISatelliteProcessingService
{
    /// <summary>
    /// Derives vegetation indices for a field from a Sentinel-2 scene. When no
    /// catalogue item is given the most recent scene within the cloud limit is used.
    /// </summary>
    Task<FieldSatelliteObservation?> ProcessFieldAsync(string fieldId, string? catalogItemId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Processes one low-cloud Sentinel-2 scene per month across the configured
    /// history window. Called after the field is activated.
    /// </summary>
    Task<int> ProcessHistoricalAsync(string fieldId, CancellationToken cancellationToken = default);

    /// <summary>Deletes observations and rasters past the retention window.</summary>
    Task<int> PruneAsync(CancellationToken cancellationToken = default);
}

public class SatelliteProcessingService : ISatelliteProcessingService
{
    /// <summary>Bands without which no index can be produced.</summary>
    private static readonly string[] MandatoryBands = [SatelliteBands.Red, SatelliteBands.Nir];

    private readonly IFieldRepository _fieldRepository;
    private readonly ISatelliteCatalogProvider _catalogProvider;
    private readonly IFieldSatelliteObservationRepository _observationRepository;
    private readonly IFieldSpatialProfileRepository _profileRepository;
    private readonly IGeospatialStorageService _storage;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly SatelliteOptions _options;
    private readonly ILogger<SatelliteProcessingService> _logger;

    public SatelliteProcessingService(
        IFieldRepository fieldRepository,
        ISatelliteCatalogProvider catalogProvider,
        IFieldSatelliteObservationRepository observationRepository,
        IFieldSpatialProfileRepository profileRepository,
        IGeospatialStorageService storage,
        IDateTimeProvider dateTimeProvider,
        IHttpClientFactory httpClientFactory,
        IOptions<GeospatialOptions> options,
        ILogger<SatelliteProcessingService> logger)
    {
        _fieldRepository = fieldRepository;
        _catalogProvider = catalogProvider;
        _observationRepository = observationRepository;
        _profileRepository = profileRepository;
        _storage = storage;
        _dateTimeProvider = dateTimeProvider;
        _httpClientFactory = httpClientFactory;
        _options = options.Value.Satellite;
        _logger = logger;
    }

    public async Task<FieldSatelliteObservation?> ProcessFieldAsync(string fieldId, string? catalogItemId, CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken);
        if (field?.Boundary == null || field.Boundary.Coordinates.Count == 0)
        {
            _logger.LogDebug("Field {FieldId} has no boundary; skipping satellite processing", fieldId);
            return null;
        }

        var item = await ResolveCatalogItemAsync(field, catalogItemId, cancellationToken);
        if (item == null)
        {
            return null;
        }

        if (!item.HasBands(MandatoryBands))
        {
            _logger.LogWarning("Catalogue item {ItemId} is missing red or near-infrared assets", item.ItemId);
            return null;
        }

        var existing = await _observationRepository.GetByCatalogItemAsync(fieldId, item.ItemId, cancellationToken);
        if (existing != null)
        {
            _logger.LogDebug("Scene {ItemId} already processed for field {FieldId}", item.ItemId, fieldId);
            return existing;
        }

        return await BuildObservationAsync(field, item, cancellationToken);
    }

    public async Task<int> ProcessHistoricalAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        if (_options.HistoryYears <= 0)
        {
            return 0;
        }

        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken);
        if (field?.Boundary == null || field.Boundary.Coordinates.Count == 0)
        {
            _logger.LogDebug("Field {FieldId} has no boundary; skipping satellite history", fieldId);
            return 0;
        }

        var bbox = GeoMath.BoundingBox(field.Boundary);
        var to = _dateTimeProvider.UtcNow;
        var from = to.AddYears(-_options.HistoryYears);
        var collected = new List<SatelliteCatalogItem>();
        var cloudLimit = Math.Max(_options.MaxCloudCover, _options.HistoryMaxCloudCover);

        for (var yearStart = from; yearStart < to; yearStart = yearStart.AddYears(1))
        {
            var yearEnd = yearStart.AddYears(1) < to ? yearStart.AddYears(1) : to;
            var results = await _catalogProvider.SearchAsync(new SatelliteSearchRequest
            {
                MinLng = bbox[0],
                MinLat = bbox[1],
                MaxLng = bbox[2],
                MaxLat = bbox[3],
                MaxCloudCover = cloudLimit,
                From = yearStart,
                To = yearEnd,
                Limit = 100
            }, cancellationToken);

            collected.AddRange(results.Where(item => item.HasBands(MandatoryBands)));
        }

        var selected = SatelliteHistorySelector.SelectBestPerMonth(collected);
        var processed = 0;

        foreach (var item in selected)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var observation = await ProcessFieldAsync(fieldId, item.ItemId, cancellationToken);
            if (observation != null)
            {
                processed++;
            }
        }

        _logger.LogInformation(
            "Processed {Count} historical Sentinel-2 scenes for field {FieldId} ({From:yyyy-MM}–{To:yyyy-MM})",
            processed, fieldId, from, to);
        return processed;
    }

    private async Task<SatelliteCatalogItem?> ResolveCatalogItemAsync(Field field, string? catalogItemId, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(catalogItemId))
        {
            var requested = await _catalogProvider.GetItemAsync(catalogItemId, cancellationToken);
            if (requested == null)
            {
                _logger.LogWarning("Requested scene {ItemId} was not found in the catalogue", catalogItemId);
            }

            return requested;
        }

        var bbox = GeoMath.BoundingBox(field.Boundary!);
        var results = await _catalogProvider.SearchAsync(new SatelliteSearchRequest
        {
            MinLng = bbox[0],
            MinLat = bbox[1],
            MaxLng = bbox[2],
            MaxLat = bbox[3],
            MaxCloudCover = _options.MaxCloudCover
        }, cancellationToken);

        var item = results.FirstOrDefault(r => r.HasBands(MandatoryBands));
        if (item == null)
        {
            _logger.LogInformation("No Sentinel-2 scene under {MaxCloud}% cloud for field {FieldId}", _options.MaxCloudCover, field.Id);
        }

        return item;
    }

    private async Task<FieldSatelliteObservation?> BuildObservationAsync(Field field, SatelliteCatalogItem item, CancellationToken cancellationToken)
    {
        var bbox = GeoMath.BoundingBox(field.Boundary!);
        var httpClient = _httpClientFactory.CreateClient(GeospatialHttpClients.Raster);

        var redReader = await OpenBandAsync(httpClient, item, SatelliteBands.Red, cancellationToken);
        if (redReader == null)
        {
            return null;
        }

        // The scene's own projection is authoritative; falling back to the field
        // centroid's UTM zone only matters for rasters missing a projection key.
        var epsg = redReader.Epsg != 0
            ? redReader.Epsg
            : UtmProjection.EpsgFromLatLng((bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2);

        var grid = CogBandReader.BuildGrid(
            bbox[1], bbox[0], bbox[3], bbox[2],
            _options.AnalysisPixelSizeMetres,
            epsg,
            _options.MaxRasterDimension);

        var insideField = BuildFieldMask(grid, field.Boundary!);
        if (insideField.All(inside => !inside))
        {
            _logger.LogWarning("Field {FieldId} boundary produced no pixels on the analysis grid", field.Id);
            return null;
        }

        var red = SatelliteIndexCalculator.ToReflectance(await redReader.ReadOnGridAsync(grid, cancellationToken), _options.ReflectanceScale, _options.ReflectanceOffset);
        var nir = await ReadReflectanceAsync(httpClient, item, SatelliteBands.Nir, grid, cancellationToken);
        if (nir == null)
        {
            return null;
        }

        var sceneClassification = await ReadRawBandAsync(httpClient, item, SatelliteBands.SceneClassification, grid, cancellationToken);
        var mask = SatelliteIndexCalculator.BuildMask(insideField, sceneClassification);

        if (mask.UsablePixels == 0)
        {
            _logger.LogInformation("Scene {ItemId} is fully obscured over field {FieldId}", item.ItemId, field.Id);
            return null;
        }

        var green = await ReadReflectanceAsync(httpClient, item, SatelliteBands.Green, grid, cancellationToken);
        var blue = await ReadReflectanceAsync(httpClient, item, SatelliteBands.Blue, grid, cancellationToken);
        var swir = await ReadReflectanceAsync(httpClient, item, SatelliteBands.Swir16, grid, cancellationToken);
        var redEdge = await ReadReflectanceAsync(httpClient, item, SatelliteBands.RedEdge, grid, cancellationToken);

        var ndvi = SatelliteIndexCalculator.Ndvi(nir, red, mask.Usable);
        var savi = SatelliteIndexCalculator.Savi(nir, red, mask.Usable);
        var ndmi = swir == null ? null : SatelliteIndexCalculator.Ndmi(nir, swir, mask.Usable);
        var ndre = redEdge == null ? null : SatelliteIndexCalculator.Ndre(nir, redEdge, mask.Usable);
        var ndwi = green == null ? null : SatelliteIndexCalculator.Ndwi(green, nir, mask.Usable);

        var usable = mask.UsablePercent >= _options.MinUsablePixelPercent;

        var observation = new FieldSatelliteObservation
        {
            Id = Guid.NewGuid().ToString("N"),
            FieldId = field.Id,
            CatalogItemId = item.ItemId,
            ObservationDate = item.ObservationDate,
            CloudCoverPercent = item.CloudCoverPercent,
            FieldCloudCoverPercent = sceneClassification == null ? null : mask.ObscuredPercent,
            UsablePixelPercent = mask.UsablePercent,
            IsUsable = usable,
            Source = item.Platform,
            Resolution = $"{grid.PixelSize:0.#} m",
            OverlayBounds = GeographicResampler.GeographicBounds(grid),
            NdviStats = RasterStatistics.Summarise(ndvi),
            SaviStats = RasterStatistics.Summarise(savi),
            NdmiStats = ndmi == null ? null : RasterStatistics.Summarise(ndmi),
            NdreStats = ndre == null ? null : RasterStatistics.Summarise(ndre),
            NdwiStats = ndwi == null ? null : RasterStatistics.Summarise(ndwi),
            Metadata = BuildMetadata(item, grid, mask, sceneClassification != null),
            CreatedAt = _dateTimeProvider.UtcNow,
            UpdatedAt = _dateTimeProvider.UtcNow
        };

        await ApplyChangeAnalysisAsync(observation, grid, ndvi, cancellationToken);

        if (_options.GenerateOverlays)
        {
            await StoreOverlaysAsync(observation, grid, ndvi, ndmi, ndre, ndwi, savi, red, green, blue, cancellationToken);
        }

        await _observationRepository.CreateAsync(observation, cancellationToken);
        await UpdateProfileSummaryAsync(observation, cancellationToken);

        _logger.LogInformation(
            "Processed scene {ItemId} for field {FieldId}: {Usable}% usable pixels, NDVI mean {Ndvi}",
            item.ItemId, field.Id, mask.UsablePercent, observation.NdviStats?.Mean);

        return observation;
    }

    /// <summary>
    /// Compares the new NDVI grid against the previous usable observation, both as a
    /// mean shift and as a pixel-wise change raster when the grids line up.
    /// </summary>
    private async Task ApplyChangeAnalysisAsync(FieldSatelliteObservation observation, RasterGrid grid, double[] ndvi, CancellationToken cancellationToken)
    {
        var previous = await _observationRepository.GetPreviousUsableAsync(observation.FieldId, observation.ObservationDate, cancellationToken);
        if (previous?.NdviStats == null || observation.NdviStats == null)
        {
            return;
        }

        observation.ComparedToObservationId = previous.Id;
        observation.ComparedToObservationDate = previous.ObservationDate;

        // Guard against a near-zero baseline turning a small absolute shift into a
        // meaningless percentage.
        if (Math.Abs(previous.NdviStats.Mean) > 0.05)
        {
            observation.NdviChangePercent = Math.Round(
                (observation.NdviStats.Mean - previous.NdviStats.Mean) / Math.Abs(previous.NdviStats.Mean) * 100, 1);
        }

        var previousGrid = await LoadIndexGridAsync(previous, cancellationToken);
        if (previousGrid == null || !IndexGridSerializer.IsAligned(previousGrid.Value.Grid, grid))
        {
            return;
        }

        // A tenth of an NDVI unit is the smallest shift that reliably exceeds
        // atmospheric correction noise between two dates.
        const double MeaningfulChange = 0.1;

        var difference = SatelliteIndexCalculator.Difference(ndvi, previousGrid.Value.Values);
        observation.AreaDeclinePercent = RasterStatistics.ShareBelow(difference, -MeaningfulChange);
        observation.AreaIncreasePercent = RasterStatistics.ShareAbove(difference, MeaningfulChange);

        var baseline = await ComputeBaselineAsync(observation, cancellationToken);
        if (baseline.HasValue)
        {
            observation.AreaBelowBaselinePercent = RasterStatistics.ShareBelow(ndvi, baseline.Value);
        }

        if (_options.GenerateOverlays)
        {
            observation.NdviChangeStoragePath = await SaveOverlayAsync(observation, "ndvi-change", difference, grid, ColourRamp.Change, cancellationToken);
        }
    }

    /// <summary>
    /// The field's own historical NDVI level, which is a far more meaningful reference
    /// than any regional average because groves differ enormously in canopy density.
    /// </summary>
    private async Task<double?> ComputeBaselineAsync(FieldSatelliteObservation observation, CancellationToken cancellationToken)
    {
        var history = await _observationRepository.GetUsableInRangeAsync(
            observation.FieldId,
            observation.ObservationDate.AddYears(-3),
            observation.ObservationDate.AddDays(-1),
            cancellationToken);

        var means = history
            .Where(h => h.NdviStats != null)
            .Select(h => h.NdviStats!.Mean)
            .ToList();

        if (means.Count < 3)
        {
            return null;
        }

        means.Sort();
        return RasterStatistics.Percentile(means, 50);
    }

    private async Task<(RasterGrid Grid, double[] Values)?> LoadIndexGridAsync(FieldSatelliteObservation observation, CancellationToken cancellationToken)
    {
        var path = RasterPath(observation, "ndvi.grid.gz");
        if (!await _storage.ExistsAsync(path, cancellationToken))
        {
            return null;
        }

        try
        {
            await using var stream = await _storage.OpenReadAsync(path, cancellationToken);
            return IndexGridSerializer.Deserialise(stream);
        }
        catch (Exception ex) when (ex is IOException or InvalidDataException)
        {
            _logger.LogWarning(ex, "Could not read stored NDVI grid for observation {ObservationId}", observation.Id);
            return null;
        }
    }

    private async Task StoreOverlaysAsync(
        FieldSatelliteObservation observation,
        RasterGrid grid,
        double[] ndvi,
        double[]? ndmi,
        double[]? ndre,
        double[]? ndwi,
        double[] savi,
        double[] red,
        double[]? green,
        double[]? blue,
        CancellationToken cancellationToken)
    {
        observation.NdviStoragePath = await SaveOverlayAsync(observation, "ndvi", ndvi, grid, ColourRamp.Ndvi, cancellationToken);
        observation.SaviStoragePath = await SaveOverlayAsync(observation, "savi", savi, grid, ColourRamp.Ndvi, cancellationToken);

        if (ndmi != null)
        {
            observation.NdmiStoragePath = await SaveOverlayAsync(observation, "ndmi", ndmi, grid, ColourRamp.Ndmi, cancellationToken);
        }

        if (ndre != null)
        {
            observation.NdreStoragePath = await SaveOverlayAsync(observation, "ndre", ndre, grid, ColourRamp.Ndvi, cancellationToken);
        }

        if (ndwi != null)
        {
            observation.NdwiStoragePath = await SaveOverlayAsync(observation, "ndwi", ndwi, grid, ColourRamp.Ndmi, cancellationToken);
        }

        if (green != null && blue != null)
        {
            var redOverlay = GeographicResampler.Resample(grid, red);
            var greenOverlay = GeographicResampler.Resample(grid, green);
            var blueOverlay = GeographicResampler.Resample(grid, blue);

            var pixels = RasterRenderer.RenderTrueColour(
                redOverlay.Values, greenOverlay.Values, blueOverlay.Values, redOverlay.Width, redOverlay.Height);

            var path = RasterPath(observation, "truecolor.png");
            await _storage.SaveRasterBytesAsync(path, PngWriter.EncodeRgba(pixels, redOverlay.Width, redOverlay.Height), cancellationToken);
            observation.TrueColorStoragePath = path;
        }

        // Retain the NDVI samples so a later date can produce a pixel-level change map.
        await _storage.SaveRasterBytesAsync(
            RasterPath(observation, "ndvi.grid.gz"),
            IndexGridSerializer.Serialise(grid, ndvi),
            cancellationToken);
    }

    private async Task<string> SaveOverlayAsync(
        FieldSatelliteObservation observation,
        string indexId,
        double[] values,
        RasterGrid grid,
        ColourRamp ramp,
        CancellationToken cancellationToken)
    {
        var overlay = GeographicResampler.Resample(grid, values);
        var pixels = RasterRenderer.RenderIndex(overlay.Values, overlay.Width, overlay.Height, ramp);
        var path = RasterPath(observation, $"{indexId}.png");
        await _storage.SaveRasterBytesAsync(path, PngWriter.EncodeRgba(pixels, overlay.Width, overlay.Height), cancellationToken);
        return path;
    }

    private async Task UpdateProfileSummaryAsync(FieldSatelliteObservation observation, CancellationToken cancellationToken)
    {
        // Only usable observations should shape the field summary the grower sees.
        if (!observation.IsUsable)
        {
            return;
        }

        var profile = await _profileRepository.GetByFieldIdAsync(observation.FieldId, cancellationToken)
            ?? new FieldSpatialProfile { Id = observation.FieldId, FieldId = observation.FieldId };

        profile.LatestSatelliteSummary = new SatelliteSummary
        {
            LatestObservationId = observation.Id,
            ObservationDate = observation.ObservationDate,
            CloudCoverPercent = observation.CloudCoverPercent,
            FieldCloudCoverPercent = observation.FieldCloudCoverPercent,
            UsablePixelPercent = observation.UsablePixelPercent,
            NdviMean = observation.NdviStats?.Mean,
            NdviMedian = observation.NdviStats?.Median,
            NdviChangePercent = observation.NdviChangePercent,
            ComparedToObservationDate = observation.ComparedToObservationDate,
            AreaBelowBaselinePercent = observation.AreaBelowBaselinePercent,
            NdmiMean = observation.NdmiStats?.Mean,
            NdreMean = observation.NdreStats?.Mean,
            NdwiMean = observation.NdwiStats?.Mean,
            SaviMean = observation.SaviStats?.Mean,
            NdviTrendLabel = DescribeTrend(observation.NdviChangePercent),
            Metadata = observation.Metadata
        };

        profile.UpdatedAt = _dateTimeProvider.UtcNow;
        await _profileRepository.UpsertAsync(profile, cancellationToken);
    }

    public async Task<int> PruneAsync(CancellationToken cancellationToken = default)
    {
        var retainDays = Math.Max(_options.RetentionDays, Math.Max(0, _options.HistoryYears) * 365 + 31);
        var cutoff = _dateTimeProvider.UtcNow.AddDays(-retainDays);
        var removed = await _observationRepository.DeleteOlderThanAsync(cutoff, cancellationToken);

        foreach (var observation in removed)
        {
            foreach (var path in RasterPaths(observation))
            {
                try
                {
                    await _storage.DeleteAsync(path, cancellationToken);
                }
                catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
                {
                    _logger.LogWarning(ex, "Could not delete raster {Path} for expired observation {ObservationId}", path, observation.Id);
                }
            }
        }

        if (removed.Count > 0)
        {
            _logger.LogInformation("Pruned {Count} satellite observations older than {Cutoff:yyyy-MM-dd}", removed.Count, cutoff);
        }

        return removed.Count;
    }

    private static IEnumerable<string> RasterPaths(FieldSatelliteObservation observation)
    {
        string?[] paths =
        [
            observation.NdviStoragePath,
            observation.NdmiStoragePath,
            observation.NdreStoragePath,
            observation.NdwiStoragePath,
            observation.SaviStoragePath,
            observation.NdviChangeStoragePath,
            observation.TrueColorStoragePath,
            RasterPath(observation, "ndvi.grid.gz")
        ];

        return paths.Where(p => !string.IsNullOrWhiteSpace(p)).Select(p => p!);
    }

    private static string RasterPath(FieldSatelliteObservation observation, string fileName)
        => $"fields/{observation.FieldId}/satellite/{observation.ObservationDate:yyyyMMdd}-{observation.Id}/{fileName}";

    private static string? DescribeTrend(double? changePercent) => changePercent switch
    {
        null => null,
        < -10 => "Well below the previous observation",
        < -5 => "Below the previous observation",
        > 10 => "Well above the previous observation",
        > 5 => "Above the previous observation",
        _ => "In line with the previous observation"
    };

    private DataSourceMetadata BuildMetadata(SatelliteCatalogItem item, RasterGrid grid, BandMaskResult mask, bool hasSceneClassification)
    {
        var notes = new List<string>();

        if (!hasSceneClassification)
        {
            notes.Add("No scene classification band was available, so cloud and shadow pixels could not be excluded.");
        }

        if (mask.UsablePercent < _options.MinUsablePixelPercent)
        {
            notes.Add($"Only {mask.UsablePercent}% of the field was clear, which is below the {_options.MinUsablePixelPercent}% needed for a representative reading.");
        }

        if (grid.PixelSize > _options.AnalysisPixelSizeMetres)
        {
            notes.Add($"Analysed at {grid.PixelSize:0.#} m instead of {_options.AnalysisPixelSizeMetres:0.#} m because the field is large.");
        }

        return new DataSourceMetadata
        {
            Source = $"{item.Platform} L2A",
            SourceUrl = "https://dataspace.copernicus.eu/",
            Attribution = "Contains modified Copernicus Sentinel data",
            Licence = "Copernicus Open Access",
            SpatialResolution = $"{grid.PixelSize:0.#} m",
            ValueType = "satellite derived",
            SourceDate = item.ObservationDate,
            LastUpdatedAt = _dateTimeProvider.UtcNow,
            ConfidenceNote = notes.Count == 0 ? null : string.Join(" ", notes)
        };
    }

    private async Task<CogBandReader?> OpenBandAsync(HttpClient httpClient, SatelliteCatalogItem item, string band, CancellationToken cancellationToken)
    {
        if (!item.Assets.TryGetValue(band, out var url))
        {
            return null;
        }

        try
        {
            return await CogBandReader.OpenAsync(new HttpRangeReader(httpClient, url), cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or InvalidDataException or NotSupportedException)
        {
            _logger.LogWarning(ex, "Could not open {Band} band for scene {ItemId}", band, item.ItemId);
            return null;
        }
    }

    private async Task<double[]?> ReadRawBandAsync(HttpClient httpClient, SatelliteCatalogItem item, string band, RasterGrid grid, CancellationToken cancellationToken)
    {
        var reader = await OpenBandAsync(httpClient, item, band, cancellationToken);
        if (reader == null)
        {
            return null;
        }

        try
        {
            return await reader.ReadOnGridAsync(grid, cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or InvalidDataException or NotSupportedException or InvalidOperationException)
        {
            _logger.LogWarning(ex, "Could not read {Band} band for scene {ItemId}", band, item.ItemId);
            return null;
        }
    }

    private async Task<double[]?> ReadReflectanceAsync(HttpClient httpClient, SatelliteCatalogItem item, string band, RasterGrid grid, CancellationToken cancellationToken)
    {
        var raw = await ReadRawBandAsync(httpClient, item, band, grid, cancellationToken);
        return raw == null ? null : SatelliteIndexCalculator.ToReflectance(raw, _options.ReflectanceScale, _options.ReflectanceOffset);
    }

    /// <summary>
    /// Marks the grid cells whose centre falls inside the field boundary, honouring
    /// interior rings so excluded areas are not measured.
    /// </summary>
    private static bool[] BuildFieldMask(RasterGrid grid, Core.ValueObjects.GeoJsonPolygon boundary)
    {
        if (!UtmProjection.TryParseEpsg(grid.Epsg, out var zone, out var northern))
        {
            throw new NotSupportedException($"EPSG:{grid.Epsg} is not a supported UTM projection.");
        }

        // Project the rings once: a per-pixel projection would dominate runtime.
        var projectedRings = boundary.Coordinates
            .Select(ring => ring
                .Where(point => point.Count >= 2)
                .Select(point => UtmProjection.ToUtm(point[1], point[0], zone, northern))
                .ToList())
            .Where(ring => ring.Count >= 3)
            .ToList();

        var mask = new bool[grid.PixelCount];
        if (projectedRings.Count == 0)
        {
            return mask;
        }

        for (var row = 0; row < grid.Height; row++)
        {
            var y = grid.CellCentreY(row);
            for (var column = 0; column < grid.Width; column++)
            {
                var x = grid.CellCentreX(column);

                if (!IsInsideRing(projectedRings[0], x, y))
                {
                    continue;
                }

                var inHole = false;
                for (var i = 1; i < projectedRings.Count && !inHole; i++)
                {
                    inHole = IsInsideRing(projectedRings[i], x, y);
                }

                mask[row * grid.Width + column] = !inHole;
            }
        }

        return mask;
    }

    private static bool IsInsideRing(List<(double Easting, double Northing)> ring, double x, double y)
    {
        var inside = false;
        for (int i = 0, j = ring.Count - 1; i < ring.Count; j = i++)
        {
            var (xi, yi) = ring[i];
            var (xj, yj) = ring[j];

            if (yi > y != yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi)
            {
                inside = !inside;
            }
        }

        return inside;
    }
}
