using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Geospatial;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Application.Services.Geospatial;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/fields/{fieldId}")]
public class FieldSpatialController : BaseApiController
{
    private readonly IFieldAccessService _fieldAccessService;
    private readonly IFieldRepository _fieldRepository;
    private readonly IFieldSpatialProfileService _spatialProfileService;
    private readonly IWeatherIntelligenceService _weatherService;
    private readonly IFieldDailyWeatherSnapshotRepository _snapshotRepository;
    private readonly IFieldEnvironmentalAlertRepository _alertRepository;
    private readonly IFieldSatelliteObservationRepository _satelliteRepository;
    private readonly IFieldMapDataService _mapDataService;
    private readonly IGeospatialJobQueue _jobQueue;
    private readonly IGeospatialStorageService _storage;

    public FieldSpatialController(
        IFieldAccessService fieldAccessService,
        IFieldRepository fieldRepository,
        IFieldSpatialProfileService spatialProfileService,
        IWeatherIntelligenceService weatherService,
        IFieldDailyWeatherSnapshotRepository snapshotRepository,
        IFieldEnvironmentalAlertRepository alertRepository,
        IFieldSatelliteObservationRepository satelliteRepository,
        IFieldMapDataService mapDataService,
        IGeospatialJobQueue jobQueue,
        IGeospatialStorageService storage,
        ICurrentUserContext currentUser) : base(currentUser)
    {
        _fieldAccessService = fieldAccessService;
        _fieldRepository = fieldRepository;
        _spatialProfileService = spatialProfileService;
        _weatherService = weatherService;
        _snapshotRepository = snapshotRepository;
        _alertRepository = alertRepository;
        _satelliteRepository = satelliteRepository;
        _mapDataService = mapDataService;
        _jobQueue = jobQueue;
        _storage = storage;
    }

    [HttpGet("spatial-profile")]
    public async Task<ActionResult<FieldSpatialProfileDto>> GetSpatialProfile(string fieldId, CancellationToken ct)
    {
        var field = await RequireFieldAccess(fieldId, ct);
        var profile = await _spatialProfileService.GetProfileAsync(fieldId, ct);
        if (profile == null)
            return Ok(new FieldSpatialProfileDto { FieldId = fieldId, ProcessingStatus = "pending" });
        return Ok(profile);
    }

    [HttpGet("intelligence")]
    public async Task<ActionResult<FieldIntelligenceSummaryDto>> GetIntelligence(string fieldId, CancellationToken ct)
    {
        var field = await RequireFieldAccess(fieldId, ct);
        return Ok(await _spatialProfileService.GetIntelligenceSummaryAsync(field, ct));
    }

    [HttpGet("weather")]
    public async Task<ActionResult<FieldWeatherDto>> GetWeather(string fieldId, CancellationToken ct)
    {
        var field = await RequireFieldAccess(fieldId, ct);
        return Ok(await _weatherService.GetFieldWeatherAsync(field, ct));
    }

    [HttpGet("weather/history")]
    public async Task<ActionResult<FieldWeatherHistoryDto>> GetWeatherHistory(string fieldId, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        await RequireFieldAccess(fieldId, ct);
        var fromDate = from ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var toDate = to ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var snapshots = await _snapshotRepository.GetHistoryAsync(fieldId, fromDate, toDate, ct);
        return Ok(new FieldWeatherHistoryDto
        {
            FieldId = fieldId,
            Snapshots = snapshots.Select(s => new DailyWeatherSnapshotDto
            {
                Date = s.Date,
                MinTemperatureC = s.MinTemperatureC,
                MaxTemperatureC = s.MaxTemperatureC,
                RainTotalMm = s.RainTotalMm,
                Et0Mm = s.Et0Mm
            }).ToList()
        });
    }

    [HttpGet("alerts")]
    public async Task<ActionResult<IEnumerable<FieldEnvironmentalAlertDto>>> GetAlerts(string fieldId, CancellationToken ct)
    {
        await RequireFieldAccess(fieldId, ct);
        var alerts = await _alertRepository.GetActiveByFieldIdAsync(fieldId, ct);
        return Ok(alerts.Select(GeospatialMapper.ToAlertDto));
    }

    [HttpGet("satellite")]
    public async Task<ActionResult<IEnumerable<FieldSatelliteObservationDto>>> GetSatellite(string fieldId, CancellationToken ct)
    {
        await RequireFieldAccess(fieldId, ct);
        var observations = await _satelliteRepository.GetByFieldIdAsync(fieldId, ct);
        return Ok(observations.Select(o => GeospatialMapper.ToObservationDto(o, _storage.GetPublicUrl)));
    }

