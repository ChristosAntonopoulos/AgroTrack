using OliveLifecycle.Core.Entities.FieldWork;

namespace OliveLifecycle.Core.FieldWork;

/// <summary>
/// Copies the immutable template-version checklist into a FieldTask snapshot.
/// Executions never depend on a mutable global template.
/// </summary>
public static class ChecklistSnapshotFactory
{
    /// <summary>A field notebook shows a few checks, not an office form.</summary>
    public const int WorkingCheckLimit = 3;

    public static IReadOnlyList<TaskChecklistDefinition> WorkingChecks(
        IEnumerable<TaskChecklistDefinition> definitions) =>
        definitions
            .OrderBy(d => d.IsEssential ? 0 : 1)
            .ThenBy(d => d.SortOrder)
            .Take(WorkingCheckLimit)
            .OrderBy(d => d.SortOrder)
            .ToList();

    public static List<FieldTaskChecklistItem> CopyFromTemplate(IEnumerable<TaskChecklistDefinition> definitions)
    {
        return WorkingChecks(definitions)
            .Select(d => new FieldTaskChecklistItem
            {
                Key = d.Key,
                GreekLabel = d.GreekLabel,
                EnglishLabel = d.EnglishLabel,
                ItemType = d.ItemType,
                Requirement = d.Requirement,
                Choices = d.Choices.ToList(),
                Unit = d.Unit,
                IsEssential = d.IsEssential,
                SortOrder = d.SortOrder,
                IsAnswered = false
            })
            .ToList();
    }
}
