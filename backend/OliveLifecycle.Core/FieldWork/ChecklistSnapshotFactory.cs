using OliveLifecycle.Core.Entities.FieldWork;

namespace OliveLifecycle.Core.FieldWork;

/// <summary>
/// Copies the immutable template-version checklist into a FieldTask snapshot.
/// Executions never depend on a mutable global template.
/// </summary>
public static class ChecklistSnapshotFactory
{
    public static List<FieldTaskChecklistItem> CopyFromTemplate(IEnumerable<TaskChecklistDefinition> definitions)
    {
        return definitions
            .OrderBy(d => d.SortOrder)
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