    /// <summary>
    /// Available observation dates for the satellite date selector, including
    /// cloud-affected ones so the grower can see why a date is not usable.
    /// </summary>
    [HttpGet("satellite/dates")]
    public async Task<ActionResult<IEnumerable<SatelliteDateDto>>> GetSatelliteDates(string fieldId, CancellationToken ct)
    {
        await RequireFieldAccess(fieldId, ct);
        var observations = await _satelliteRepository.GetByFieldIdAsync(fieldId, ct);
        return Ok(observations.Select(GeospatialMapper.ToSatelliteDateDto));
    }

    [HttpGet("satellite/{observationId}")]
    public async Task<ActionResult<FieldSatelliteObservationDto>> GetSatelliteObservation(string fieldId, string observationId, CancellationToken ct)
    {
        await RequireFieldAccess(fieldId, ct);
        var observation = await _satelliteRepository.GetByIdAsync(observationId, ct);
        if (observation == null || observation.FieldId != fieldId)
        {
            return NotFound();
        }

        return Ok(GeospatialMapper.ToObservationDto(observation, _storage.GetPublicUrl));
    }

    /// <summary>
    /// Queues processing of a specific scene, or the newest usable one, so a grower
    /// can refresh imagery without waiting for the daily discovery job.
    /// </summary>
    [HttpPost("satellite/refresh")]
    public async Task<IActionResult> RefreshSatellite(string fieldId, [FromQuery] string? catalogItemId, CancellationToken ct)
    {
        await RequireFieldAccess(fieldId, ct);
        await _jobQueue.EnqueueSatelliteProcessingAsync(fieldId, catalogItemId, ct);
        return Accepted();
    }

    /// <summary>
    /// Re-runs the full field intelligence pipeline: terrain, soil, weather,
    /// environment, and a fresh satellite search.
    /// </summary>
    [HttpPost("intelligence/refresh")]
    public async Task<IActionResult> RefreshIntelligence(string fieldId, CancellationToken ct)
    {
        await RequireFieldAccess(fieldId, ct);
        await _jobQueue.EnqueueSpatialProfileAsync(fieldId, ct);
        await _jobQueue.EnqueueSatelliteProcessingAsync(fieldId, null, ct);
        await _jobQueue.EnqueueTaskConditionsAsync(fieldId, ct);
        return Accepted();
    }

    /// <summary>
    /// Re-queues weather and satellite work when the History page finds too few snapshots.
    /// </summary>
    [HttpPost("history/backfill")]
    public async Task<IActionResult> BackfillHistory(string fieldId, CancellationToken ct)
    {
        await RequireFieldAccess(fieldId, ct);
        await _jobQueue.EnqueueSpatialProfileAsync(fieldId, ct);
        await _jobQueue.EnqueueSatelliteProcessingAsync(fieldId, null, ct);
        return Accepted();
    }

    [HttpGet("map-data")]
    public async Task<ActionResult<FieldMapDataDto>> GetMapData(
        string fieldId,
        [FromQuery] string? layers,
        [FromQuery] string? observationId,
        CancellationToken ct)
    {
        await RequireFieldAccess(fieldId, ct);
        var layerIds = (layers ?? "ndvi").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return Ok(await _mapDataService.GetMapDataAsync(fieldId, layerIds, observationId, ct));
    }

    private async Task<Core.Entities.Field> RequireFieldAccess(string fieldId, CancellationToken ct)
    {
        var field = await _fieldRepository.GetByIdAsync(fieldId, ct);
        if (field == null) throw new NotFoundException("Field not found.");
        if (!await _fieldAccessService.CanUserAccessFieldAsync(fieldId, UserContext.UserId, UserContext.Role, ct))
            throw new ForbiddenException("Access denied.");
        return field;
    }
}

[Authorize]
[Route("api/v1/map")]
public class MapController : BaseApiController
{
    private readonly IMapLayerCatalog _layerCatalog;

    public MapController(IMapLayerCatalog layerCatalog, ICurrentUserContext currentUser) : base(currentUser)
    {
        _layerCatalog = layerCatalog;
    }

    [HttpGet("layers")]
    public ActionResult<MapLayerCatalogDto> GetLayers()
    {
        return Ok(new MapLayerCatalogDto
        {
            BaseLayers = _layerCatalog.GetBaseLayers().Select(ToDto).ToList(),
            OverlayLayers = _layerCatalog.GetOverlayLayers().Select(ToDto).ToList()
        });
    }

