using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.FieldWork;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class ChecklistSnapshotFactoryTests
{
    [Fact]
    public void CopyFromTemplate_keeps_three_working_checks()
    {
        var definitions = Enumerable.Range(1, 8).Select(i => new TaskChecklistDefinition
        {
            Key = $"c{i}",
            GreekLabel = $"g{i}",
            EnglishLabel = $"e{i}",
            IsEssential = i <= 5,
            SortOrder = i
        });

        var copy = ChecklistSnapshotFactory.CopyFromTemplate(definitions);

        Assert.Equal(3, copy.Count);
        Assert.Equal(["c1", "c2", "c3"], copy.Select(item => item.Key));
    }

    [Fact]
    public void WorkingChecks_fills_from_optional_when_essentials_are_few()
    {
        var definitions = new List<TaskChecklistDefinition>
        {
            new() { Key = "a", IsEssential = true, SortOrder = 1 },
            new() { Key = "b", IsEssential = false, SortOrder = 2 },
            new() { Key = "c", IsEssential = false, SortOrder = 3 },
            new() { Key = "d", IsEssential = false, SortOrder = 4 }
        };

        var keys = ChecklistSnapshotFactory.WorkingChecks(definitions).Select(item => item.Key);

        Assert.Equal(["a", "b", "c"], keys);
    }
}
