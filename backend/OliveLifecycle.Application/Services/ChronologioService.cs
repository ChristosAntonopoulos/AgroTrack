using System.Globalization;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Chronologio;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

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
    private readonly ITaskRepository _taskRepository;
    private readonly IFinancialEntryRepository _financialEntryRepository;
    private readonly IHarvestRecordRepository _harvestRecordRepository;
    private readonly INoteRepository _noteRepository;
    private readonly IActivityRepository _activityRepository;
    private readonly IUserRepository _userRepository;
    private readonly IMediaAttachmentRepository _mediaAttachmentRepository;
    private readonly IFieldWeatherPeriodReviewRepository _weatherReviewRepository;
    private readonly ILogger<ChronologioService> _logger;

    public ChronologioService(
        IFieldAccessService fieldAccessService,
        IFieldService fieldService,
        IFieldRepository fieldRepository,
        ITaskRepository taskRepository,
        IFinancialEntryRepository financialEntryRepository,
        IHarvestRecordRepository harvestRecordRepository,
        INoteRepository noteRepository,
        IActivityRepository activityRepository,
        IUserRepository userRepository,
        IMediaAttachmentRepository mediaAttachmentRepository,
        IFieldWeatherPeriodReviewRepository weatherReviewRepository,
        ILogger<ChronologioService> logger)
    {
        _fieldAccessService = fieldAccessService;
        _fieldService = fieldService;
        _fieldRepository = fieldRepository;
        _taskRepository = taskRepository;
        _financialEntryRepository = financialEntryRepository;
        _harvestRecordRepository = harvestRecordRepository;
        _noteRepository = noteRepository;
        _activityRepository = activityRepository;
        _userRepository = userRepository;
        _mediaAttachmentRepository = mediaAttachmentRepository;
        _weatherReviewRepository = weatherReviewRepository;
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
            ?? (ChronologioAxis.IsSeason(axis)
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
        var groups = entries.GroupBy(e => ChronologioSeasonCalendar.PeriodKeyFor(e.OccurredAt, axis));
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
                    stats.OilKg += e.Details.Harvest.OilKg ?? 0;
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
                if (observation == null && !string.IsNullOrWhiteSpace(e.Title))
                {
                    observation = e.Title;
                }

                if (highlights.Count < MaxHighlights
                    && !string.IsNullOrWhiteSpace(e.Title)
                    && !highlights.Contains(e.Title, StringComparer.Ordinal))
                {
                    highlights.Add(e.Title);
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
        // Journal pages keep weather out of the Days feed; category=weather (peek) still needs reviews.
        var includeWeatherReviews = !pageResults
            || categoryFilter == ChronologioCategory.Weather;

        IReadOnlyList<TaskItem> tasks;
        IReadOnlyList<FinancialEntry> expenses;
        IReadOnlyList<HarvestRecord> harvests;
        IReadOnlyList<Activity> activities;
        IReadOnlyList<Note> notes;
        IReadOnlyList<FieldWeatherPeriodReview> weatherReviews;

        if (fieldIds.Count == 1)
        {
            var fieldId = fieldIds[0];
            tasks = (await _taskRepository.GetByFieldIdAndStatusAsync(
                fieldId,
                WorkTaskStatus.Completed.ToApiString(),
                cancellationToken)).ToList();
            expenses = (await _financialEntryRepository.GetByFieldIdAsync(fieldId, includeVoided: false, limit: 200, cancellationToken)).ToList();
            harvests = (await _harvestRecordRepository.GetByFieldIdAsync(fieldId, cancellationToken)).ToList();
            activities = (await _activityRepository.GetByFieldIdAsync(fieldId, ActivityFetchLimit, cancellationToken)).ToList();
            notes = (await _noteRepository.GetByOwnerUserIdAsync(userId, fieldId, limit: 200, cancellationToken)).ToList();
            weatherReviews = includeWeatherReviews
                ? await _weatherReviewRepository.GetByFieldIdsAsync(
                    fieldIds, query.From, query.To, cancellationToken)
                : Array.Empty<FieldWeatherPeriodReview>();
        }
        else
        {
            tasks = (await _taskRepository.GetByFieldIdsAsync(fieldIds, cancellationToken))
                .Where(t => t.Status == WorkTaskStatus.Completed)
                .ToList();
            expenses = (await _financialEntryRepository.GetByFieldIdsAsync(fieldIds, cancellationToken)).ToList();
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
            weatherReviews = includeWeatherReviews
                ? await _weatherReviewRepository.GetByFieldIdsAsync(
                    fieldIds, query.From, query.To, cancellationToken)
                : Array.Empty<FieldWeatherPeriodReview>();
        }

        harvests = harvests.Where(h => h.Status == FinancialEntryStatus.Posted).ToList();
        expenses = expenses
            .Where(e => e.Status == FinancialEntryStatus.Posted && e.Kind == FinancialEntryKind.Expense)
            .ToList();
        notes = notes.Where(n => !string.IsNullOrWhiteSpace(n.FieldId)).ToList();
        activities = activities.Where(a => IncludedActivityTypes.Contains(a.Type)).ToList();

        var completedTaskIds = new HashSet<string>(
            tasks.Select(t => t.Id),
            StringComparer.Ordinal);

        // Dedup: skip expenses linked to a completed task already on the timeline,
        // and skip harvest-linked ledger rows (harvest card is the source of truth).
        expenses = expenses
            .Where(e => string.IsNullOrWhiteSpace(e.HarvestId))
            .Where(e => string.IsNullOrWhiteSpace(e.TaskId) || !completedTaskIds.Contains(e.TaskId))
            .ToList();

        var nameIds = CollectUserIds(tasks, expenses, activities, notes);
        nameIds.Add(userId);
        var displayNames = await ResolveDisplayNamesAsync(nameIds, cancellationToken);

        var noteMedia = (await _mediaAttachmentRepository.GetByOwnersAsync(
                MediaOwnerType.Note, notes.Select(n => n.Id), cancellationToken))
            .GroupBy(m => m.OwnerId)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.Ordinal);
        var taskMedia = (await _mediaAttachmentRepository.GetByOwnersAsync(
                MediaOwnerType.Task, tasks.Select(t => t.Id), cancellationToken))
            .GroupBy(m => m.OwnerId)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.Ordinal);
        var harvestMedia = (await _mediaAttachmentRepository.GetByOwnersAsync(
                MediaOwnerType.Harvest, harvests.Select(h => h.Id), cancellationToken))
            .GroupBy(m => m.OwnerId)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.Ordinal);

        var entries = new List<ChronologioEntryDto>();

        foreach (var task in tasks)
        {
            entries.Add(MapTask(task, fieldLabels, displayNames, taskMedia.GetValueOrDefault(task.Id)));
        }

        foreach (var expense in expenses)
        {
            entries.Add(MapExpense(expense, fieldLabels, displayNames));
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
            entries.Add(MapWeatherReview(review, fieldLabels));
        }

        IEnumerable<ChronologioEntryDto> filtered = entries;

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
            filtered = filtered.Where(e =>
                string.Equals(e.LifecycleYear, query.LifecycleYear, StringComparison.OrdinalIgnoreCase));
        }

        if (categoryFilter.HasValue)
        {
            var category = categoryFilter.Value.ToApiString();
            filtered = filtered.Where(e =>
                string.Equals(e.Category, category, StringComparison.OrdinalIgnoreCase));
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

    private static ChronologioEntryDto MapTask(
        TaskItem task,
        IReadOnlyDictionary<string, FieldLabel> fieldLabels,
        IReadOnlyDictionary<string, string> displayNames,
        IReadOnlyList<MediaAttachment>? attachments = null)
    {
        var occurredAt = task.ActualEnd ?? task.ScheduledEnd ?? task.UpdatedAt;
        var assigneeName = ResolveName(task.AssignedTo, displayNames);
        var actorUserId = task.AssignedTo;
        var amount = task.Cost.HasValue
            ? new ChronologioAmountDto { Value = task.Cost.Value, Currency = "EUR" }
            : null;

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
        else
        {
            media.AddRange(task.Evidence
                .Where(e => !string.IsNullOrWhiteSpace(e.PhotoUrl))
                .Select((e, index) => new ChronologioMediaDto
                {
                    Id = $"{task.Id}-evidence-{index}",
                    Type = "image",
                    ThumbnailUrl = e.PhotoUrl,
                    Url = e.PhotoUrl
                }));
        }

        return new ChronologioEntryDto
        {
            Id = $"{ChronologioSourceTypes.Task}:{task.Id}",
            FieldId = task.FieldId,
            Field = FieldRef(task.FieldId, fieldLabels),
            CropCycleId = null,
            LifecycleYear = task.LifecycleYear,
            OccurredAt = EnsureUtc(occurredAt),
            CreatedAt = EnsureUtc(task.CreatedAt),
            Category = ChronologioCategory.Task.ToApiString(),
            EventType = ChronologioEventTypes.TaskCompleted,
            Title = string.IsNullOrWhiteSpace(task.Title) ? (task.Type ?? "Task") : task.Title,
            Summary = "Completed",
            SourceType = ChronologioSourceTypes.Task,
            SourceId = task.Id,
            IsSystemGenerated = false,
            Actor = BuildActor(actorUserId, displayNames),
            Importance = ChronologioImportance.Normal.ToApiString(),
            Amount = amount,
            Media = media,
            Details = new ChronologioDetailsDto
            {
                Task = new ChronologioTaskDetailsDto
                {
                    TaskId = task.Id,
                    TaskType = task.Type,
                    Status = task.Status.ToApiString(),
                    StartDate = task.ActualStart ?? task.ScheduledStart,
                    EndDate = task.ActualEnd ?? task.ScheduledEnd,
                    AssigneeName = assigneeName
                }
            }
        };
    }

    private static ChronologioEntryDto MapExpense(
        FinancialEntry entry,
        IReadOnlyDictionary<string, FieldLabel> fieldLabels,
        IReadOnlyDictionary<string, string> displayNames)
    {
        var category = entry.Category?.ToApiString();
        var title = string.IsNullOrWhiteSpace(entry.Description)
            ? (category ?? "Expense")
            : entry.Description;
        var currency = string.IsNullOrWhiteSpace(entry.Currency) ? "EUR" : entry.Currency;

        return new ChronologioEntryDto
        {
            Id = $"{ChronologioSourceTypes.Expense}:{entry.Id}",
            FieldId = entry.FieldId,
            Field = FieldRef(entry.FieldId, fieldLabels),
            CropCycleId = null,
            LifecycleYear = entry.LifecycleYear,
            OccurredAt = EnsureUtc(entry.OccurredOn),
            CreatedAt = EnsureUtc(entry.CreatedAt),
            Category = ChronologioCategory.Expense.ToApiString(),
            EventType = ChronologioEventTypes.ExpenseRecorded,
            Title = title,
            Summary = FormatMoney(entry.Amount, currency),
            SourceType = ChronologioSourceTypes.Expense,
            SourceId = entry.Id,
            IsSystemGenerated = false,
            Actor = BuildActor(entry.RecordedBy, displayNames),
            Importance = ChronologioImportance.Normal.ToApiString(),
            Amount = new ChronologioAmountDto { Value = entry.Amount, Currency = currency },
            Details = new ChronologioDetailsDto
            {
                Expense = new ChronologioExpenseDetailsDto
                {
                    ExpenseId = entry.Id,
                    ExpenseCategory = category,
                    LinkedTaskId = entry.TaskId,
                    Description = entry.Description
                }
            }
        };
    }

    private static ChronologioEntryDto MapHarvest(
        HarvestRecord harvest,
        IReadOnlyDictionary<string, FieldLabel> fieldLabels,
        IReadOnlyList<MediaAttachment>? attachments = null)
    {
        var summaryParts = new List<string>
        {
            $"{FormatNumber(harvest.OliveKg)} kg olives"
        };
        if (harvest.OilKg.HasValue)
        {
            summaryParts.Add($"{FormatNumber(harvest.OilKg.Value)} kg oil");
        }

        if (harvest.OilYieldPercent.HasValue)
        {
            summaryParts.Add($"{FormatNumber(harvest.OilYieldPercent.Value)}%");
        }

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
            LifecycleYear = null,
            OccurredAt = EnsureUtc(harvest.HarvestDate),
            CreatedAt = EnsureUtc(harvest.CreatedAt),
            Category = ChronologioCategory.Harvest.ToApiString(),
            EventType = ChronologioEventTypes.HarvestRecorded,
            Title = "Harvest",
            Summary = string.Join(" · ", summaryParts),
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
                    OilYieldPercent = harvest.OilYieldPercent,
                    Mill = harvest.MillName,
                    Quality = string.IsNullOrWhiteSpace(harvest.QualityGrade) ? null : harvest.QualityGrade,
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
            LifecycleYear = null,
            OccurredAt = EnsureUtc(occurredAt),
            CreatedAt = EnsureUtc(note.CreatedAt),
            Category = ChronologioCategory.Note.ToApiString(),
            EventType = ChronologioEventTypes.NoteCreated,
            Title = "Observation",
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
            title = type switch
            {
                "lifecycle_year_changed" => "Lifecycle year changed",
                "lifecycle_stage_changed" => "Lifecycle stage changed",
                "lifecycle_corrected" => "Lifecycle corrected",
                _ => "Lifecycle"
            };
            details = new ChronologioDetailsDto
            {
                Lifecycle = new ChronologioLifecycleDetailsDto
                {
                    PreviousYear = GetMeta(meta, "previousYear"),
                    NewYear = GetMeta(meta, "newYear"),
                    PreviousStage = GetMeta(meta, "previousStage"),
                    NewStage = GetMeta(meta, "newStage"),
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
            title = type switch
            {
                "producer_assigned" => "Producer assigned",
                "producer_unassigned" => "Producer unassigned",
                "partner_contact_accepted" => "Partner contact accepted",
                _ => "Collaborator"
            };
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
            title = "Activity";
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
            LifecycleYear = null,
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

    private static ChronologioEntryDto MapWeatherReview(
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
            var monthName = CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(month);
            title = $"{monthName} {review.Year} weather";
        }
        else
        {
            title = $"{review.Year} weather";
        }

        var summaryParts = new List<string>
        {
            $"{review.RainTotalMm:0.#} mm rain"
        };
        if (review.MaxTemperatureC.HasValue)
        {
            summaryParts.Add($"high {review.MaxTemperatureC.Value:0.#}°C");
        }

        if (isMonth && review.MinTemperatureC.HasValue)
        {
            summaryParts.Add($"low {review.MinTemperatureC.Value:0.#}°C");
        }
        else if (!isMonth)
        {
            summaryParts.Add($"{review.FrostNights} frost nights");
        }

        var vegetationNote = BuildVegetationNote(review);
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
            LifecycleYear = null,
            OccurredAt = EnsureUtc(review.OccurredAt),
            CreatedAt = EnsureUtc(review.UpdatedAt),
            Category = ChronologioCategory.Weather.ToApiString(),
            EventType = eventType,
            Title = title,
            Summary = string.Join(" · ", summaryParts),
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
                    FrostNights = review.FrostNights,
                    HeatDays = review.HeatDays,
                    HeavyRainDays = review.HeavyRainDays,
                    LongestDryStreakDays = review.LongestDryStreakDays,
                    RainVsPreviousPercent = review.RainVsPreviousPercent,
                    WettestMonth = review.WettestMonth,
                    NdviMean = review.NdviMean,
                    NdviDeltaPercent = review.NdviDeltaPercent,
                    RainSeries = review.RainSeries,
                    RainLabels = review.RainLabels,
                    Source = sourceParts.Count > 0 ? string.Join(" / ", sourceParts) : null,
                    VegetationNote = vegetationNote
                }
            }
        };
    }

    private static string? BuildVegetationNote(FieldWeatherPeriodReview review)
    {
        if (review.NdviDeltaPercent is not { } delta || Math.Abs(delta) < 5)
        {
            return null;
        }

        if (string.Equals(review.PeriodType, WeatherPeriodTypes.Month, StringComparison.OrdinalIgnoreCase))
        {
            return delta > 0
                ? "Trees looked greener than the previous month."
                : "Trees looked less green than the previous month.";
        }

        return delta > 0
            ? "Trees looked greener than the previous year."
            : "Trees looked less green than the previous year.";
    }

    private static HashSet<string> CollectUserIds(
        IEnumerable<TaskItem> tasks,
        IEnumerable<FinancialEntry> expenses,
        IEnumerable<Activity> activities,
        IEnumerable<Note> notes)
    {
        var ids = new HashSet<string>(StringComparer.Ordinal);
        foreach (var task in tasks)
        {
            if (!string.IsNullOrWhiteSpace(task.AssignedTo))
            {
                ids.Add(task.AssignedTo);
            }
        }

        foreach (var expense in expenses)
        {
            if (!string.IsNullOrWhiteSpace(expense.RecordedBy))
            {
                ids.Add(expense.RecordedBy);
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
        return string.IsNullOrWhiteSpace(name) ? user.Email : name;
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

    private static string FormatNumber(double value) =>
        value.ToString("0.##", CultureInfo.InvariantCulture);

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