    private static MapLayerDefinitionDto ToDto(MapLayerDefinition l) => new()
    {
        Id = l.Id, Name = l.Name, Category = l.Category, LayerType = l.LayerType,
        TileUrlTemplate = l.TileUrlTemplate, Provider = l.Provider, Attribution = l.Attribution,
        Licence = l.Licence, SourceUrl = l.SourceUrl, SpatialResolution = l.SpatialResolution,
        DefaultVisible = l.DefaultVisible, Advanced = l.Advanced
    };
}

[Authorize(Policy = PolicyNames.RequireAdministrator)]
[Route("api/v1/admin/data-sources")]
public class AdminDataSourcesController : BaseApiController
{
    /// <summary>Natura exports are national datasets; anything larger is almost certainly a mistake.</summary>
    private const long MaxNaturaUploadBytes = 200L * 1024 * 1024;

    /// <summary>Enough recent failures to spot a pattern without paging.</summary>
    private const int RecentFailureLimit = 10;

    private readonly IDataSourceHealthRepository _healthRepository;
    private readonly INaturaSiteRepository _naturaSiteRepository;
    private readonly INaturaSiteImportService _naturaImportService;
    private readonly IGeospatialProcessingJobRepository _jobRepository;

    public AdminDataSourcesController(
        IDataSourceHealthRepository healthRepository,
        INaturaSiteRepository naturaSiteRepository,
        INaturaSiteImportService naturaImportService,
        IGeospatialProcessingJobRepository jobRepository,
        ICurrentUserContext currentUser) : base(currentUser)
    {
        _healthRepository = healthRepository;
        _naturaSiteRepository = naturaSiteRepository;
        _naturaImportService = naturaImportService;
        _jobRepository = jobRepository;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DataSourceHealthDto>>> GetDataSources(CancellationToken ct)
    {
        var sources = await _healthRepository.GetAllAsync(ct);
        return Ok(sources.Select(s => new DataSourceHealthDto
        {
            SourceId = s.SourceId,
            DisplayName = s.DisplayName,
            Status = s.Status,
            LastSuccessfulUpdate = s.LastSuccessfulUpdate,
            LastError = s.LastError,
            Details = s.Details
        }));
    }

    [HttpGet("jobs")]
    public async Task<ActionResult<GeospatialJobStatusDto>> GetJobStatus(CancellationToken ct)
    {
        var counts = await _jobRepository.CountByStatusAsync(ct);
        var failures = await _jobRepository.GetRecentFailuresAsync(RecentFailureLimit, ct);

        return Ok(new GeospatialJobStatusDto
        {
            Pending = counts.GetValueOrDefault(GeospatialProcessingStatus.Pending),
            Processing = counts.GetValueOrDefault(GeospatialProcessingStatus.Processing),
            Completed = counts.GetValueOrDefault(GeospatialProcessingStatus.Completed),
            Partial = counts.GetValueOrDefault(GeospatialProcessingStatus.Partial),
            Failed = counts.GetValueOrDefault(GeospatialProcessingStatus.Failed),
            RecentFailures = failures.Select(f => new GeospatialJobFailureDto
            {
                JobType = f.JobType,
                FieldId = f.FieldId,
                Attempts = f.Attempts,
                LastError = f.LastError,
                FailedAt = f.UpdatedAt
            }).ToList()
        });
    }

    [HttpGet("natura")]
    public async Task<ActionResult<NaturaSiteStatusDto>> GetNaturaStatus(CancellationToken ct)
    {
        var count = await _naturaSiteRepository.CountAsync(ct);
        return Ok(new NaturaSiteStatusDto { SiteCount = count });
    }

    /// <summary>
    /// Imports Natura 2000 boundaries from an EEA GeoJSON export. Re-running the
    /// import refreshes existing sites instead of duplicating them.
    /// </summary>
    [HttpPost("natura/import")]
    [RequestSizeLimit(MaxNaturaUploadBytes)]
    public async Task<ActionResult<NaturaImportResultDto>> ImportNaturaSites(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
        {
            throw new ValidationException("A GeoJSON file is required.");
        }

        if (file.Length > MaxNaturaUploadBytes)
        {
            throw new ValidationException("The GeoJSON file exceeds the maximum supported size.");
        }

        await using var stream = file.OpenReadStream();
        var result = await _naturaImportService.ImportFromGeoJsonAsync(stream, ct);
        return Ok(new NaturaImportResultDto
        {
            SitesImported = result.SitesImported,
            SitesSkipped = result.SitesSkipped,
            Warnings = result.Warnings
        });
    }
}
