using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Chronologio;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class ChronologioServiceTests
{
    private readonly Mock<IFieldAccessService> _access = new();
    private readonly Mock<IFieldService> _fieldService = new();
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<ITaskRepository> _tasks = new();
    private readonly Mock<IFinancialEntryRepository> _finance = new();
    private readonly Mock<IHarvestRecordRepository> _harvests = new();
    private readonly Mock<INoteRepository> _notes = new();
    private readonly Mock<IActivityRepository> _activities = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IMediaAttachmentRepository> _media = new();
    private readonly Mock<IFieldWeatherPeriodReviewRepository> _weatherReviews = new();
    private readonly ChronologioService _service;

    public ChronologioServiceTests()
    {
        _media.Setup(m => m.GetByOwnersAsync(It.IsAny<MediaOwnerType>(), It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<MediaAttachment>());
        _weatherReviews.Setup(r => r.GetByFieldIdsAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Core.Entities.Geospatial.FieldWeatherPeriodReview>());

        _service = new ChronologioService(
            _access.Object,
            _fieldService.Object,
            _fields.Object,
            _tasks.Object,
            _finance.Object,
            _harvests.Object,
            _notes.Object,
            _activities.Object,
            _users.Object,
            _media.Object,
            _weatherReviews.Object,
            NullLogger<ChronologioService>.Instance);

        _users.Setup(r => r.GetByIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IEnumerable<string> ids, CancellationToken _) =>
                ids.Select(id => new User
                {
                    Id = id,
                    Email = $"{id}@example.com",
                    FirstName = id switch
                    {
                        "giorgos" => "Giorgos",
                        "maria" => "Maria",
                        "owner-1" => "Owner",
                        _ => "User"
                    },
                    LastName = id switch
                    {
                        "giorgos" => "Papadopoulos",
                        "maria" => "Ioannou",
                        "owner-1" => "One",
                        _ => id
                    }
                }));
    }

    [Fact]
    public async Task GetForFieldAsync_ThrowsWhenAccessDenied()
    {
        _access.Setup(a => a.CanUserAccessFieldAsync("field-1", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.GetForFieldAsync("field-1", "owner-1", Roles.FieldOwner, new ChronologioQuery()));
    }

    [Fact]
    public async Task GetForFieldAsync_UsesActualEndForCompletedTasks_AndSkipsPending()
    {
        AllowField("field-1", "Βόρειος Ελαιώνας");
        SetupEmptySources("field-1");

        _tasks.Setup(r => r.GetByFieldIdAndStatusAsync("field-1", "completed", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new TaskItem
                {
                    Id = "task-1",
                    FieldId = "field-1",
                    Title = "Ψεκασμός",
                    Type = "spraying",
                    Status = WorkTaskStatus.Completed,
                    AssignedTo = "giorgos",
                    ActualEnd = new DateTime(2026, 9, 12, 10, 0, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2026, 9, 13, 8, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 9, 13, 8, 0, 0, DateTimeKind.Utc),
                    Cost = 280m,
                    LifecycleYear = "low"
                }
            });

        var entries = await _service.GetForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery());

        var task = Assert.Single(entries, e => e.SourceType == ChronologioSourceTypes.Task);
        Assert.Equal(new DateTime(2026, 9, 12, 10, 0, 0, DateTimeKind.Utc), task.OccurredAt);
        Assert.Equal(ChronologioEventTypes.TaskCompleted, task.EventType);
        Assert.Equal("Ψεκασμός", task.Title);
        Assert.Equal(280m, task.Amount?.Value);
        Assert.Equal("EUR", task.Amount?.Currency);
        Assert.Equal("Giorgos Papadopoulos", task.Actor?.DisplayName);
        Assert.Equal("giorgos", task.Actor?.UserId);
        Assert.DoesNotContain(entries, e => e.Title.Contains("pending", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task GetForFieldAsync_OmitsTaskLinkedExpenseWhenCompletedTaskPresent()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        _tasks.Setup(r => r.GetByFieldIdAndStatusAsync("field-1", "completed", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new TaskItem
                {
                    Id = "task-1",
                    FieldId = "field-1",
                    Title = "Pruning",
                    Status = WorkTaskStatus.Completed,
                    ActualEnd = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc),
                    Cost = 320m,
                    CreatedAt = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc)
                }
            });

        _finance.Setup(r => r.GetByFieldIdAsync("field-1", false, 200, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new FinancialEntry
                {
                    Id = "exp-linked",
                    FieldId = "field-1",
                    TaskId = "task-1",
                    Kind = FinancialEntryKind.Expense,
                    Status = FinancialEntryStatus.Posted,
                    Amount = 320m,
                    Currency = "EUR",
                    Description = "Pruning labor",
                    OccurredOn = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc),
                    RecordedBy = "maria",
                    CreatedAt = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc)
                },
                new FinancialEntry
                {
                    Id = "exp-standalone",
                    FieldId = "field-1",
                    Kind = FinancialEntryKind.Expense,
                    Status = FinancialEntryStatus.Posted,
                    Amount = 50m,
                    Currency = "EUR",
                    Description = "Fuel",
                    Category = FinancialCategory.ElectricityFuel,
                    OccurredOn = new DateTime(2026, 9, 11, 0, 0, 0, DateTimeKind.Utc),
                    RecordedBy = "maria",
                    CreatedAt = new DateTime(2026, 9, 11, 0, 0, 0, DateTimeKind.Utc)
                }
            });

        var entries = await _service.GetForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery());

        Assert.DoesNotContain(entries, e => e.SourceId == "exp-linked");
        Assert.Contains(entries, e => e.SourceId == "exp-standalone");
        var task = Assert.Single(entries, e => e.SourceId == "task-1");
        Assert.Equal(320m, task.Amount?.Value);
    }

    [Fact]
    public async Task GetForFieldAsync_OmitsHarvestLinkedFinance_AndMapsHarvestDetails()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        _harvests.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new HarvestRecord
                {
                    Id = "harvest-1",
                    FieldId = "field-1",
                    HarvestDate = new DateTime(2026, 11, 18, 0, 0, 0, DateTimeKind.Utc),
                    OliveKg = 4820,
                    OilKg = 735,
                    OilYieldPercent = 15.2,
                    MillName = "Local mill",
                    QualityGrade = "extra_virgin",
                    WorkersUsed = 4,
                    HarvestMethod = "hand",
                    Status = FinancialEntryStatus.Posted,
                    CreatedAt = new DateTime(2026, 11, 19, 0, 0, 0, DateTimeKind.Utc)
                }
            });

        _finance.Setup(r => r.GetByFieldIdAsync("field-1", false, 200, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new FinancialEntry
                {
                    Id = "mill-cost",
                    FieldId = "field-1",
                    HarvestId = "harvest-1",
                    Kind = FinancialEntryKind.Expense,
                    Status = FinancialEntryStatus.Posted,
                    Amount = 180m,
                    Currency = "EUR",
                    Description = "Mill cost",
                    OccurredOn = new DateTime(2026, 11, 18, 0, 0, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2026, 11, 18, 0, 0, 0, DateTimeKind.Utc)
                },
                new FinancialEntry
                {
                    Id = "sale",
                    FieldId = "field-1",
                    HarvestId = "harvest-1",
                    Kind = FinancialEntryKind.Income,
                    Status = FinancialEntryStatus.Posted,
                    Amount = 2400m,
                    Currency = "EUR",
                    Description = "Oil sale",
                    OccurredOn = new DateTime(2026, 11, 18, 0, 0, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2026, 11, 18, 0, 0, 0, DateTimeKind.Utc)
                }
            });

        var entries = await _service.GetForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery());

        Assert.DoesNotContain(entries, e => e.SourceId is "mill-cost" or "sale");
        var harvest = Assert.Single(entries, e => e.SourceType == ChronologioSourceTypes.Harvest);
        Assert.Equal(ChronologioImportance.Positive.ToApiString(), harvest.Importance);
        Assert.Equal(4820, harvest.Details.Harvest!.OliveKg);
        Assert.Equal(735, harvest.Details.Harvest.OilKg);
        Assert.Equal(15.2, harvest.Details.Harvest.OilYieldPercent);
        Assert.Equal("Local mill", harvest.Details.Harvest.Mill);
        Assert.Equal(new DateTime(2026, 11, 18, 0, 0, 0, DateTimeKind.Utc), harvest.OccurredAt);
        Assert.Contains("4820", harvest.Summary);
    }

    [Fact]
    public async Task GetForFieldAsync_IncludesOnlyCallerFieldNotes()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        _notes.Setup(r => r.GetByOwnerUserIdAsync("owner-1", "field-1", 200, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new Note
                {
                    Id = "note-1",
                    OwnerUserId = "owner-1",
                    FieldId = "field-1",
                    Body = "Εντοπίστηκαν σημάδια δάκου στη βόρεια πλευρά.",
                    Pinned = true,
                    CreatedAt = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc)
                }
            });

        var entries = await _service.GetForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery());

        var note = Assert.Single(entries, e => e.SourceType == ChronologioSourceTypes.Note);
        Assert.Equal(ChronologioEventTypes.NoteCreated, note.EventType);
        Assert.Contains("δάκου", note.Summary);
        Assert.True(note.Details.Note!.Pinned);
        Assert.Equal("Owner One", note.Actor?.DisplayName);
    }

    [Fact]
    public async Task GetForFieldAsync_SkipsTaskActivities_IncludesLifecycleStageChanged()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        _activities.Setup(r => r.GetByFieldIdAsync("field-1", 200, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new Activity
                {
                    Id = "act-task",
                    FieldId = "field-1",
                    Type = "task_status_changed",
                    Message = "Task completed",
                    Timestamp = new DateTime(2026, 9, 12, 0, 0, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2026, 9, 12, 0, 0, 0, DateTimeKind.Utc),
                    ActorUserId = "giorgos",
                    TaskId = "task-1",
                    Metadata = new Dictionary<string, string>
                    {
                        ["previousStatus"] = "in_progress",
                        ["newStatus"] = "completed"
                    }
                },
                new Activity
                {
                    Id = "act-life",
                    FieldId = "field-1",
                    Type = "lifecycle_stage_changed",
                    Message = "Stage advanced to flowering",
                    Timestamp = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc),
                    ActorUserId = "owner-1",
                    Metadata = new Dictionary<string, string>
                    {
                        ["previousStage"] = "bud_break",
                        ["newStage"] = "flowering"
                    }
                }
            });

        var entries = await _service.GetForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery());

        Assert.DoesNotContain(entries, e => e.SourceId == "act-task");
        var life = Assert.Single(entries, e => e.SourceId == "act-life");
        Assert.Equal(ChronologioCategory.Lifecycle.ToApiString(), life.Category);
        Assert.Equal(ChronologioEventTypes.LifecycleStageChanged, life.EventType);
        Assert.True(life.IsSystemGenerated);
        Assert.Equal("flowering", life.Details.Lifecycle!.NewStage);
    }

    [Fact]
    public async Task GetForFieldAsync_SortsByOccurredAtDescending_NotCreatedAt()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        _tasks.Setup(r => r.GetByFieldIdAndStatusAsync("field-1", "completed", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new TaskItem
                {
                    Id = "task-old-work",
                    FieldId = "field-1",
                    Title = "Yesterday spraying",
                    Status = WorkTaskStatus.Completed,
                    ActualEnd = new DateTime(2026, 9, 7, 0, 0, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2026, 9, 8, 18, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 9, 8, 18, 0, 0, DateTimeKind.Utc)
                }
            });

        _finance.Setup(r => r.GetByFieldIdAsync("field-1", false, 200, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new FinancialEntry
                {
                    Id = "exp-today",
                    FieldId = "field-1",
                    Kind = FinancialEntryKind.Expense,
                    Status = FinancialEntryStatus.Posted,
                    Amount = 10m,
                    Currency = "EUR",
                    Description = "Today expense",
                    OccurredOn = new DateTime(2026, 9, 8, 0, 0, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2026, 9, 8, 1, 0, 0, DateTimeKind.Utc),
                    RecordedBy = "owner-1"
                }
            });

        var entries = await _service.GetForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery());

        Assert.Equal(2, entries.Count);
        Assert.Equal("exp-today", entries[0].SourceId);
        Assert.Equal("task-old-work", entries[1].SourceId);
    }

    [Fact]
    public async Task GetForUserAsync_IncludesFieldName()
    {
        _fieldService.Setup(s => s.GetFieldsForUserAsync("owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new FieldDto { Id = "field-1", Name = "Κτήμα Καρύστου", OwnerId = "owner-1" }
            });

        _tasks.Setup(r => r.GetByFieldIdAndStatusAsync("field-1", "completed", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new TaskItem
                {
                    Id = "task-1",
                    FieldId = "field-1",
                    Title = "Irrigation",
                    Status = WorkTaskStatus.Completed,
                    ActualEnd = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            });
        _finance.Setup(r => r.GetByFieldIdAsync("field-1", false, 200, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FinancialEntry>());
        _harvests.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<HarvestRecord>());
        _notes.Setup(r => r.GetByOwnerUserIdAsync("owner-1", "field-1", 200, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Note>());
        _activities.Setup(r => r.GetByFieldIdAsync("field-1", 200, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Activity>());

        // GetForUser with a single field still uses the multi-field path when field list has 1 item
        // because BuildTimelineAsync uses fieldIds.Count == 1. That is fine — one field works.
        var entries = await _service.GetForUserAsync(
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery());

        var entry = Assert.Single(entries);
        Assert.Equal("field-1", entry.Field.Id);
        Assert.Equal("Κτήμα Καρύστου", entry.Field.Name);
    }

    [Theory]
    [InlineData("2026-09-01T00:00:00Z", 2026)]
    [InlineData("2026-08-31T20:00:00Z", 2025)]
    [InlineData("2025-12-15T12:00:00Z", 2025)]
    public void SeasonCalendar_GetSeasonStartYear(string iso, int expected)
    {
        var utc = DateTime.Parse(iso, null, System.Globalization.DateTimeStyles.RoundtripKind);
        Assert.Equal(expected, ChronologioSeasonCalendar.GetSeasonStartYear(utc));
    }

    [Fact]
    public void SeasonCalendar_SeasonBounds_SepToAug()
    {
        var (from, to) = ChronologioSeasonCalendar.GetSeasonBounds(2025);
        Assert.Equal(9, TimeZoneInfo.ConvertTimeFromUtc(from, OliveLifecycle.Core.Time.AthensTime.TimeZone).Month);
        Assert.Equal(2025, TimeZoneInfo.ConvertTimeFromUtc(from, OliveLifecycle.Core.Time.AthensTime.TimeZone).Year);
        Assert.Equal(8, TimeZoneInfo.ConvertTimeFromUtc(to, OliveLifecycle.Core.Time.AthensTime.TimeZone).Month);
        Assert.Equal(2026, TimeZoneInfo.ConvertTimeFromUtc(to, OliveLifecycle.Core.Time.AthensTime.TimeZone).Year);
    }

    [Fact]
    public async Task GetYearSummariesForFieldAsync_GroupsByCalendarYear_AndRollsUp()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        _tasks.Setup(r => r.GetByFieldIdAndStatusAsync("field-1", "completed", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new TaskItem
                {
                    Id = "task-1",
                    FieldId = "field-1",
                    Title = "Pruning",
                    Status = WorkTaskStatus.Completed,
                    ActualEnd = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc),
                    Cost = 100m,
                    CreatedAt = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc)
                },
                new TaskItem
                {
                    Id = "task-2",
                    FieldId = "field-1",
                    Title = "Spray",
                    Status = WorkTaskStatus.Completed,
                    ActualEnd = new DateTime(2025, 11, 5, 0, 0, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2025, 11, 5, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2025, 11, 5, 0, 0, 0, DateTimeKind.Utc)
                }
            });

        _harvests.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new HarvestRecord
                {
                    Id = "h-1",
                    FieldId = "field-1",
                    Status = FinancialEntryStatus.Posted,
                    HarvestDate = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
                    OliveKg = 1000,
                    OilKg = 180,
                    CreatedAt = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            });

        var years = await _service.GetYearSummariesForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioSummaryQuery { Axis = ChronologioAxis.Calendar });

        Assert.Equal(2, years.Count);
        var y2026 = Assert.Single(years, y => y.Key == "2026");
        Assert.Equal(1, y2026.TaskCount);
        Assert.Equal(1, y2026.HarvestCount);
        Assert.Equal(1000, y2026.OliveKg);
        Assert.Equal(180, y2026.OilKg);
        Assert.Equal(18.0, y2026.OilYieldPercent);
        Assert.Equal(0m, y2026.ExpenseTotal);

        var y2025 = Assert.Single(years, y => y.Key == "2025");
        Assert.Equal(1, y2025.TaskCount);
    }

    [Fact]
    public async Task GetYearSummariesForFieldAsync_SeasonAxis_GroupsAcrossCalendarYears()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        _tasks.Setup(r => r.GetByFieldIdAndStatusAsync("field-1", "completed", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new TaskItem
                {
                    Id = "task-sep",
                    FieldId = "field-1",
                    Title = "Harvest prep",
                    Status = WorkTaskStatus.Completed,
                    ActualEnd = new DateTime(2025, 9, 15, 0, 0, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2025, 9, 15, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2025, 9, 15, 0, 0, 0, DateTimeKind.Utc)
                },
                new TaskItem
                {
                    Id = "task-feb",
                    FieldId = "field-1",
                    Title = "Pruning",
                    Status = WorkTaskStatus.Completed,
                    ActualEnd = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc)
                }
            });

        var years = await _service.GetYearSummariesForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioSummaryQuery { Axis = ChronologioAxis.Season });

        var season = Assert.Single(years);
        Assert.Equal("2025/2026", season.Key);
        Assert.Equal(2, season.TaskCount);
    }

    [Fact]
    public async Task GetMonthSummariesForFieldAsync_ReturnsTwelveMonths_WithHighlights()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        _tasks.Setup(r => r.GetByFieldIdAndStatusAsync("field-1", "completed", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new TaskItem
                {
                    Id = "task-1",
                    FieldId = "field-1",
                    Title = "Ψεκασμός",
                    Status = WorkTaskStatus.Completed,
                    ActualEnd = new DateTime(2026, 4, 12, 10, 0, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2026, 4, 12, 10, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 4, 12, 10, 0, 0, DateTimeKind.Utc)
                }
            });

        var months = await _service.GetMonthSummariesForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioSummaryQuery { Axis = ChronologioAxis.Calendar, PeriodYear = 2026 });

        Assert.Equal(12, months.Count);
        var apr = Assert.Single(months, m => m.Month == 4);
        Assert.Equal(1, apr.TaskCount);
        Assert.Contains("Ψεκασμός", apr.HighlightTitles);
    }

    [Fact]
    public async Task GetYearSummariesForFieldAsync_RespectsCategoryFilter()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        _tasks.Setup(r => r.GetByFieldIdAndStatusAsync("field-1", "completed", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new TaskItem
                {
                    Id = "task-1",
                    FieldId = "field-1",
                    Title = "Work",
                    Status = WorkTaskStatus.Completed,
                    ActualEnd = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            });

        _notes.Setup(r => r.GetByOwnerUserIdAsync("owner-1", "field-1", 200, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new Note
                {
                    Id = "note-1",
                    OwnerUserId = "owner-1",
                    FieldId = "field-1",
                    Body = "Observation",
                    OccurredAt = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc)
                }
            });

        var years = await _service.GetYearSummariesForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioSummaryQuery { Axis = ChronologioAxis.Calendar, Category = "note" });

        var y = Assert.Single(years);
        Assert.Equal(0, y.TaskCount);
        Assert.Equal(1, y.NoteCount);
    }

    [Fact]
    public async Task GetForFieldAsync_ExcludesWeatherPeriodReviewsFromJournal()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        _weatherReviews.Setup(r => r.GetByFieldIdsAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new Core.Entities.Geospatial.FieldWeatherPeriodReview
                {
                    Id = "field-1_month_202603",
                    FieldId = "field-1",
                    PeriodType = Core.Entities.Geospatial.WeatherPeriodTypes.Month,
                    Year = 2026,
                    Month = 3,
                    OccurredAt = new DateTime(2026, 3, 31, 12, 0, 0, DateTimeKind.Utc),
                    RainTotalMm = 68.5,
                    MinTemperatureC = 2,
                    MaxTemperatureC = 24,
                    FrostNights = 1,
                    RainSeries = new double[] { 0, 2, 5 },
                    RainLabels = new[] { "1", "2", "3" },
                    DayCount = 31,
                    WeatherProvider = "Open-Meteo",
                    SatelliteSource = "Sentinel-2",
                    CreatedAt = Nowish(),
                    UpdatedAt = Nowish()
                }
            });

        var entries = await _service.GetForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery());

        Assert.Empty(entries);
    }

    [Fact]
    public async Task GetForFieldAsync_IncludesWeatherWhenCategoryWeather()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        _weatherReviews.Setup(r => r.GetByFieldIdsAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new Core.Entities.Geospatial.FieldWeatherPeriodReview
                {
                    Id = "field-1_month_202603",
                    FieldId = "field-1",
                    PeriodType = Core.Entities.Geospatial.WeatherPeriodTypes.Month,
                    Year = 2026,
                    Month = 3,
                    OccurredAt = new DateTime(2026, 3, 31, 12, 0, 0, DateTimeKind.Utc),
                    RainTotalMm = 68.5,
                    MinTemperatureC = 2,
                    MaxTemperatureC = 24,
                    FrostNights = 1,
                    RainSeries = new double[] { 0, 2, 5 },
                    RainLabels = new[] { "1", "2", "3" },
                    DayCount = 31,
                    WeatherProvider = "Open-Meteo",
                    SatelliteSource = "Sentinel-2",
                    CreatedAt = Nowish(),
                    UpdatedAt = Nowish()
                }
            });

        var entries = await _service.GetForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery { Category = "weather" });

        var review = Assert.Single(entries);
        Assert.Equal("weather.monthReview", review.EventType);
        Assert.Equal("weather", review.Category);
    }

    [Fact]
    public async Task GetYearSummariesForFieldAsync_IncludesWeatherAggregates()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        _weatherReviews.Setup(r => r.GetByFieldIdsAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new Core.Entities.Geospatial.FieldWeatherPeriodReview
                {
                    Id = "field-1_year_2025",
                    FieldId = "field-1",
                    PeriodType = Core.Entities.Geospatial.WeatherPeriodTypes.Year,
                    Year = 2025,
                    OccurredAt = new DateTime(2025, 12, 31, 12, 0, 0, DateTimeKind.Utc),
                    RainTotalMm = 500,
                    HeatDays = 19,
                    DayCount = 365,
                    WeatherProvider = "Open-Meteo",
                    CreatedAt = Nowish(),
                    UpdatedAt = Nowish()
                }
            });

        var years = await _service.GetYearSummariesForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioSummaryQuery { Axis = ChronologioAxis.Calendar });

        var y = Assert.Single(years, x => x.PeriodYear == 2025);
        Assert.Equal(500, y.RainfallMm);
        Assert.Equal(19, y.HeatDays);
        Assert.Equal(0, y.TaskCount + y.ExpenseCount + y.HarvestCount + y.NoteCount);
    }

    private static DateTime Nowish() => new(2026, 3, 15, 12, 0, 0, DateTimeKind.Utc);

    private void AllowField(string fieldId, string name)
    {
        _access.Setup(a => a.CanUserAccessFieldAsync(fieldId, "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _fields.Setup(r => r.GetByIdAsync(fieldId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = fieldId, Name = name, OwnerId = "owner-1" });
    }

    private void SetupEmptySources(string fieldId)
    {
        _tasks.Setup(r => r.GetByFieldIdAndStatusAsync(fieldId, "completed", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<TaskItem>());
        _finance.Setup(r => r.GetByFieldIdAsync(fieldId, false, 200, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FinancialEntry>());
        _harvests.Setup(r => r.GetByFieldIdAsync(fieldId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<HarvestRecord>());
        _notes.Setup(r => r.GetByOwnerUserIdAsync("owner-1", fieldId, 200, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Note>());
        _activities.Setup(r => r.GetByFieldIdAsync(fieldId, 200, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Activity>());
        _weatherReviews.Setup(r => r.GetByFieldIdsAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Core.Entities.Geospatial.FieldWeatherPeriodReview>());
    }
}
