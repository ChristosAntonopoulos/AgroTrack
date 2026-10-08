using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.FieldWork;

namespace OliveLifecycle.Application.Services;

public interface ITaskSuggestionService
{
    Task<IReadOnlyList<TaskSuggestionDto>> ListAsync(
        string fieldId,
        DateTime? date,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task DismissAsync(
        DismissTaskSuggestionDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Ephemeral suggestions from curated templates. Never creates FieldTasks.
/// Only dismissals are persisted.
/// </summary>
public class TaskSuggestionService : ITaskSuggestionService
{
    private readonly IFieldWorkAuthorizationService _auth;
    private readonly ITaskSuggestionDismissalRepository _dismissals;
    private readonly IFieldTaskRepository _tasks;
    private readonly IDateTimeProvider _clock;

    public TaskSuggestionService(
        IFieldWorkAuthorizationService auth,
        ITaskSuggestionDismissalRepository dismissals,
        IFieldTaskRepository tasks,
        IDateTimeProvider clock)
    {
        _auth = auth;
        _dismissals = dismissals;
        _tasks = tasks;
        _clock = clock;
    }

    public async Task<IReadOnlyList<TaskSuggestionDto>> ListAsync(
        string fieldId,
        DateTime? date,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fieldId))
        {
            throw new ValidationException("fieldId is required.");
        }

        await _auth.EnsureCanViewFieldWorkAsync(fieldId, userId, userRole, cancellationToken);

        var asOf = date ?? _clock.UtcNow;
        var resultYear = ResultYearResolver.Resolve(asOf, null, _clock.UtcNow);
        var dismissed = await _dismissals.GetByFieldAndYearAsync(fieldId, resultYear, cancellationToken);
        var dismissedCodes = dismissed
            .Select(d => d.TemplateCode)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var planned = await _tasks.QueryAsync(
            new FieldTaskQuery
            {
                FieldId = fieldId,
                ResultYear = resultYear,
                Statuses = [FieldTaskStatus.Planned]
            },
            cancellationToken);
        var openTemplateCodes = planned
            .Where(t => !string.IsNullOrWhiteSpace(t.TemplateCode))
            .Select(t => t.TemplateCode!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var month = asOf.Month;
        var suggestions = new List<TaskSuggestionDto>();

        foreach (var code in CuratedTaskTemplates.Codes)
        {
            if (dismissedCodes.Contains(code) || openTemplateCodes.Contains(code))
            {
                continue;
            }

            var entry = FieldWorkCatalogue.GetByCode(code);
            if (entry is null)
            {
                continue;
            }

            if (!IsInSeasonalWindow(entry, month))
            {
                continue;
            }

            suggestions.Add(new TaskSuggestionDto
            {
                TemplateCode = code,
                Title = CuratedTaskTemplates.DisplayTitle(code, language),
                FieldId = fieldId,
                ResultYear = resultYear,
                WhyNow = BuildWhyNow(entry, language),
                Category = entry.Category,
                RecommendedWindowStart = asOf.Date,
                RecommendedWindowEnd = asOf.Date.AddDays(14),
                Confidence = "seasonal_reminder"
            });
        }

        return suggestions;
    }

    public async Task DismissAsync(
        DismissTaskSuggestionDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.FieldId) || string.IsNullOrWhiteSpace(dto.TemplateCode))
        {
            throw new ValidationException("FieldId and TemplateCode are required.");
        }

        if (!CuratedTaskTemplates.IsCurated(dto.TemplateCode))
        {
            throw new ValidationException("Unknown template code.");
        }

        await _auth.EnsureCanManageProposalsAsync(dto.FieldId, userId, userRole, cancellationToken);

        var now = _clock.UtcNow;
        var resultYear = dto.ResultYear ?? ResultYearResolver.Resolve(now, null, now);
        var existing = await _dismissals.GetAsync(dto.FieldId, resultYear, dto.TemplateCode, cancellationToken);
        if (existing != null)
        {
            return;
        }

        await _dismissals.CreateAsync(new TaskSuggestionDismissal
        {
            FieldId = dto.FieldId,
            ResultYear = resultYear,
            TemplateCode = dto.TemplateCode.Trim().ToUpperInvariant(),
            OwnerId = userId,
            DismissedByUserId = userId,
            DismissedAt = now,
            CreatedAt = now,
            UpdatedAt = now
        }, cancellationToken);
    }

    private static bool IsInSeasonalWindow(FieldWorkCatalogueEntry entry, int month)
    {
        var range = entry.CandidateMonthRange;
        if (range is null)
        {
            return true;
        }

        var start = range.StartMonth;
        var end = range.EndMonth;
        if (start <= end)
        {
            return month >= start && month <= end;
        }

        // wraps year (e.g. Nov–Feb)
        return month >= start || month <= end;
    }

    private static string BuildWhyNow(FieldWorkCatalogueEntry entry, string language)
    {
        if (language.StartsWith("en", StringComparison.OrdinalIgnoreCase))
        {
            return $"Seasonal window for {entry.EnglishName}.";
        }

        return $"Εποχικό παράθυρο για {CuratedTaskTemplates.DisplayTitle(entry.Code, "el")}.";
    }
}
