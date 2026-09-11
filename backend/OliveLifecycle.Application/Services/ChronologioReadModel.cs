using System.Globalization;
using OliveLifecycle.Application.DTOs.Chronologio;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Application.Services;

/// <summary>
/// Canonical Chronologio read-model rules: one source record → one event,
/// task-linked money is folded into the task, totals use the deduplicated set.
/// </summary>
public static class ChronologioReadModel
{
    public static ChronologioEventKey KeyOf(ChronologioEntryDto entry) =>
        ChronologioEventKey.From(entry.SourceType, entry.SourceId, entry.OccurrenceId);

    /// <summary>
    /// Collapse duplicate source rows, keep one event per completed task,
    /// and hide expenses that only restate a linked task — unless the caller
    /// is filtering the journal to money.
    /// </summary>
    public static IReadOnlyList<ChronologioEntryDto> Canonicalize(
        IReadOnlyList<ChronologioEntryDto> entries,
        ChronologioCategory? categoryFilter = null)
    {
        if (entries.Count == 0)
        {
            return entries;
        }

        var keepLinkedMoneySeparate = IsMoneyFilter(categoryFilter);
        var collapsed = CollapseTaskExecutions(entries);
        var folded = keepLinkedMoneySeparate ? collapsed : FoldTaskLinkedMoney(collapsed);
        return Deduplicate(folded);
    }

    public static bool IsMoneyFilter(ChronologioCategory? categoryFilter) =>
        categoryFilter is ChronologioCategory.Expense or ChronologioCategory.Income;

