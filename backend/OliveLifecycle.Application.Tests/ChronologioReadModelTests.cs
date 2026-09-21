using OliveLifecycle.Application.DTOs.Chronologio;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class ChronologioReadModelTests
{
    [Fact]
    public void KeyOf_UsesSourceTypeSourceIdAndOccurrence()
    {
        var key = ChronologioReadModel.KeyOf(new ChronologioEntryDto
        {
            SourceType = ChronologioSourceTypes.TaskExecution,
            SourceId = "exec-1",
            OccurrenceId = "exec-1"
        });

        Assert.Equal("TaskExecution:exec-1:exec-1", key.ToId());
    }

    [Fact]
    public void Canonicalize_OneEventPerSourceKey()
    {
        var entries = ChronologioReadModel.Canonicalize(new[]
        {
            Note("note-1", "Δάκος"),
            Note("note-1", "Δάκος")
        });

        Assert.Single(entries);
    }

    [Fact]
    public void Canonicalize_DedupesNotesWithSameFieldMinuteAndSimilarBody()
    {
        var a = Note("note-a", "Εντοπίστηκαν σημάδια δάκου.");
        var b = Note("note-b", "  Εντοπίστηκαν   σημάδια δάκου  ");
        b.OccurredAt = a.OccurredAt;
        b.CreatedAt = a.OccurredAt.AddMinutes(1);

        var entries = ChronologioReadModel.Canonicalize(new[] { a, b });

        Assert.Single(entries, e => e.SourceType == ChronologioSourceTypes.Note);
    }

    [Fact]
    public void Canonicalize_KeepsDistinctNotesSameMinute()
    {
        var a = Note("note-a", "Δάκος στη βόρεια πλευρά.");
        var b = Note("note-b", "Υγρασία χαμηλή κάτω από τα μεγάλα δέντρα.");
        b.OccurredAt = a.OccurredAt;

        var entries = ChronologioReadModel.Canonicalize(new[] { a, b });

        Assert.Equal(2, entries.Count(e => e.SourceType == ChronologioSourceTypes.Note));
    }

    [Fact]
    public void Canonicalize_FoldsTaskLinkedExpense_UnlessMoneyFilter()
    {
        var task = TaskEvent("exec-1", "task-1");
        var expense = ExpenseEvent("exp-1", "task-1");

        var folded = ChronologioReadModel.Canonicalize(new[] { task, expense });
        Assert.Single(folded);
        Assert.Equal(ChronologioSourceTypes.TaskExecution, folded[0].SourceType);
        Assert.Equal(40m, folded[0].Amount!.Value);

        var moneyView = ChronologioReadModel.Canonicalize(
            new[] { task, expense },
            ChronologioCategory.Expense);
        Assert.Equal(2, moneyView.Count);
        Assert.Contains(moneyView, e => e.SourceId == "exp-1");
    }

    [Fact]
    public void MatchesCategory_MoneyAliasIncludesExpenseAndIncome()
    {
        var expense = ExpenseEvent("exp-1", "task-1");
        var income = ExpenseEvent("inc-1", "task-1");
        income.Category = ChronologioCategory.Income.ToApiString();
        income.SourceType = ChronologioSourceTypes.Income;

        Assert.True(ChronologioReadModel.MatchesCategory(expense, "money"));
        Assert.True(ChronologioReadModel.MatchesCategory(income, "money"));
        Assert.False(ChronologioReadModel.MatchesCategory(TaskEvent("exec-1", "task-1"), "money"));
        Assert.True(ChronologioReadModel.MatchesCategory(expense, "expense"));
        Assert.False(ChronologioReadModel.MatchesCategory(income, "expense"));
    }

    [Fact]
    public void PeriodYearOf_AgriculturalAxis_UsesResultYearAndKeepsJanuaryTogether()
    {
        var januaryHarvest = new ChronologioEntryDto
        {
            SourceType = ChronologioSourceTypes.Harvest,
            SourceId = "h1",
            Category = ChronologioCategory.Harvest.ToApiString(),
            OccurredAt = new DateTime(2027, 1, 12, 10, 0, 0, DateTimeKind.Utc),
            ResultYear = 2026
        };

        Assert.Equal(2026, ChronologioReadModel.PeriodYearOf(januaryHarvest, ChronologioAxis.Agricultural));
        Assert.Equal(2027, ChronologioReadModel.PeriodYearOf(januaryHarvest, ChronologioAxis.Calendar));
    }

    [Fact]
    public void MatchesResultYear_IgnoresCropLoadValues()
    {
        var entry = TaskEvent("exec-1", "task-1");
        entry.ResultYear = 2026;
        entry.LifecycleYear = "2026";

        Assert.True(ChronologioReadModel.MatchesResultYear(entry, "2026"));
        Assert.False(ChronologioReadModel.MatchesResultYear(entry, "low"));
        Assert.False(ChronologioReadModel.MatchesResultYear(entry, "high"));
    }

    [Fact]
    public void Canonicalize_FoldsSameDayHarvests_WithoutAddingSacksToOfficialKg()
    {
        var sacks = HarvestEvent("sack-1", 0, sackCount: 20, official: false);
        var mill = HarvestEvent("mill-1", 860, sackCount: 0, official: true);
        mill.OccurredAt = sacks.OccurredAt;

        var folded = ChronologioReadModel.Canonicalize(new[] { sacks, mill });
        var harvest = Assert.Single(folded, e => e.SourceType == ChronologioSourceTypes.Harvest);
        Assert.Equal(860, harvest.Details.Harvest!.OliveKg);
        Assert.Equal(20, harvest.Details.Harvest.SackCount);
        Assert.Contains("860", harvest.Summary);
        Assert.DoesNotContain("1760", harvest.Summary);
    }

    private static ChronologioEntryDto HarvestEvent(string id, double oliveKg, int sackCount, bool official) => new()
    {
        Id = $"{ChronologioSourceTypes.Harvest}:{id}",
        FieldId = "field-1",
        SourceType = ChronologioSourceTypes.Harvest,
        SourceId = id,
        Category = ChronologioCategory.Harvest.ToApiString(),
        Title = "Ημέρα συγκομιδής",
        Summary = official ? $"{oliveKg} kg επίσημο βάρος" : $"{sackCount} σακιά",
        OccurredAt = new DateTime(2026, 11, 12, 16, 0, 0, DateTimeKind.Utc),
        Details = new ChronologioDetailsDto
        {
            Harvest = new ChronologioHarvestDetailsDto
            {
                HarvestId = id,
                OliveKg = oliveKg,
                SackCount = sackCount,
                HasOfficialWeight = official
            }
        }
    };

    private static ChronologioEntryDto Note(string id, string body) => new()
    {
        Id = $"{ChronologioSourceTypes.Note}:{id}",
        FieldId = "field-1",
        SourceType = ChronologioSourceTypes.Note,
        SourceId = id,
        Category = ChronologioCategory.Note.ToApiString(),
        Title = "Παρατήρηση",
        Summary = body,
        OccurredAt = new DateTime(2026, 9, 8, 18, 0, 0, DateTimeKind.Utc),
        Details = new ChronologioDetailsDto
        {
            Note = new ChronologioNoteDetailsDto { NoteId = id, BodyPreview = body }
        }
    };

    private static ChronologioEntryDto TaskEvent(string executionId, string taskId) => new()
    {
        Id = $"{ChronologioSourceTypes.TaskExecution}:{executionId}",
        FieldId = "field-1",
        SourceType = ChronologioSourceTypes.TaskExecution,
        SourceId = executionId,
        OccurrenceId = executionId,
        Category = ChronologioCategory.Task.ToApiString(),
        Title = "Ψεκασμός",
        OccurredAt = new DateTime(2026, 9, 8, 10, 0, 0, DateTimeKind.Utc),
        Details = new ChronologioDetailsDto
        {
            Task = new ChronologioTaskDetailsDto { TaskId = taskId, ExecutionId = executionId }
        }
    };

    private static ChronologioEntryDto ExpenseEvent(string id, string taskId) => new()
    {
        Id = $"{ChronologioSourceTypes.Expense}:{id}",
        FieldId = "field-1",
        SourceType = ChronologioSourceTypes.Expense,
        SourceId = id,
        Category = ChronologioCategory.Expense.ToApiString(),
        Title = "Έξοδο 40 €",
        OccurredAt = new DateTime(2026, 9, 8, 10, 0, 0, DateTimeKind.Utc),
        Amount = new ChronologioAmountDto { Value = 40m, Currency = "EUR" },
        Details = new ChronologioDetailsDto
        {
            Expense = new ChronologioExpenseDetailsDto
            {
                ExpenseId = id,
                LinkedTaskId = taskId,
                ExpenseCategory = "plant_protection",
                ExpenseCategoryLabel = "Φυτοπροστασία"
            }
        }
    };
}
