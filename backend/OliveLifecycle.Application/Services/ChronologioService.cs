using System.Globalization;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Chronologio;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Application.Services;

public class ChronologioService : IChronologioService
{
    private static readonly HashSet<string> IncludedActivityTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "lifecycle_year_changed",
        "lifecycle_stage_changed",
        "lifecycle_corrected",
        "producer_assigned",
        "producer_unassigned",
        "partner_contact_accepted"
    };

    private const int MaxLimit = 200;
    private const int DefaultLimit = 50;
    private const int SummaryMaxEntries = 5000;
    private const int NotePreviewLength = 160;
    private const int ActivityFetchLimit = 200;
    private const int MaxHighlights = 4;

    private readonly IFieldAccessService _fieldAccessService;
    private readonly IFieldService _fieldService;
    private readonly IFieldRepository _fieldRepository;
    private readonly ITaskExecutionRepository _taskExecutionRepository;
    private readonly IFieldTaskRepository _fieldTaskRepository;
    private readonly IFinancialTransactionRepository _financialTransactions;
    private readonly IHarvestRecordRepository _harvestRecordRepository;
    private readonly INoteRepository _noteRepository;
    private readonly IActivityRepository _activityRepository;
    private readonly IUserRepository _userRepository;
    private readonly IMediaAttachmentRepository _mediaAttachmentRepository;
    private readonly IFieldWeatherPeriodReviewRepository _weatherReviewRepository;
    private readonly IGeospatialStorageService _geospatialStorage;
    private readonly ILogger<ChronologioService> _logger;

    public ChronologioService(
        IFieldAccessService fieldAccessService,
        IFieldService fieldService,
        IFieldRepository fieldRepository,
        ITaskExecutionRepository taskExecutionRepository,
        IFieldTaskRepository fieldTaskRepository,
        IFinancialTransactionRepository financialTransactions,
        IHarvestRecordRepository harvestRecordRepository,
        INoteRepository noteRepository,
        IActivityRepository activityRepository,
        IUserRepository userRepository,
        IMediaAttachmentRepository mediaAttachmentRepository,
        IFieldWeatherPeriodReviewRepository weatherReviewRepository,
        IGeospatialStorageService geospatialStorage,
        ILogger<ChronologioService> logger)
    {
        _fieldAccessService = fieldAccessService;
        _fieldService = fieldService;
        _fieldRepository = fieldRepository;
        _taskExecutionRepository = taskExecutionRepository;
        _fieldTaskRepository = fieldTaskRepository;
        _financialTransactions = financialTransactions;
        _harvestRecordRepository = harvestRecordRepository;
        _noteRepository = noteRepository;
        _activityRepository = activityRepository;
        _userRepository = userRepository;
        _mediaAttachmentRepository = mediaAttachmentRepository;
        _weatherReviewRepository = weatherReviewRepository;
        _geospatialStorage = geospatialStorage;
        _logger = logger;
    }

    public async Task<IReadOnlyList<ChronologioEntryDto>> GetForFieldAsync(
        string fieldId,
        string userId,
        string userRole,
        ChronologioQuery query,
        CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserAccessFieldAsync(fieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }

        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        var fieldLabels = new Dictionary<string, FieldLabel>(StringComparer.Ordinal)
        {
            [field.Id] = new FieldLabel(field.Name ?? string.Empty, field.Color)
        };

        return await BuildTimelineAsync(
            new[] { fieldId },
            fieldLabels,
            userId,
            query,
            cancellationToken);
    }

    public async Task<IReadOnlyList<ChronologioEntryDto>> GetForUserAsync(
        string userId,
        string userRole,
        ChronologioQuery query,
        CancellationToken cancellationToken = default)
    {
        var fields = (await _fieldService.GetFieldsForUserAsync(userId, userRole, cancellationToken)).ToList();
        if (!string.IsNullOrWhiteSpace(query.FieldId))
        {
            fields = fields
                .Where(f => string.Equals(f.Id, query.FieldId, StringComparison.Ordinal))
                .ToList();
        }

        fields = fields.Where(f => IsPublishedField(f.Status)).ToList();

        if (fields.Count == 0)
        {
            return Array.Empty<ChronologioEntryDto>();
        }

        var fieldIds = fields.Select(f => f.Id).ToList();
        var fieldLabels = fields.ToDictionary(
            f => f.Id,
            f => new FieldLabel(f.Name ?? string.Empty, f.Color),
            StringComparer.Ordinal);

        return await BuildTimelineAsync(fieldIds, fieldLabels, userId, query, cancellationToken);
    }

    public async Task<IReadOnlyList<ChronologioPeriodSummaryDto>> GetYearSummariesForFieldAsync(
        string fieldId,
        string userId,
        string userRole,
        ChronologioSummaryQuery query,
        CancellationToken cancellationToken = default)
    {
        var (fieldIds, fieldLabels) = await ResolveFieldScopeAsync(fieldId, userId, userRole, query.FieldId, requireSingleField: true, cancellationToken);
        var entries = await LoadEntriesForSummaryAsync(fieldIds, fieldLabels, userId, query, cancellationToken);
        return AggregatePeriodSummaries(entries, ChronologioAxis.Normalize(query.Axis));
    }

    public async Task<IReadOnlyList<ChronologioPeriodSummaryDto>> GetYearSummariesForUserAsync(
        string userId,
        string userRole,
        ChronologioSummaryQuery query,
        CancellationToken cancellationToken = default)
    {
        var (fieldIds, fieldLabels) = await ResolveFieldScopeAsync(null, userId, userRole, query.FieldId, requireSingleField: false, cancellationToken);
        if (fieldIds.Count == 0)
        {
            return Array.Empty<ChronologioPeriodSummaryDto>();
        }

        var entries = await LoadEntriesForSummaryAsync(fieldIds, fieldLabels, userId, query, cancellationToken);
        return AggregatePeriodSummaries(entries, ChronologioAxis.Normalize(query.Axis));
    }

    public async Task<IReadOnlyList<ChronologioMonthSummaryDto>> GetMonthSummariesForFieldAsync(
        string fieldId,
        string userId,
        string userRole,
        ChronologioSummaryQuery query,
        CancellationToken cancellationToken = default)
    {
        var (fieldIds, fieldLabels) = await ResolveFieldScopeAsync(fieldId, userId, userRole, query.FieldId, requireSingleField: true, cancellationToken);
        return await BuildMonthSummariesAsync(fieldIds, fieldLabels, userId, query, cancellationToken);
    }

    public async Task<IReadOnlyList<ChronologioMonthSummaryDto>> GetMonthSummariesForUserAsync(
        string userId,
        string userRole,
        ChronologioSummaryQuery query,
        CancellationToken cancellationToken = default)
    {
        var (fieldIds, fieldLabels) = await ResolveFieldScopeAsync(null, userId, userRole, query.FieldId, requireSingleField: false, cancellationToken);
        if (fieldIds.Count == 0)
        {
            return Array.Empty<ChronologioMonthSummaryDto>();
        }

        return await BuildMonthSummariesAsync(fieldIds, fieldLabels, userId, query, cancellationToken);
    }

    private async Task<(IReadOnlyList<string> FieldIds, IReadOnlyDictionary<string, FieldLabel> FieldLabels)> ResolveFieldScopeAsync(
        string? pathFieldId,
        string userId,
        string userRole,
        string? queryFieldId,
        bool requireSingleField,
        CancellationToken cancellationToken)
    {
        if (requireSingleField || !string.IsNullOrWhiteSpace(pathFieldId))
        {
            var fieldId = pathFieldId ?? throw new ArgumentException("Field id is required.");
            if (!await _fieldAccessService.CanUserAccessFieldAsync(fieldId, userId, userRole, cancellationToken))
            {
                throw new ForbiddenException("You do not have access to this field.");
            }

            var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
                ?? throw new NotFoundException("Field not found.");

            return (
                new[] { fieldId },
                new Dictionary<string, FieldLabel>(StringComparer.Ordinal)
                {
                    [field.Id] = new FieldLabel(field.Name ?? string.Empty, field.Color)
                });
        }

        var fields = (await _fieldService.GetFieldsForUserAsync(userId, userRole, cancellationToken)).ToList();
        if (!string.IsNullOrWhiteSpace(queryFieldId))
        {
            fields = fields
                .Where(f => string.Equals(f.Id, queryFieldId, StringComparison.Ordinal))
                .ToList();
        }

        fields = fields.Where(f => IsPublishedField(f.Status)).ToList();

        return (
            fields.Select(f => f.Id).ToList(),
            fields.ToDictionary(
                f => f.Id,
                f => new FieldLabel(f.Name ?? string.Empty, f.Color),
                StringComparer.Ordinal));
    }

    private async Task<IReadOnlyList<ChronologioEntryDto>> LoadEntriesForSummaryAsync(
        IReadOnlyList<string> fieldIds,
        IReadOnlyDictionary<string, FieldLabel> fieldLabels,
        string userId,
        ChronologioSummaryQuery summaryQuery,
        CancellationToken cancellationToken)
    {
        return await BuildTimelineAsync(
            fieldIds,
            fieldLabels,
            userId,
            new ChronologioQuery
            {
                From = summaryQuery.From,
                To = summaryQuery.To,
                Category = summaryQuery.Category,
                FieldId = summaryQuery.FieldId,
                Limit = SummaryMaxEntries,
                Offset = 0
            },
            cancellationToken,
            pageResults: false);
    }

    private async Task<IReadOnlyList<ChronologioMonthSummaryDto>> BuildMonthSummariesAsync(
        IReadOnlyList<string> fieldIds,
        IReadOnlyDictionary<string, FieldLabel> fieldLabels,
        string userId,
        ChronologioSummaryQuery query,
        CancellationToken cancellationToken)
    {
        var axis = ChronologioAxis.Normalize(query.Axis);
        var periodYear = query.PeriodYear
            ?? (ChronologioAxis.IsAgricultural(axis)
                ? AgriculturalYear.For(DateTime.UtcNow)
                : ChronologioAxis.IsSeason(axis)
                    ? ChronologioSeasonCalendar.GetSeasonStartYear(DateTime.UtcNow)
                    : DateTime.UtcNow.Year);

        var (from, to) = ChronologioSeasonCalendar.BoundsForPeriod(periodYear, axis);
        var entries = await BuildTimelineAsync(
            fieldIds,
            fieldLabels,
            userId,
            new ChronologioQuery
            {
                From = from,
                To = to,
                Category = query.Category,
                FieldId = query.FieldId,
                Limit = SummaryMaxEntries,
                Offset = 0
            },
            cancellationToken,
            pageResults: false);

        return AggregateMonthSummaries(entries, periodYear, axis);
    }

    private static IReadOnlyList<ChronologioPeriodSummaryDto> AggregatePeriodSummaries(
        IReadOnlyList<ChronologioEntryDto> entries,
        string axis)
    {
        var groups = entries.GroupBy(e => ChronologioReadModel.PeriodYearOf(e, axis));
        var result = new List<ChronologioPeriodSummaryDto>();

        foreach (var group in groups.OrderByDescending(g => g.Key))
        {
            var periodYear = group.Key;
            var (from, to) = ChronologioSeasonCalendar.BoundsForPeriod(periodYear, axis);
            var bucket = group.ToList();
            result.Add(BuildPeriodSummary(bucket, periodYear, axis, from, to));
        }

        return result;
    }

    private static IReadOnlyList<ChronologioMonthSummaryDto> AggregateMonthSummaries(
        IReadOnlyList<ChronologioEntryDto> entries,
        int periodYear,
        string axis)
    {
        var months = ChronologioSeasonCalendar.MonthsInPeriod(periodYear, axis);
        var byMonth = entries
            .GroupBy(e => (EnsureUtc(e.OccurredAt).Year, EnsureUtc(e.OccurredAt).Month))
            .ToDictionary(g => g.Key, g => g.ToList());

        var result = new List<ChronologioMonthSummaryDto>(months.Count);
        foreach (var (year, month) in months)
        {
            byMonth.TryGetValue((year, month), out var bucket);
            bucket ??= new List<ChronologioEntryDto>();
            var from = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
            var to = from.AddMonths(1).AddTicks(-1);
            var rollup = Rollup(bucket, preferYearWeather: false);
            result.Add(new ChronologioMonthSummaryDto
            {
                Key = $"{year:D4}-{month:D2}",
                Year = year,
                Month = month,
                From = from,
                To = to,
                TaskCount = rollup.TaskCount,
                ExpenseCount = rollup.ExpenseCount,
                HarvestCount = rollup.HarvestCount,
                NoteCount = rollup.NoteCount,
                ExpenseTotal = rollup.ExpenseTotal,
                Currency = rollup.Currency,
                OliveKg = rollup.OliveKg,
                OilKg = rollup.OilKg,
                OilYieldPercent = rollup.OilYieldPercent,
                HeroMediaUrl = rollup.HeroMediaUrl,
                HighlightTitles = rollup.HighlightTitles,
                DominantWorkLabel = rollup.DominantWorkLabel,
                ObservationHighlight = rollup.ObservationHighlight,
                RainfallMm = rollup.RainfallMm,
                TemperatureMax = rollup.TemperatureMax,
                TemperatureMin = rollup.TemperatureMin,
                HeatDays = rollup.HeatDays,
                FrostNights = rollup.FrostNights
            });
        }

        return result;
    }

    private static ChronologioPeriodSummaryDto BuildPeriodSummary(
        IReadOnlyList<ChronologioEntryDto> bucket,
        int periodYear,
        string axis,
        DateTime from,
        DateTime to)
    {
        var rollup = Rollup(bucket, preferYearWeather: true);
        return new ChronologioPeriodSummaryDto
        {
            Key = ChronologioAxis.IsSeason(axis)
                ? ChronologioSeasonCalendar.FormatSeasonKey(periodYear)
                : ChronologioSeasonCalendar.FormatCalendarKey(periodYear),
            PeriodYear = periodYear,
            Axis = axis,
            From = from,
            To = to,
            TaskCount = rollup.TaskCount,
            ExpenseCount = rollup.ExpenseCount,
            HarvestCount = rollup.HarvestCount,
            NoteCount = rollup.NoteCount,
            ExpenseTotal = rollup.ExpenseTotal,
            Currency = rollup.Currency,
            OliveKg = rollup.OliveKg,
            OilKg = rollup.OilKg,
            OilYieldPercent = rollup.OilYieldPercent,
            HeroMediaUrl = rollup.HeroMediaUrl,
            HighlightTitles = rollup.HighlightTitles,
            DominantWorkLabel = rollup.DominantWorkLabel,
            ObservationHighlight = rollup.ObservationHighlight,
            RainfallMm = rollup.RainfallMm,
            TemperatureMax = rollup.TemperatureMax,
            TemperatureMin = rollup.TemperatureMin,
            HeatDays = rollup.HeatDays,
            FrostNights = rollup.FrostNights
        };
    }

    private sealed class RollupStats
    {
        public int TaskCount;
        public int ExpenseCount;
        public int HarvestCount;
        public int NoteCount;
        public decimal ExpenseTotal;
        public string Currency = "EUR";
        public double OliveKg;
        public double OilKg;
        public double? OilYieldPercent;
        public string? HeroMediaUrl;
        public IReadOnlyList<string> HighlightTitles = Array.Empty<string>();
        public string? DominantWorkLabel;
        public string? ObservationHighlight;
        public double? RainfallMm;
        public double? TemperatureMax;
        public double? TemperatureMin;
        public int? HeatDays;
        public int? FrostNights;
    }

    private static RollupStats Rollup(IReadOnlyList<ChronologioEntryDto> bucket, bool preferYearWeather)
    {
        var stats = new RollupStats();
        var highlights = new List<string>();
        var taskTitles = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        string? observation = null;

        var weatherEntries = bucket
            .Where(e => string.Equals(e.Category, ChronologioCategory.Weather.ToApiString(), StringComparison.OrdinalIgnoreCase))
            .ToList();
        var preferredWeather = (preferYearWeather
                ? weatherEntries.Where(e =>
                    string.Equals(e.EventType, ChronologioEventTypes.WeatherYearReview, StringComparison.OrdinalIgnoreCase))
                : weatherEntries.Where(e =>
                    string.Equals(e.EventType, ChronologioEventTypes.WeatherMonthReview, StringComparison.OrdinalIgnoreCase)))
            .ToList();
        if (preferYearWeather && preferredWeather.Count == 0)
        {
            preferredWeather = weatherEntries
                .Where(e =>
                    string.Equals(e.EventType, ChronologioEventTypes.WeatherMonthReview, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        var rainfallSamples = new List<double>();
        var maxTemps = new List<double>();
        var minTemps = new List<double>();
        var heatDays = 0;
        var frostNights = 0;

        foreach (var e in preferredWeather)
        {
            var w = e.Details.Weather;
            if (w == null) continue;
            if (w.RainfallMm is { } rain) rainfallSamples.Add(rain);
            if (w.TemperatureMax is { } tMax) maxTemps.Add(tMax);
            if (w.TemperatureMin is { } tMin) minTemps.Add(tMin);
            heatDays = Math.Max(heatDays, w.HeatDays ?? 0);
            frostNights = Math.Max(frostNights, w.FrostNights ?? 0);
        }

        foreach (var e in bucket.OrderByDescending(x => x.OccurredAt))
        {
            var category = e.Category;
            if (string.Equals(category, ChronologioCategory.Weather.ToApiString(), StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (string.Equals(category, ChronologioCategory.Task.ToApiString(), StringComparison.OrdinalIgnoreCase))
            {
                stats.TaskCount++;
                if (e.Amount != null)
                {
                    stats.ExpenseTotal += e.Amount.Value;
                    stats.Currency = e.Amount.Currency;
                }

                if (!string.IsNullOrWhiteSpace(e.Title))
                {
                    taskTitles[e.Title] = taskTitles.TryGetValue(e.Title, out var c) ? c + 1 : 1;
                }

                if (highlights.Count < MaxHighlights
                    && !string.IsNullOrWhiteSpace(e.Title)
                    && !highlights.Contains(e.Title, StringComparer.Ordinal))
                {
                    highlights.Add(e.Title);
                }
            }
            else if (string.Equals(category, ChronologioCategory.Expense.ToApiString(), StringComparison.OrdinalIgnoreCase))
            {
                stats.ExpenseCount++;
                if (e.Amount != null)
                {
                    stats.ExpenseTotal += e.Amount.Value;
                    stats.Currency = e.Amount.Currency;
                }
            }
            else if (string.Equals(category, ChronologioCategory.Harvest.ToApiString(), StringComparison.OrdinalIgnoreCase))
            {
                stats.HarvestCount++;
                if (e.Details.Harvest != null)
                {
                    stats.OliveKg += e.Details.Harvest.OliveKg;
                    if (e.Details.Harvest.OilKg is > 0)
                    {
                        stats.OilKg += e.Details.Harvest.OilKg.Value;
                    }
                }

                if (highlights.Count < MaxHighlights
                    && !string.IsNullOrWhiteSpace(e.Title)
                    && !highlights.Contains(e.Title, StringComparer.Ordinal))
                {
                    highlights.Insert(0, e.Title);
                    if (highlights.Count > MaxHighlights)
                    {
                        highlights.RemoveAt(highlights.Count - 1);
                    }
                }
            }
            else if (string.Equals(category, ChronologioCategory.Note.ToApiString(), StringComparison.OrdinalIgnoreCase))
            {
                stats.NoteCount++;
                if (observation == null)
                {
                    var highlight = e.Details.Note?.BodyPreview ?? e.Summary;
                    if (!string.IsNullOrWhiteSpace(highlight))
                    {
                        observation = highlight;
                    }
                }

                var noteHighlight = e.Details.Note?.BodyPreview ?? e.Summary ?? e.Title;
                if (highlights.Count < MaxHighlights
                    && !string.IsNullOrWhiteSpace(noteHighlight)
                    && !highlights.Contains(noteHighlight, StringComparer.Ordinal))
                {
                    highlights.Add(noteHighlight);
                }
            }

            if (stats.HeroMediaUrl == null)
            {
                var media = e.Media.FirstOrDefault(m =>
                    !string.IsNullOrWhiteSpace(m.Url) || !string.IsNullOrWhiteSpace(m.ThumbnailUrl));
                if (media != null)
                {
                    stats.HeroMediaUrl = media.ThumbnailUrl ?? media.Url;
                }
            }
        }

        if (stats.OliveKg > 0 && stats.OilKg > 0)
        {
            stats.OilYieldPercent = Math.Round(stats.OilKg / stats.OliveKg * 100.0, 1);
        }

        stats.HighlightTitles = highlights.Take(2).ToList();
        stats.DominantWorkLabel = taskTitles
            .OrderByDescending(kv => kv.Value)
            .Select(kv => kv.Key)
            .FirstOrDefault();
        stats.ObservationHighlight = observation;

        if (rainfallSamples.Count > 0)
        {
            stats.RainfallMm = Math.Round(rainfallSamples.Average(), 1);
        }

        if (maxTemps.Count > 0)
        {
            stats.TemperatureMax = Math.Round(maxTemps.Max(), 1);
        }

        if (minTemps.Count > 0)
        {
            stats.TemperatureMin = Math.Round(minTemps.Min(), 1);
        }

        if (heatDays > 0)
        {
            stats.HeatDays = heatDays;
        }

        if (frostNights > 0)
        {
            stats.FrostNights = frostNights;
        }

        return stats;
    }

    private async Task<IReadOnlyList<ChronologioEntryDto>> BuildTimelineAsync(
        IReadOnlyList<string> fieldIds,
        IReadOnlyDictionary<string, FieldLabel> fieldLabels,
        string userId,
        ChronologioQuery query,
        CancellationToken cancellationToken,
        bool pageResults = true)
    {
        var limit = pageResults ? NormalizeLimit(query.Limit) : Math.Min(Math.Max(query.Limit, 1), SummaryMaxEntries);
        var offset = pageResults ? Math.Max(0, query.Offset) : 0;

        // CropCycleId is reserved; no associations exist yet.
        if (!string.IsNullOrWhiteSpace(query.CropCycleId))
        {
            return Array.Empty<ChronologioEntryDto>();
        }

        var categoryFilter = ChronologioCategoryExtensions.FromApiString(query.Category);
        // Days journal includes month-end weather reports. Year rollups stay out unless
        // the caller asked for weather (peek / year tiles) or a non-paged summary.
        var includeYearWeatherReviews = !pageResults
            || categoryFilter == ChronologioCategory.Weather;

        IReadOnlyList<TaskExecution> executions;
        IReadOnlyList<FinancialTransaction> money;
        IReadOnlyList<HarvestRecord> harvests;
        IReadOnlyList<Activity> activities;
        IReadOnlyList<Note> notes;
        IReadOnlyList<FieldWeatherPeriodReview> weatherReviews;

        if (fieldIds.Count == 1)
        {
            var fieldId = fieldIds[0];
            executions = (await _taskExecutionRepository.GetByFieldIdAsync(fieldId, cancellationToken))
                .Where(e => e.IsActive)
                .ToList();
            harvests = (await _harvestRecordRepository.GetByFieldIdAsync(fieldId, cancellationToken)).ToList();
            activities = (await _activityRepository.GetByFieldIdAsync(fieldId, ActivityFetchLimit, cancellationToken)).ToList();
            notes = (await _noteRepository.GetByOwnerUserIdAsync(userId, fieldId, limit: 200, cancellationToken)).ToList();
            weatherReviews = await _weatherReviewRepository.GetByFieldIdsAsync(
                fieldIds, query.From, query.To, cancellationToken);
        }
        else
        {
            executions = (await _taskExecutionRepository.GetByFieldIdsAsync(fieldIds, cancellationToken))
                .Where(e => e.IsActive)
                .ToList();
            harvests = (await _harvestRecordRepository.GetByFieldIdsAsync(fieldIds, cancellationToken)).ToList();
            activities = (await _activityRepository.GetByFieldIdsAsync(
                fieldIds,
                query.From,
                query.To,
                ActivityFetchLimit,
                cancellationToken)).ToList();
            notes = (await _noteRepository.GetByOwnerUserIdAsync(userId, fieldId: null, limit: 200, cancellationToken))
                .Where(n => n.FieldId != null && fieldIds.Contains(n.FieldId, StringComparer.Ordinal))
                .ToList();
            weatherReviews = await _weatherReviewRepository.GetByFieldIdsAsync(
                fieldIds, query.From, query.To, cancellationToken);
        }

        money = await _financialTransactions.GetPostedByFieldIdsAsync(fieldIds, cancellationToken);
        harvests = harvests.Where(h => h.Status == FinancialEntryStatus.Posted).ToList();
        notes = notes.Where(n => !string.IsNullOrWhiteSpace(n.FieldId)).ToList();
        activities = activities.Where(a => IncludedActivityTypes.Contains(a.Type)).ToList();

        var fieldTasksById = new Dictionary<string, FieldTask>(StringComparer.Ordinal);
        var relatedTaskIds = executions.Select(e => e.TaskId)
            .Concat(money
                .Where(t => !string.IsNullOrWhiteSpace(t.RelatedTaskId))
                .Select(t => t.RelatedTaskId!))
            .Distinct(StringComparer.Ordinal);
        foreach (var taskId in relatedTaskIds)
        {
            var task = await _fieldTaskRepository.GetByIdAsync(taskId, cancellationToken);
            if (task != null)
            {
                fieldTasksById[task.Id] = task;
            }
        }

        var harvestsById = harvests.ToDictionary(h => h.Id, StringComparer.Ordinal);

        var nameIds = CollectUserIds(executions, fieldTasksById.Values, money, activities, notes);
        nameIds.Add(userId);
        var displayNames = await ResolveDisplayNamesAsync(nameIds, cancellationToken);

        var noteMedia = (await _mediaAttachmentRepository.GetByOwnersAsync(
                MediaOwnerType.Note, notes.Select(n => n.Id), cancellationToken))
            .GroupBy(m => m.OwnerId)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.Ordinal);
        var taskMedia = (await _mediaAttachmentRepository.GetByOwnersAsync(
                MediaOwnerType.Task, executions.Select(e => e.TaskId), cancellationToken))
            .GroupBy(m => m.OwnerId)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.Ordinal);
        var harvestMedia = (await _mediaAttachmentRepository.GetByOwnersAsync(
                MediaOwnerType.Harvest, harvests.Select(h => h.Id), cancellationToken))
            .GroupBy(m => m.OwnerId)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.Ordinal);

        var entries = new List<ChronologioEntryDto>();

        foreach (var execution in executions)
        {
            fieldTasksById.TryGetValue(execution.TaskId, out var fieldTask);
            entries.Add(MapTaskExecution(
                execution,
                fieldTask,
                fieldLabels,
                displayNames,
                taskMedia.GetValueOrDefault(execution.TaskId)));
        }

        foreach (var transaction in money)
        {
            fieldTasksById.TryGetValue(transaction.RelatedTaskId ?? string.Empty, out var relatedTask);
            harvestsById.TryGetValue(transaction.RelatedHarvestId ?? string.Empty, out var relatedHarvest);
            entries.Add(MapFinancialTransaction(
                transaction,
                fieldLabels,
                displayNames,
                relatedTask,
                relatedHarvest));
        }

        foreach (var harvest in harvests)
        {
            entries.Add(MapHarvest(harvest, fieldLabels, harvestMedia.GetValueOrDefault(harvest.Id)));
        }

        foreach (var note in notes)
        {
            entries.Add(MapNote(note, fieldLabels, displayNames, noteMedia.GetValueOrDefault(note.Id)));
        }

        foreach (var activity in activities)
        {
            entries.Add(MapActivity(activity, fieldLabels, displayNames));
        }

        foreach (var review in weatherReviews)
        {
            var isYearReview = string.Equals(
                review.PeriodType,
                WeatherPeriodTypes.Year,
                StringComparison.OrdinalIgnoreCase);
            if (isYearReview && !includeYearWeatherReviews)
            {
                continue;
            }

            // Incomplete months are dated on the last calendar day — keep them off Days until that day.
            if (pageResults && categoryFilter != ChronologioCategory.Weather
                && review.OccurredAt > DateTime.UtcNow)
            {
                continue;
            }

            entries.Add(MapWeatherReview(review, fieldLabels));
        }

        IEnumerable<ChronologioEntryDto> filtered = ChronologioReadModel.Canonicalize(entries, categoryFilter);

        if (query.From.HasValue)
        {
            var from = EnsureUtc(query.From.Value);
            filtered = filtered.Where(e => e.OccurredAt >= from);
        }

        if (query.To.HasValue)
        {
            var to = EnsureUtc(query.To.Value);
            filtered = filtered.Where(e => e.OccurredAt <= to);
        }

        if (!string.IsNullOrWhiteSpace(query.LifecycleYear))
        {
            filtered = filtered.Where(e => ChronologioReadModel.MatchesResultYear(e, query.LifecycleYear));
        }

        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            filtered = filtered.Where(e => ChronologioReadModel.MatchesCategory(e, query.Category));
        }

        var result = filtered
            .OrderByDescending(e => e.OccurredAt)
            .ThenByDescending(e => e.CreatedAt ?? DateTime.MinValue)
            .Skip(offset)
            .Take(limit)
            .ToList();

        _logger.LogDebug(
            "Chronologio built {Count} entries for {FieldCount} fields (offset {Offset}, limit {Limit})",
            result.Count,
            fieldIds.Count,
            offset,
            limit);

        return result;
    }

    private static ChronologioEntryDto MapTaskExecution(
        TaskExecution execution,
        FieldTask? task,
        IReadOnlyDictionary<string, FieldLabel> fieldLabels,
        IReadOnlyDictionary<string, string> displayNames,
        IReadOnlyList<MediaAttachment>? attachments = null)
    {
        var occurredAt = execution.CompletedAt;
        var actorUserId = execution.RecordedByUserId;
        if (string.IsNullOrWhiteSpace(actorUserId))
        {
            actorUserId = execution.CompletedByUserIds.FirstOrDefault()
                ?? task?.AssignedUserId
                ?? task?.ResponsibleUserId;
        }

        var assigneeName = ResolveName(task?.AssignedUserId, displayNames);
        var (eventType, summary) = MapOutcome(execution.Outcome);
        var title = ResolveTaskTitle(task);

        var media = new List<ChronologioMediaDto>();
        if (attachments is { Count: > 0 })
        {
            media.AddRange(attachments.Select(a => new ChronologioMediaDto
            {
                Id = a.Id,
                Type = "image",
                ThumbnailUrl = a.ThumbnailUrl ?? a.Url,
                Url = a.Url
            }));
        }

        return new ChronologioEntryDto
        {
            Id = $"{ChronologioSourceTypes.TaskExecution}:{execution.Id}",
            FieldId = execution.FieldId,
            Field = FieldRef(execution.FieldId, fieldLabels),
            CropCycleId = null,
            LifecycleYear = YearLabel(execution.ResultYear, occurredAt),
            ResultYear = ResolveResultYear(execution.ResultYear, occurredAt),
            OccurredAt = EnsureUtc(occurredAt),
            CreatedAt = EnsureUtc(execution.CreatedAt),
            Category = ChronologioCategory.Task.ToApiString(),
            EventType = eventType,
            Title = title,
            Summary = string.IsNullOrWhiteSpace(execution.Notes) ? summary : execution.Notes,
            SourceType = ChronologioSourceTypes.TaskExecution,
            SourceId = execution.Id,
            OccurrenceId = execution.Id,
            IsSystemGenerated = false,
            Actor = BuildActor(actorUserId, displayNames),
            Importance = ChronologioImportance.Normal.ToApiString(),
            Amount = null,
            Media = media,
            Details = new ChronologioDetailsDto
            {
                Task = new ChronologioTaskDetailsDto
                {
                    TaskId = execution.TaskId,
                    ExecutionId = execution.Id,
                    TaskType = task?.TemplateCode,
                    Status = task?.Status.ToApiString() ?? FieldTaskStatus.Completed.ToApiString(),
                    Outcome = execution.Outcome.ToApiString(),
                    StartDate = execution.StartedAt ?? execution.PlannedStartSnapshot ?? task?.PlannedStart,
                    EndDate = execution.CompletedAt,
                    AssigneeName = assigneeName,
                    FollowUpTaskId = execution.FollowUpTaskId
                }
            }
        };
    }

    private static string ResolveTaskTitle(FieldTask? task)
    {
        if (!string.IsNullOrWhiteSpace(task?.Title) && !ChronologioDisplayLabels.LooksLikeCode(task.Title))
        {
            return task.Title;
        }

        return ChronologioDisplayLabels.TaskFallbackTitle();
    }

    private static (string EventType, string Summary) MapOutcome(TaskExecutionOutcome outcome) => outcome switch
    {
        TaskExecutionOutcome.PartiallyCompleted =>
            (ChronologioEventTypes.TaskPartiallyCompleted, ChronologioDisplayLabels.OutcomeSummary(outcome)),
        TaskExecutionOutcome.NotDone =>
            (ChronologioEventTypes.TaskNotDone, ChronologioDisplayLabels.OutcomeSummary(outcome)),
        _ => (ChronologioEventTypes.TaskCompleted, ChronologioDisplayLabels.OutcomeSummary(outcome))
    };

    private static ChronologioEntryDto MapFinancialTransaction(
        FinancialTransaction transaction,
        IReadOnlyDictionary<string, FieldLabel> fieldLabels,
        IReadOnlyDictionary<string, string> displayNames,
        FieldTask? relatedTask,
        HarvestRecord? relatedHarvest)
    {
        var isIncome = transaction.Type == FinancialTransactionType.Income;
        var currency = string.IsNullOrWhiteSpace(transaction.Currency) ? "EUR" : transaction.Currency;
        var typeWord = FinancialDisplayLabels.Type(transaction.Type);
        var categoryLabel = transaction.Category.HasValue
            ? FinancialDisplayLabels.Category(transaction.Category.Value)
            : null;
        var fieldName = fieldLabels.TryGetValue(transaction.FieldId ?? string.Empty, out var field)
            ? field.Name
            : null;
        var summary = !string.IsNullOrWhiteSpace(transaction.Description)
            ? transaction.Description
            : string.Join(" · ", new[] { categoryLabel, fieldName }.Where(s => !string.IsNullOrWhiteSpace(s)));
        var harvestTitle = relatedHarvest == null
            ? null
            : $"{ChronologioDisplayLabels.HarvestTitle()} {ResolveResultYear(relatedHarvest.ResultYear, relatedHarvest.HarvestDate)}";

        return new ChronologioEntryDto
        {
            Id = $"{(isIncome ? ChronologioSourceTypes.Income : ChronologioSourceTypes.Expense)}:{transaction.Id}",
            FieldId = transaction.FieldId ?? string.Empty,
            Field = FieldRef(transaction.FieldId ?? string.Empty, fieldLabels),
            CropCycleId = null,
            LifecycleYear = YearLabel(transaction.ResultYear, transaction.OccurredOn),
            ResultYear = ResolveResultYear(transaction.ResultYear, transaction.OccurredOn),
            OccurredAt = EnsureUtc(transaction.OccurredOn),
            CreatedAt = EnsureUtc(transaction.CreatedAt),
            Category = (isIncome ? ChronologioCategory.Income : ChronologioCategory.Expense).ToApiString(),
            EventType = isIncome ? ChronologioEventTypes.IncomeRecorded : ChronologioEventTypes.ExpenseRecorded,
            Title = $"{typeWord} {FormatMoney(transaction.Amount, currency)}",
            Summary = string.IsNullOrWhiteSpace(summary) ? typeWord : summary,
            SourceType = isIncome ? ChronologioSourceTypes.Income : ChronologioSourceTypes.Expense,
            SourceId = transaction.Id,
            OccurrenceId = null,
            IsSystemGenerated = false,
            Actor = BuildActor(transaction.CreatedByUserId, displayNames),
            Importance = isIncome
                ? ChronologioImportance.Positive.ToApiString()
                : ChronologioImportance.Normal.ToApiString(),
            Amount = new ChronologioAmountDto { Value = transaction.Amount, Currency = currency },
            Details = new ChronologioDetailsDto
            {
                Expense = new ChronologioExpenseDetailsDto
                {
                    ExpenseId = transaction.Id,
                    ExpenseCategory = transaction.Category?.ToApiString(),
                    ExpenseCategoryLabel = categoryLabel,
                    LinkedTaskId = transaction.RelatedTaskId,
                    LinkedHarvestId = transaction.RelatedHarvestId,
                    RelatedTaskTitle = relatedTask?.Title,
                    RelatedHarvestTitle = harvestTitle,
                    TransactionType = isIncome ? "income" : "expense",
                    Description = transaction.Description
                }
            }
        };
    }

    private static ChronologioEntryDto MapHarvest(
        HarvestRecord harvest,
        IReadOnlyDictionary<string, FieldLabel> fieldLabels,
        IReadOnlyList<MediaAttachment>? attachments = null)
    {
        var resultYear = ResolveResultYear(harvest.ResultYear, harvest.HarvestDate);
        var summary = ChronologioDisplayLabels.HarvestSummary(
            harvest.OliveKg,
            harvest.OilKg,
            harvest.OilLitres,
            harvest.OilYieldPercent);

        var media = (attachments ?? Array.Empty<MediaAttachment>())
            .Select(a => new ChronologioMediaDto
            {
                Id = a.Id,
                Type = "image",
                ThumbnailUrl = a.ThumbnailUrl ?? a.Url,
                Url = a.Url
            })
            .ToList();

        return new ChronologioEntryDto
        {
            Id = $"{ChronologioSourceTypes.Harvest}:{harvest.Id}",
            FieldId = harvest.FieldId,
            Field = FieldRef(harvest.FieldId, fieldLabels),
            CropCycleId = null,
            LifecycleYear = resultYear.ToString(CultureInfo.InvariantCulture),
            ResultYear = resultYear,
            OccurredAt = EnsureUtc(harvest.HarvestDate),
            CreatedAt = EnsureUtc(harvest.CreatedAt),
            Category = ChronologioCategory.Harvest.ToApiString(),
            EventType = ChronologioEventTypes.HarvestRecorded,
            Title = ChronologioDisplayLabels.HarvestTitle(),
            Summary = summary,
            SourceType = ChronologioSourceTypes.Harvest,
            SourceId = harvest.Id,
            IsSystemGenerated = false,
            Actor = null,
            Importance = ChronologioImportance.Positive.ToApiString(),
            Media = media,
            Details = new ChronologioDetailsDto
            {
                Harvest = new ChronologioHarvestDetailsDto
                {
                    HarvestId = harvest.Id,
                    OliveKg = harvest.OliveKg,
                    OilKg = harvest.OilKg,
                    OilLitres = harvest.OilLitres,
                    OilYieldPercent = harvest.OilYieldPercent,
                    Mill = harvest.MillName,
                    Quality = string.IsNullOrWhiteSpace(harvest.QualityGrade)
                        ? null
                        : (ChronologioDisplayLabels.HarvestQuality(harvest.QualityGrade) is { Length: > 0 } quality
                            ? quality
                            : harvest.QualityGrade),
                    Workers = harvest.WorkersUsed,
                    HarvestMethod = string.IsNullOrWhiteSpace(harvest.HarvestMethod) ? null : harvest.HarvestMethod
                }
            }
        };
    }

    private static ChronologioEntryDto MapNote(
        Note note,
        IReadOnlyDictionary<string, FieldLabel> fieldLabels,
        IReadOnlyDictionary<string, string> displayNames,
        IReadOnlyList<MediaAttachment>? attachments = null)
    {
        var fieldId = note.FieldId!;
        var preview = Truncate(note.Body, NotePreviewLength);
        var occurredAt = note.OccurredAt == default ? note.CreatedAt : note.OccurredAt;
        var media = (attachments ?? Array.Empty<MediaAttachment>())
            .Select(a => new ChronologioMediaDto
            {
                Id = a.Id,
                Type = "image",
                ThumbnailUrl = a.ThumbnailUrl ?? a.Url,
                Url = a.Url
            })
            .ToList();

        return new ChronologioEntryDto
        {
            Id = $"{ChronologioSourceTypes.Note}:{note.Id}",
            FieldId = fieldId,
            Field = FieldRef(fieldId, fieldLabels),
            CropCycleId = null,
            LifecycleYear = YearLabel(null, occurredAt),
            ResultYear = ResolveResultYear(null, occurredAt),
            OccurredAt = EnsureUtc(occurredAt),
            CreatedAt = EnsureUtc(note.CreatedAt),
            Category = ChronologioCategory.Note.ToApiString(),
            EventType = ChronologioEventTypes.NoteCreated,
            Title = ChronologioDisplayLabels.NoteTitle(),
            Summary = string.IsNullOrWhiteSpace(preview) && media.Count > 0 ? null : preview,
            SourceType = ChronologioSourceTypes.Note,
            SourceId = note.Id,
            IsSystemGenerated = false,
            Actor = BuildActor(note.OwnerUserId, displayNames),
            Importance = ChronologioImportance.Normal.ToApiString(),
            Media = media,
            Details = new ChronologioDetailsDto
            {
                Note = new ChronologioNoteDetailsDto
                {
                    NoteId = note.Id,
                    BodyPreview = preview,
                    Pinned = note.Pinned
                }
            }
        };
    }

    private static ChronologioEntryDto MapActivity(
        Activity activity,
        IReadOnlyDictionary<string, FieldLabel> fieldLabels,
        IReadOnlyDictionary<string, string> displayNames)
    {
        var type = activity.Type ?? string.Empty;
        var meta = activity.Metadata ?? new Dictionary<string, string>();

        string category;
        string eventType;
        string title;
        ChronologioDetailsDto details;

        if (type.StartsWith("lifecycle_", StringComparison.OrdinalIgnoreCase))
        {
            category = ChronologioCategory.Lifecycle.ToApiString();
            eventType = type switch
            {
                "lifecycle_year_changed" => ChronologioEventTypes.LifecycleCycleStarted,
                "lifecycle_stage_changed" => ChronologioEventTypes.LifecycleStageChanged,
                "lifecycle_corrected" => ChronologioEventTypes.LifecycleCorrected,
                _ => ChronologioEventTypes.ActivityGeneric
            };
            title = ChronologioDisplayLabels.ActivityTitle(type);
            details = new ChronologioDetailsDto
            {
                Lifecycle = new ChronologioLifecycleDetailsDto
                {
                    PreviousYear = GetMeta(meta, "previousYear"),
                    NewYear = GetMeta(meta, "newYear"),
                    PreviousStage = LocalizedStage(GetMeta(meta, "previousStage")),
                    NewStage = LocalizedStage(GetMeta(meta, "newStage")),
                    Message = activity.Message
                }
            };
        }
        else if (type is "producer_assigned" or "producer_unassigned" or "partner_contact_accepted")
        {
            category = ChronologioCategory.Collaborator.ToApiString();
            eventType = type switch
            {
                "producer_assigned" => ChronologioEventTypes.CollaboratorProducerAssigned,
                "producer_unassigned" => ChronologioEventTypes.CollaboratorProducerUnassigned,
                "partner_contact_accepted" => ChronologioEventTypes.CollaboratorPartnerAccepted,
                _ => ChronologioEventTypes.ActivityGeneric
            };
            title = ChronologioDisplayLabels.ActivityTitle(type);
            details = new ChronologioDetailsDto
            {
                Collaborator = new ChronologioCollaboratorDetailsDto
                {
                    ProducerId = GetMeta(meta, "producerId"),
                    RequestId = GetMeta(meta, "requestId"),
                    Message = activity.Message
                }
            };
        }
        else
        {
            category = ChronologioCategory.Activity.ToApiString();
            eventType = ChronologioEventTypes.ActivityGeneric;
            title = ChronologioDisplayLabels.ActivityTitle(type);
            details = new ChronologioDetailsDto
            {
                Activity = new ChronologioActivityDetailsDto
                {
                    ActivityType = type,
                    Message = activity.Message,
                    Metadata = meta
                }
            };
        }

        return new ChronologioEntryDto
        {
            Id = $"{ChronologioSourceTypes.Activity}:{activity.Id}",
            FieldId = activity.FieldId,
            Field = FieldRef(activity.FieldId, fieldLabels),
            CropCycleId = null,
            LifecycleYear = YearLabel(null, activity.Timestamp),
            ResultYear = ResolveResultYear(null, activity.Timestamp),
            OccurredAt = EnsureUtc(activity.Timestamp),
            CreatedAt = EnsureUtc(activity.CreatedAt),
            Category = category,
            EventType = eventType,
            Title = title,
            Summary = activity.Message,
            SourceType = ChronologioSourceTypes.Activity,
            SourceId = activity.Id,
            IsSystemGenerated = true,
            Actor = BuildActor(activity.ActorUserId, displayNames),
            Importance = ChronologioImportance.Normal.ToApiString(),
            Details = details
        };
    }

    private ChronologioEntryDto MapWeatherReview(
        FieldWeatherPeriodReview review,
        IReadOnlyDictionary<string, FieldLabel> fieldLabels)
    {
        var isMonth = string.Equals(review.PeriodType, WeatherPeriodTypes.Month, StringComparison.OrdinalIgnoreCase);
        var eventType = isMonth
            ? ChronologioEventTypes.WeatherMonthReview
            : ChronologioEventTypes.WeatherYearReview;

        string title;
        if (isMonth && review.Month is { } month)
        {
            title = ChronologioDisplayLabels.WeatherMonthTitle(review.Year, month);
        }
        else
        {
            title = ChronologioDisplayLabels.WeatherYearTitle(review.Year);
        }

        var summary = ChronologioDisplayLabels.WeatherReviewSummary(
            review.DaysWithRainData > 0 || review.RainTotalMm > 0 ? review.RainTotalMm : null,
            review.MinTemperatureC,
            review.MaxTemperatureC,
            review.FrostNights > 0 ? review.FrostNights : null,
            isMonth);

        var vegetationNote = ChronologioDisplayLabels.VegetationNote(
            review.NdviDeltaPercent ?? 0,
            isMonth);
        var sourceParts = new List<string>();
        if (!string.IsNullOrWhiteSpace(review.WeatherProvider))
        {
            sourceParts.Add(review.WeatherProvider);
        }

        if (!string.IsNullOrWhiteSpace(review.SatelliteSource))
        {
            sourceParts.Add(review.SatelliteSource);
        }

        return new ChronologioEntryDto
        {
            Id = $"{ChronologioSourceTypes.WeatherReview}:{review.Id}",
            FieldId = review.FieldId,
            Field = FieldRef(review.FieldId, fieldLabels),
            CropCycleId = null,
            LifecycleYear = YearLabel(null, review.OccurredAt),
            ResultYear = ResolveResultYear(null, review.OccurredAt),
            OccurredAt = EnsureUtc(review.OccurredAt),
            CreatedAt = EnsureUtc(review.UpdatedAt),
            Category = ChronologioCategory.Weather.ToApiString(),
            EventType = eventType,
            Title = title,
            Summary = summary,
            SourceType = ChronologioSourceTypes.WeatherReview,
            SourceId = review.Id,
            IsSystemGenerated = true,
            Actor = null,
            Importance = ChronologioImportance.Normal.ToApiString(),
            Details = new ChronologioDetailsDto
            {
                Weather = new ChronologioWeatherDetailsDto
                {
                    Period = review.PeriodType,
                    Year = review.Year,
                    Month = review.Month,
                    RainfallMm = review.RainTotalMm,
                    TemperatureMin = review.MinTemperatureC,
                    TemperatureMax = review.MaxTemperatureC,
                    TemperatureAvg = review.AverageTemperatureC,
                    FrostNights = review.FrostNights,
                    HeatDays = review.HeatDays,
                    HeavyRainDays = review.HeavyRainDays,
                    LongestDryStreakDays = review.LongestDryStreakDays,
                    RainyDays = review.RainyDays,
                    DryDays = review.DryDays,
                    Et0TotalMm = review.Et0TotalMm,
                    WaterBalanceMm = review.WaterBalanceMm,
                    AverageHumidityPercent = review.AverageHumidityPercent,
                    MaxWindGustKmh = review.MaxWindGustKmh,
                    RainVsPreviousPercent = review.RainVsPreviousPercent,
                    WettestMonth = review.WettestMonth,
                    NdviMean = review.NdviMean,
                    NdviDeltaPercent = review.NdviDeltaPercent,
                    NdviStartEndDeltaPercent = review.NdviStartEndDeltaPercent,
                    NdmiMean = review.NdmiMean,
                    NdreMean = review.NdreMean,
                    NdwiMean = review.NdwiMean,
                    SaviMean = review.SaviMean,
                    OpeningScene = MapWeatherScene(review.OpeningScene),
                    ClosingScene = MapWeatherScene(review.ClosingScene),
                    Insights = review.Insights
                        .Select(i => new ChronologioWeatherInsightDto { Kind = i.Kind, Severity = i.Severity })
                        .ToList(),
                    RainSeries = review.RainSeries,
                    RainLabels = review.RainLabels,
                    TemperatureMinSeries = review.TemperatureMinSeries,
                    TemperatureMaxSeries = review.TemperatureMaxSeries,
                    Source = sourceParts.Count > 0 ? string.Join(" / ", sourceParts) : null,
                    VegetationNote = string.IsNullOrWhiteSpace(vegetationNote) ? null : vegetationNote,
                    DaysWithData = review.DayCount,
                    ExpectedDays = review.ExpectedDays > 0 ? review.ExpectedDays : null,
                    DaysWithRainData = review.DaysWithRainData,
                    IncludesForecast = review.IncludesForecast,
                    CoverageSufficient = review.ExpectedDays <= 0
                        || review.DayCount >= review.ExpectedDays
                        || review.DayCount >= (isMonth ? 20 : 200)
                }
            }
        };
    }

    private ChronologioWeatherSceneDto? MapWeatherScene(WeatherReviewSatelliteScene? scene)
    {
        if (scene == null) return null;
        return new ChronologioWeatherSceneDto
        {
            ObservationId = scene.ObservationId,
            ObservationDate = EnsureUtc(scene.ObservationDate),
            Role = scene.Role,
            TrueColorUrl = _geospatialStorage.GetPublicUrl(scene.TrueColorPath),
            NdviUrl = _geospatialStorage.GetPublicUrl(scene.NdviPath),
            NdviMean = scene.NdviMean,
            NdmiMean = scene.NdmiMean,
            CloudCoverPercent = scene.CloudCoverPercent
        };
    }

    private static bool IsPublishedField(string? status) =>
        !string.Equals(status, nameof(FieldStatus.Draft), StringComparison.OrdinalIgnoreCase)
        && !string.Equals(status, nameof(FieldStatus.Archived), StringComparison.OrdinalIgnoreCase);

    private static int ResolveResultYear(int? stored, DateTime occurredAt) =>
        stored is > 0 ? stored.Value : AgriculturalYear.For(occurredAt);

    private static string YearLabel(int? stored, DateTime occurredAt) =>
        ResolveResultYear(stored, occurredAt).ToString(CultureInfo.InvariantCulture);

    private static HashSet<string> CollectUserIds(
        IEnumerable<TaskExecution> executions,
        IEnumerable<FieldTask> fieldTasks,
        IEnumerable<FinancialTransaction> money,
        IEnumerable<Activity> activities,
        IEnumerable<Note> notes)
    {
        var ids = new HashSet<string>(StringComparer.Ordinal);
        foreach (var execution in executions)
        {
            if (!string.IsNullOrWhiteSpace(execution.RecordedByUserId))
            {
                ids.Add(execution.RecordedByUserId);
            }

            foreach (var userId in execution.CompletedByUserIds.Where(id => !string.IsNullOrWhiteSpace(id)))
            {
                ids.Add(userId);
            }
        }

        foreach (var task in fieldTasks)
        {
            if (!string.IsNullOrWhiteSpace(task.AssignedUserId))
            {
                ids.Add(task.AssignedUserId);
            }

            if (!string.IsNullOrWhiteSpace(task.ResponsibleUserId))
            {
                ids.Add(task.ResponsibleUserId);
            }
        }

        foreach (var transaction in money)
        {
            if (!string.IsNullOrWhiteSpace(transaction.CreatedByUserId))
            {
                ids.Add(transaction.CreatedByUserId);
            }
        }

        foreach (var activity in activities)
        {
            if (!string.IsNullOrWhiteSpace(activity.ActorUserId))
            {
                ids.Add(activity.ActorUserId!);
            }
        }

        foreach (var note in notes)
        {
            if (!string.IsNullOrWhiteSpace(note.OwnerUserId))
            {
                ids.Add(note.OwnerUserId);
            }
        }

        return ids;
    }

    private async Task<IReadOnlyDictionary<string, string>> ResolveDisplayNamesAsync(
        IEnumerable<string> userIds,
        CancellationToken cancellationToken)
    {
        var users = await _userRepository.GetByIdsAsync(userIds, cancellationToken);
        return users.ToDictionary(u => u.Id, DisplayName, StringComparer.Ordinal);
    }

    private static string DisplayName(User user)
    {
        var name = $"{user.FirstName} {user.LastName}".Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return user.Email;
        }

        return ChronologioDisplayLabels.ActorName(name);
    }

    private static string? LocalizedStage(string? stage)
    {
        if (string.IsNullOrWhiteSpace(stage))
        {
            return null;
        }

        var label = ChronologioDisplayLabels.LifecycleStage(stage);
        return string.IsNullOrWhiteSpace(label) ? null : label;
    }

    private static ChronologioActorDto? BuildActor(
        string? userId,
        IReadOnlyDictionary<string, string> displayNames)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return null;
        }

        return new ChronologioActorDto
        {
            UserId = userId,
            DisplayName = ResolveName(userId, displayNames) ?? userId
        };
    }

    private static string? ResolveName(string? userId, IReadOnlyDictionary<string, string> displayNames)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return null;
        }

        return displayNames.TryGetValue(userId, out var name) ? name : null;
    }

    private readonly record struct FieldLabel(string Name, string? Color);

    private static ChronologioFieldRefDto FieldRef(string fieldId, IReadOnlyDictionary<string, FieldLabel> fieldLabels)
    {
        if (fieldLabels.TryGetValue(fieldId, out var label))
        {
            return new ChronologioFieldRefDto
            {
                Id = fieldId,
                Name = label.Name,
                Color = label.Color
            };
        }

        return new ChronologioFieldRefDto { Id = fieldId };
    }

    private static string? GetMeta(IReadOnlyDictionary<string, string> meta, string key) =>
        meta.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value) ? value : null;

    private static string Truncate(string? text, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        var trimmed = text.Trim();
        if (trimmed.Length <= maxLength)
        {
            return trimmed;
        }

        return trimmed[..(maxLength - 1)].TrimEnd() + "…";
    }

    private static string FormatMoney(decimal amount, string currency)
    {
        var formatted = amount.ToString("0.##", CultureInfo.InvariantCulture);
        return string.Equals(currency, "EUR", StringComparison.OrdinalIgnoreCase)
            ? $"{formatted} €"
            : $"{formatted} {currency}";
    }

    private static DateTime EnsureUtc(DateTime value) =>
        value.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(value, DateTimeKind.Utc)
            : value.ToUniversalTime();

    private static int NormalizeLimit(int limit)
    {
        if (limit <= 0)
        {
            return DefaultLimit;
        }

        return Math.Min(limit, MaxLimit);
    }
}