    public static bool MatchesCategory(ChronologioEntryDto entry, string? requested)
    {
        if (string.IsNullOrWhiteSpace(requested) ||
            string.Equals(requested, "all", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var key = requested.Trim().ToLowerInvariant();
        if (IsExactSourceFilter(key))
        {
            return string.Equals(entry.Category, key, StringComparison.OrdinalIgnoreCase);
        }

        var primary = ChronologioPrimaryCategoryExtensions.FromApiString(key);
        if (primary.HasValue)
        {
            var source = ChronologioCategoryExtensions.FromApiString(entry.Category);
            if (source.HasValue)
            {
                return ChronologioPrimaryCategoryExtensions.FromSource(source.Value) == primary.Value;
            }
        }

        return string.Equals(entry.Category, requested, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsExactSourceFilter(string key) => key is
        "task" or "expense" or "income" or "harvest" or "note" or "photo"
        or "weather" or "intelligence" or "activity" or "collaborator" or "lifecycle";

    public static bool MatchesResultYear(ChronologioEntryDto entry, string? requested)
    {
        if (string.IsNullOrWhiteSpace(requested))
        {
            return true;
        }

        // Field crop-load values are not ResultYear identifiers.
        if (string.Equals(requested, "low", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(requested, "high", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (entry.ResultYear is > 0 &&
            int.TryParse(requested, NumberStyles.Integer, CultureInfo.InvariantCulture, out var requestedYear) &&
            entry.ResultYear.Value == requestedYear)
        {
            return true;
        }

        return string.Equals(entry.LifecycleYear, requested, StringComparison.OrdinalIgnoreCase);
    }

    public static int PeriodYearOf(ChronologioEntryDto entry, string axis)
    {
        if (ChronologioAxis.IsAgricultural(axis) && entry.ResultYear is > 0)
        {
            return entry.ResultYear.Value;
        }

        if (ChronologioAxis.IsAgricultural(axis))
        {
            return AgriculturalYear.For(entry.OccurredAt);
        }

        return ChronologioSeasonCalendar.PeriodKeyFor(entry.OccurredAt, axis);
    }

    private static List<ChronologioEntryDto> CollapseTaskExecutions(IReadOnlyList<ChronologioEntryDto> entries)
    {
        var latestByTask = new Dictionary<string, ChronologioEntryDto>(StringComparer.Ordinal);
        var passthrough = new List<ChronologioEntryDto>(entries.Count);

        foreach (var entry in entries)
        {
            if (!IsTaskExecution(entry))
            {
                passthrough.Add(entry);
                continue;
            }

            var taskId = entry.Details.Task?.TaskId;
            if (string.IsNullOrWhiteSpace(taskId))
            {
                passthrough.Add(entry);
                continue;
            }

            if (!latestByTask.TryGetValue(taskId, out var existing) || IsNewer(entry, existing))
            {
                latestByTask[taskId] = entry;
            }
        }

        passthrough.AddRange(latestByTask.Values);
        return passthrough;
    }

    private static List<ChronologioEntryDto> FoldTaskLinkedMoney(IReadOnlyList<ChronologioEntryDto> entries)
    {
        var tasksById = entries
            .Where(IsTaskExecution)
            .Select(e => e.Details.Task?.TaskId)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Cast<string>()
            .ToHashSet(StringComparer.Ordinal);

        var linkedMoney = entries
            .Where(e => IsMoney(e) && HasLinkedTask(e, tasksById))
            .ToList();

        if (linkedMoney.Count == 0)
        {
            return entries.ToList();
        }

        var moneyByTask = linkedMoney
            .GroupBy(e => e.Details.Expense!.LinkedTaskId!, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.Ordinal);

        var result = new List<ChronologioEntryDto>(entries.Count);
        foreach (var entry in entries)
        {
            if (IsMoney(entry) && HasLinkedTask(entry, tasksById))
            {
                continue;
            }

            if (IsTaskExecution(entry)
                && entry.Details.Task?.TaskId is { } taskId
                && moneyByTask.TryGetValue(taskId, out var money))
            {
                result.Add(AttachMoney(entry, money));
                continue;
            }

            result.Add(entry);
        }

        return result;
    }

    private static ChronologioEntryDto AttachMoney(
        ChronologioEntryDto task,
        IReadOnlyList<ChronologioEntryDto> money)
    {
        var primary = money
            .OrderByDescending(e => e.Amount?.Value ?? 0)
            .ThenByDescending(e => e.OccurredAt)
            .First();

        var currency = primary.Amount?.Currency ?? "EUR";
        var total = money
            .Where(e => e.Amount != null && string.Equals(e.Amount.Currency, currency, StringComparison.OrdinalIgnoreCase))
            .Sum(e => e.Amount!.Value);

        task.Amount = new ChronologioAmountDto { Value = total, Currency = currency };
        task.Details.Expense ??= primary.Details.Expense;
        return task;
    }

    private static List<ChronologioEntryDto> Deduplicate(IReadOnlyList<ChronologioEntryDto> entries)
    {
        var seenKeys = new HashSet<string>(StringComparer.Ordinal);
        var seenNoteFingerprints = new HashSet<string>(StringComparer.Ordinal);
        var result = new List<ChronologioEntryDto>(entries.Count);

        foreach (var entry in entries.OrderByDescending(e => e.OccurredAt).ThenByDescending(e => e.CreatedAt ?? DateTime.MinValue))
        {
            var key = KeyOf(entry).ToId();
            if (!seenKeys.Add(key))
            {
                continue;
            }

            if (IsNote(entry))
            {
                var fingerprint = NoteFingerprint(entry);
                if (!string.IsNullOrWhiteSpace(fingerprint) && !seenNoteFingerprints.Add(fingerprint))
                {
                    continue;
                }
            }

            result.Add(entry);
        }

        return result;
    }

    private static bool IsTaskExecution(ChronologioEntryDto entry) =>
        string.Equals(entry.SourceType, ChronologioSourceTypes.TaskExecution, StringComparison.Ordinal)
        || string.Equals(entry.SourceType, ChronologioSourceTypes.Task, StringComparison.Ordinal);

    private static bool IsMoney(ChronologioEntryDto entry) =>
        string.Equals(entry.SourceType, ChronologioSourceTypes.Expense, StringComparison.Ordinal)
        || string.Equals(entry.SourceType, ChronologioSourceTypes.Income, StringComparison.Ordinal);

    private static bool IsNote(ChronologioEntryDto entry) =>
        string.Equals(entry.SourceType, ChronologioSourceTypes.Note, StringComparison.Ordinal);

    private static bool HasLinkedTask(ChronologioEntryDto entry, ISet<string> taskIds)
    {
        var linked = entry.Details.Expense?.LinkedTaskId;
        return !string.IsNullOrWhiteSpace(linked) && taskIds.Contains(linked);
    }

    private static bool IsNewer(ChronologioEntryDto candidate, ChronologioEntryDto existing)
    {
        if (candidate.OccurredAt != existing.OccurredAt)
        {
            return candidate.OccurredAt > existing.OccurredAt;
        }

        var candidateCreated = candidate.CreatedAt ?? DateTime.MinValue;
        var existingCreated = existing.CreatedAt ?? DateTime.MinValue;
        return candidateCreated > existingCreated;
    }

    private static string NoteFingerprint(ChronologioEntryDto entry)
    {
        var occurred = entry.OccurredAt.ToUniversalTime().ToString("yyyyMMddHHmm");
        var body = (entry.Details.Note?.BodyPreview ?? entry.Summary ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(body))
        {
            return string.Empty;
        }

        return $"{entry.FieldId}:{occurred}:{body}";
    }
}
