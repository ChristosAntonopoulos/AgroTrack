using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Chronologio;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class ChronologioServiceTests
{
    private readonly Mock<IFieldAccessService> _access = new();
    private readonly Mock<IFieldService> _fieldService = new();
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<ITaskExecutionRepository> _executions = new();
    private readonly Mock<IFieldTaskRepository> _fieldTasks = new();
    private readonly Mock<IFinancialTransactionRepository> _finance = new();
    private readonly Mock<IHarvestRecordRepository> _harvests = new();
    private readonly Mock<INoteRepository> _notes = new();
    private readonly Mock<IActivityRepository> _activities = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IMediaAttachmentRepository> _media = new();
    private readonly Mock<IFieldWeatherPeriodReviewRepository> _weatherReviews = new();
    private readonly Mock<IGeospatialStorageService> _storage = new();
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
            _executions.Object,
            _fieldTasks.Object,
            _finance.Object,
            _harvests.Object,
            _notes.Object,
            _activities.Object,
            _users.Object,
            _media.Object,
            _weatherReviews.Object,
            _storage.Object,
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

        SetupActiveExecution(
            "field-1",
            new TaskExecution
            {
                Id = "exec-1",
                TaskId = "task-1",
                FieldId = "field-1",
                Outcome = TaskExecutionOutcome.Completed,
                CompletedAt = new DateTime(2026, 9, 12, 10, 0, 0, DateTimeKind.Utc),
                RecordedByUserId = "giorgos",
                CreatedAt = new DateTime(2026, 9, 13, 8, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 9, 13, 8, 0, 0, DateTimeKind.Utc),
                ResultYear = 2026
            },
            new FieldTask
            {
                Id = "task-1",
                FieldId = "field-1",
                Title = "Ψεκασμός",
                TemplateCode = "spraying",
                Status = FieldTaskStatus.Completed,
                AssignedUserId = "giorgos",
                CreatedAt = new DateTime(2026, 9, 13, 8, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 9, 13, 8, 0, 0, DateTimeKind.Utc)
            });

        var entries = await _service.GetForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery());

        var task = Assert.Single(entries, e => e.SourceType == ChronologioSourceTypes.TaskExecution);
        Assert.Equal("TaskExecution:exec-1", task.Id);
        Assert.Equal("exec-1", task.SourceId);
        Assert.Equal(new DateTime(2026, 9, 12, 10, 0, 0, DateTimeKind.Utc), task.OccurredAt);
        Assert.Equal(ChronologioEventTypes.TaskCompleted, task.EventType);
        Assert.Equal("Ψεκασμός", task.Title);
        Assert.Null(task.Amount);
        Assert.Equal("Γιώργος Παπαδόπουλος", task.Actor?.DisplayName);
        Assert.Equal("giorgos", task.Actor?.UserId);
        Assert.Equal("exec-1", task.Details.Task!.ExecutionId);
        Assert.Equal("task-1", task.Details.Task.TaskId);
        Assert.Equal("completed", task.Details.Task.Outcome);
        Assert.DoesNotContain(entries, e => e.Title.Contains("pending", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task GetForFieldAsync_SkipsUndoneExecutions()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        _executions.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new TaskExecution
                {
                    Id = "exec-undone",
                    TaskId = "task-1",
                    FieldId = "field-1",
                    Outcome = TaskExecutionOutcome.Completed,
                    CompletedAt = new DateTime(2026, 9, 12, 10, 0, 0, DateTimeKind.Utc),
                    UndoneAt = new DateTime(2026, 9, 13, 9, 0, 0, DateTimeKind.Utc),
                    UndoneByUserId = "owner-1",
                    RecordedByUserId = "giorgos",
                    CreatedAt = new DateTime(2026, 9, 12, 10, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 9, 13, 9, 0, 0, DateTimeKind.Utc)
                }
            });

        _fieldTasks.Setup(r => r.GetByIdAsync("task-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FieldTask
            {
                Id = "task-1",
                FieldId = "field-1",
                Title = "Ψεκασμός",
                Status = FieldTaskStatus.Completed
            });

        var entries = await _service.GetForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery());

        Assert.DoesNotContain(entries, e => e.SourceType == ChronologioSourceTypes.TaskExecution);
        Assert.DoesNotContain(entries, e => e.SourceId == "exec-undone");
    }

    [Fact]
    public async Task GetForFieldAsync_ShowsPostedTaskLinkedMoneyWithRelatedTask()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        SetupActiveExecution(
            "field-1",
            new TaskExecution
            {
                Id = "exec-1",
                TaskId = "task-1",
                FieldId = "field-1",
                Outcome = TaskExecutionOutcome.Completed,
                CompletedAt = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc),
                RecordedByUserId = "owner-1",
                CreatedAt = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc)
            },
            new FieldTask
            {
                Id = "task-1",
                FieldId = "field-1",
                Title = "Λίπανση φθινοπώρου",
                Status = FieldTaskStatus.Completed,
                CreatedAt = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc)
            });

        _finance.Setup(r => r.GetPostedByFieldIdsAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                PostedMoney(
                    "exp-linked",
                    180m,
                    new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc),
                    relatedTaskId: "task-1",
                    description: "Λίπασμα για το Κτήμα Φιλιατρών",
                    category: FinancialTransactionCategory.Fertilizers),
                PostedMoney(
                    "exp-standalone",
                    50m,
                    new DateTime(2026, 9, 11, 0, 0, 0, DateTimeKind.Utc),
                    description: "Fuel",
                    category: FinancialTransactionCategory.FuelAndEnergy)
            });

        var entries = await _service.GetForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery());

        Assert.DoesNotContain(entries, e => e.SourceId == "exp-linked");
        var standalone = Assert.Single(entries, e => e.SourceId == "exp-standalone");
        Assert.Equal(ChronologioSourceTypes.Expense, standalone.SourceType);
        Assert.Equal("Καύσιμα και ενέργεια", standalone.Details.Expense!.ExpenseCategoryLabel);
        var task = Assert.Single(entries, e => e.SourceType == ChronologioSourceTypes.TaskExecution);
        Assert.Equal("exec-1", task.SourceId);
        Assert.NotNull(task.Amount);
        Assert.Equal(180m, task.Amount!.Value);
        Assert.Equal("task-1", task.Details.Expense!.LinkedTaskId);
        Assert.Equal("Λίπανση φθινοπώρου", task.Details.Expense.RelatedTaskTitle);
        Assert.Equal("Λιπάσματα", task.Details.Expense.ExpenseCategoryLabel);
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

        _finance.Setup(r => r.GetPostedByFieldIdsAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                PostedMoney(
                    "mill-cost",
                    180m,
                    new DateTime(2026, 11, 18, 0, 0, 0, DateTimeKind.Utc),
                    relatedHarvestId: "harvest-1",
                    description: "Mill cost",
                    category: FinancialTransactionCategory.Mill),
                PostedMoney(
                    "sale",
                    2400m,
                    new DateTime(2026, 11, 18, 0, 0, 0, DateTimeKind.Utc),
                    type: FinancialTransactionType.Income,
                    relatedHarvestId: "harvest-1",
                    description: "Oil sale",
                    category: FinancialTransactionCategory.OliveOilSale)
            });

        var entries = await _service.GetForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery());

        var mill = Assert.Single(entries, e => e.SourceId == "mill-cost");
        Assert.Equal("harvest-1", mill.Details.Expense!.LinkedHarvestId);
        var sale = Assert.Single(entries, e => e.SourceId == "sale");
        Assert.Equal(ChronologioSourceTypes.Income, sale.SourceType);
        Assert.Equal(ChronologioCategory.Income.ToApiString(), sale.Category);
        Assert.DoesNotContain(entries, e => e.SourceId == "sale" && e.Category == ChronologioCategory.Expense.ToApiString());
        var harvest = Assert.Single(entries, e => e.SourceType == ChronologioSourceTypes.Harvest);
        Assert.Equal(ChronologioImportance.Positive.ToApiString(), harvest.Importance);
        Assert.Equal(4820, harvest.Details.Harvest!.OliveKg);
        Assert.Equal(735, harvest.Details.Harvest.OilKg);
        Assert.Equal(15.2, harvest.Details.Harvest.OilYieldPercent);
        Assert.Equal("Local mill", harvest.Details.Harvest.Mill);
        Assert.Equal(new DateTime(2026, 11, 18, 0, 0, 0, DateTimeKind.Utc), harvest.OccurredAt);
        Assert.Equal(2026, harvest.ResultYear);
        Assert.Equal("2026", harvest.LifecycleYear);
        Assert.Contains("4820", harvest.Summary);
        Assert.Contains("ελιές", harvest.Summary);
        Assert.DoesNotContain("olives", harvest.Summary);
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
        Assert.Equal("Παρατήρηση", note.Title);
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
        Assert.Equal("Άνθιση", life.Details.Lifecycle!.NewStage);
    }

    [Fact]
    public async Task GetForFieldAsync_SortsByOccurredAtDescending_NotCreatedAt()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        SetupActiveExecution(
            "field-1",
            new TaskExecution
            {
                Id = "exec-old-work",
                TaskId = "task-old-work",
                FieldId = "field-1",
                Outcome = TaskExecutionOutcome.Completed,
                CompletedAt = new DateTime(2026, 9, 7, 0, 0, 0, DateTimeKind.Utc),
                RecordedByUserId = "owner-1",
                CreatedAt = new DateTime(2026, 9, 8, 18, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 9, 8, 18, 0, 0, DateTimeKind.Utc)
            },
            new FieldTask
            {
                Id = "task-old-work",
                FieldId = "field-1",
                Title = "Yesterday spraying",
                Status = FieldTaskStatus.Completed,
                CreatedAt = new DateTime(2026, 9, 8, 18, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 9, 8, 18, 0, 0, DateTimeKind.Utc)
            });

        _finance.Setup(r => r.GetPostedByFieldIdsAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                PostedMoney(
                    "exp-today",
                    10m,
                    new DateTime(2026, 9, 8, 0, 0, 0, DateTimeKind.Utc),
                    description: "Today expense")
            });

        var entries = await _service.GetForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery());

        Assert.Equal(2, entries.Count);
        Assert.Equal("exp-today", entries[0].SourceId);
        Assert.Equal("exec-old-work", entries[1].SourceId);
    }

    [Fact]
    public async Task GetForUserAsync_ExcludesDraftFields()
    {
        _fieldService.Setup(s => s.GetFieldsForUserAsync("owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new FieldDto { Id = "draft-1", Name = "Draft grove", OwnerId = "owner-1", Status = "Draft" }
            });

        var entries = await _service.GetForUserAsync(
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery());

        Assert.Empty(entries);
        _executions.Verify(
            r => r.GetByFieldIdsAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task GetYearSummariesForFieldAsync_AgriculturalAxis_KeepsJanuaryHarvestInResultYear()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        _harvests.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new HarvestRecord
                {
                    Id = "harvest-jan",
                    FieldId = "field-1",
                    HarvestDate = new DateTime(2027, 1, 12, 0, 0, 0, DateTimeKind.Utc),
                    ResultYear = 2026,
                    OliveKg = 1200,
                    Status = FinancialEntryStatus.Posted,
                    CreatedAt = new DateTime(2027, 1, 12, 0, 0, 0, DateTimeKind.Utc)
                }
            });

        var years = await _service.GetYearSummariesForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioSummaryQuery { Axis = ChronologioAxis.Agricultural });

        var y2026 = Assert.Single(years, y => y.PeriodYear == 2026);
        Assert.Equal(1, y2026.HarvestCount);
        Assert.Equal(1200, y2026.OliveKg);
        Assert.DoesNotContain(years, y => y.PeriodYear == 2027 && y.HarvestCount > 0);
    }

    [Fact]
    public async Task GetForUserAsync_IncludesFieldName()
    {
        _fieldService.Setup(s => s.GetFieldsForUserAsync("owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new FieldDto { Id = "field-1", Name = "Κτήμα Καρύστου", OwnerId = "owner-1" }
            });

        SetupActiveExecution(
            "field-1",
            new TaskExecution
            {
                Id = "exec-1",
                TaskId = "task-1",
                FieldId = "field-1",
                Outcome = TaskExecutionOutcome.Completed,
                CompletedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc),
                RecordedByUserId = "owner-1",
                CreatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new FieldTask
            {
                Id = "task-1",
                FieldId = "field-1",
                Title = "Irrigation",
                Status = FieldTaskStatus.Completed,
                CreatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
            });
        _finance.Setup(r => r.GetPostedByFieldIdsAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FinancialTransaction>());
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

        SetupActiveExecutions(
            "field-1",
            new[]
            {
                new TaskExecution
                {
                    Id = "exec-1",
                    TaskId = "task-1",
                    FieldId = "field-1",
                    Outcome = TaskExecutionOutcome.Completed,
                    CompletedAt = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc),
                    RecordedByUserId = "owner-1",
                    CreatedAt = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc)
                },
                new TaskExecution
                {
                    Id = "exec-2",
                    TaskId = "task-2",
                    FieldId = "field-1",
                    Outcome = TaskExecutionOutcome.Completed,
                    CompletedAt = new DateTime(2025, 11, 5, 0, 0, 0, DateTimeKind.Utc),
                    RecordedByUserId = "owner-1",
                    CreatedAt = new DateTime(2025, 11, 5, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2025, 11, 5, 0, 0, 0, DateTimeKind.Utc)
                }
            },
            new[]
            {
                new FieldTask
                {
                    Id = "task-1",
                    FieldId = "field-1",
                    Title = "Pruning",
                    Status = FieldTaskStatus.Completed,
                    CreatedAt = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc)
                },
                new FieldTask
                {
                    Id = "task-2",
                    FieldId = "field-1",
                    Title = "Spray",
                    Status = FieldTaskStatus.Completed,
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

        SetupActiveExecutions(
            "field-1",
            new[]
            {
                new TaskExecution
                {
                    Id = "exec-sep",
                    TaskId = "task-sep",
                    FieldId = "field-1",
                    Outcome = TaskExecutionOutcome.Completed,
                    CompletedAt = new DateTime(2025, 9, 15, 0, 0, 0, DateTimeKind.Utc),
                    RecordedByUserId = "owner-1",
                    CreatedAt = new DateTime(2025, 9, 15, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2025, 9, 15, 0, 0, 0, DateTimeKind.Utc)
                },
                new TaskExecution
                {
                    Id = "exec-feb",
                    TaskId = "task-feb",
                    FieldId = "field-1",
                    Outcome = TaskExecutionOutcome.Completed,
                    CompletedAt = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc),
                    RecordedByUserId = "owner-1",
                    CreatedAt = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc)
                }
            },
            new[]
            {
                new FieldTask
                {
                    Id = "task-sep",
                    FieldId = "field-1",
                    Title = "Harvest prep",
                    Status = FieldTaskStatus.Completed,
                    CreatedAt = new DateTime(2025, 9, 15, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2025, 9, 15, 0, 0, 0, DateTimeKind.Utc)
                },
                new FieldTask
                {
                    Id = "task-feb",
                    FieldId = "field-1",
                    Title = "Pruning",
                    Status = FieldTaskStatus.Completed,
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

        SetupActiveExecution(
            "field-1",
            new TaskExecution
            {
                Id = "exec-1",
                TaskId = "task-1",
                FieldId = "field-1",
                Outcome = TaskExecutionOutcome.Completed,
                CompletedAt = new DateTime(2026, 4, 12, 10, 0, 0, DateTimeKind.Utc),
                RecordedByUserId = "owner-1",
                CreatedAt = new DateTime(2026, 4, 12, 10, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 4, 12, 10, 0, 0, DateTimeKind.Utc)
            },
            new FieldTask
            {
                Id = "task-1",
                FieldId = "field-1",
                Title = "Ψεκασμός",
                Status = FieldTaskStatus.Completed,
                CreatedAt = new DateTime(2026, 4, 12, 10, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 4, 12, 10, 0, 0, DateTimeKind.Utc)
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

        SetupActiveExecution(
            "field-1",
            new TaskExecution
            {
                Id = "exec-1",
                TaskId = "task-1",
                FieldId = "field-1",
                Outcome = TaskExecutionOutcome.Completed,
                CompletedAt = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
                RecordedByUserId = "owner-1",
                CreatedAt = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new FieldTask
            {
                Id = "task-1",
                FieldId = "field-1",
                Title = "Work",
                Status = FieldTaskStatus.Completed,
                CreatedAt = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc)
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
    public async Task GetForFieldAsync_DeduplicatesIdenticalNotes()
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
                    Body = "Εντοπίστηκαν σημάδια δάκου.",
                    OccurredAt = new DateTime(2026, 9, 8, 18, 40, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2026, 9, 8, 18, 40, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 9, 8, 18, 40, 0, DateTimeKind.Utc)
                },
                new Note
                {
                    Id = "note-1-copy",
                    OwnerUserId = "owner-1",
                    FieldId = "field-1",
                    Body = "Εντοπίστηκαν σημάδια δάκου.",
                    OccurredAt = new DateTime(2026, 9, 8, 18, 40, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2026, 9, 8, 18, 41, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 9, 8, 18, 41, 0, DateTimeKind.Utc)
                }
            });

        var entries = await _service.GetForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery());

        Assert.Single(entries, e => e.SourceType == ChronologioSourceTypes.Note);
    }

    [Fact]
    public async Task GetForFieldAsync_CompletingOneTask_CreatesExactlyOneEvent()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        SetupActiveExecutions(
            "field-1",
            new[]
            {
                new TaskExecution
                {
                    Id = "exec-old",
                    TaskId = "task-1",
                    FieldId = "field-1",
                    Outcome = TaskExecutionOutcome.Completed,
                    CompletedAt = new DateTime(2026, 9, 10, 8, 0, 0, DateTimeKind.Utc),
                    RecordedByUserId = "giorgos",
                    CreatedAt = new DateTime(2026, 9, 10, 8, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 9, 10, 8, 0, 0, DateTimeKind.Utc)
                },
                new TaskExecution
                {
                    Id = "exec-new",
                    TaskId = "task-1",
                    FieldId = "field-1",
                    Outcome = TaskExecutionOutcome.Completed,
                    CompletedAt = new DateTime(2026, 9, 10, 10, 0, 0, DateTimeKind.Utc),
                    RecordedByUserId = "giorgos",
                    CreatedAt = new DateTime(2026, 9, 10, 10, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 9, 10, 10, 0, 0, DateTimeKind.Utc)
                }
            },
            new[]
            {
                new FieldTask
                {
                    Id = "task-1",
                    FieldId = "field-1",
                    Title = "Παρατήρηση",
                    TemplateCode = "observation",
                    Status = FieldTaskStatus.Completed,
                    CreatedAt = new DateTime(2026, 9, 10, 8, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 9, 10, 10, 0, 0, DateTimeKind.Utc)
                }
            });

        var entries = await _service.GetForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery());

        var task = Assert.Single(entries);
        Assert.Equal("exec-new", task.SourceId);
        Assert.Equal("Παρατήρηση", task.Title);
    }

    [Fact]
    public async Task GetForFieldAsync_ExpenseFilter_KeepsTaskLinkedMoney()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        SetupActiveExecution(
            "field-1",
            new TaskExecution
            {
                Id = "exec-1",
                TaskId = "task-1",
                FieldId = "field-1",
                Outcome = TaskExecutionOutcome.Completed,
                CompletedAt = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc),
                RecordedByUserId = "owner-1",
                CreatedAt = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc)
            },
            new FieldTask
            {
                Id = "task-1",
                FieldId = "field-1",
                Title = "Λίπανση φθινοπώρου",
                Status = FieldTaskStatus.Completed,
                CreatedAt = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc)
            });

        _finance.Setup(r => r.GetPostedByFieldIdsAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                PostedMoney(
                    "exp-linked",
                    180m,
                    new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc),
                    relatedTaskId: "task-1",
                    description: "Λίπασμα",
                    category: FinancialTransactionCategory.Fertilizers)
            });

        var entries = await _service.GetForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery { Category = "expense" });

        var linked = Assert.Single(entries);
        Assert.Equal("exp-linked", linked.SourceId);
        Assert.Equal("Λιπάσματα", linked.Details.Expense!.ExpenseCategoryLabel);
    }

    [Fact]
    public async Task GetMonthSummariesForFieldAsync_UsesDeduplicatedCollection()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        SetupActiveExecution(
            "field-1",
            new TaskExecution
            {
                Id = "exec-1",
                TaskId = "task-1",
                FieldId = "field-1",
                Outcome = TaskExecutionOutcome.Completed,
                CompletedAt = new DateTime(2026, 4, 12, 10, 0, 0, DateTimeKind.Utc),
                RecordedByUserId = "owner-1",
                CreatedAt = new DateTime(2026, 4, 12, 10, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 4, 12, 10, 0, 0, DateTimeKind.Utc)
            },
            new FieldTask
            {
                Id = "task-1",
                FieldId = "field-1",
                Title = "Ψεκασμός",
                Status = FieldTaskStatus.Completed,
                CreatedAt = new DateTime(2026, 4, 12, 10, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 4, 12, 10, 0, 0, DateTimeKind.Utc)
            });

        _finance.Setup(r => r.GetPostedByFieldIdsAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                PostedMoney(
                    "exp-linked",
                    42m,
                    new DateTime(2026, 4, 12, 10, 0, 0, DateTimeKind.Utc),
                    relatedTaskId: "task-1",
                    category: FinancialTransactionCategory.PlantProtection)
            });

        _notes.Setup(r => r.GetByOwnerUserIdAsync("owner-1", "field-1", 200, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new Note
                {
                    Id = "note-1",
                    OwnerUserId = "owner-1",
                    FieldId = "field-1",
                    Body = "Δάκος στη βόρεια πλευρά.",
                    OccurredAt = new DateTime(2026, 4, 12, 16, 0, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2026, 4, 12, 16, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 4, 12, 16, 0, 0, DateTimeKind.Utc)
                },
                new Note
                {
                    Id = "note-1b",
                    OwnerUserId = "owner-1",
                    FieldId = "field-1",
                    Body = "Δάκος στη βόρεια πλευρά.",
                    OccurredAt = new DateTime(2026, 4, 12, 16, 0, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2026, 4, 12, 16, 5, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 4, 12, 16, 5, 0, DateTimeKind.Utc)
                }
            });

        var months = await _service.GetMonthSummariesForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioSummaryQuery { Axis = ChronologioAxis.Calendar, PeriodYear = 2026 });

        var apr = Assert.Single(months, m => m.Month == 4);
        Assert.Equal(1, apr.TaskCount);
        Assert.Equal(0, apr.ExpenseCount);
        Assert.Equal(1, apr.NoteCount);
        Assert.Equal(42m, apr.ExpenseTotal);
    }

    [Fact]
    public async Task GetForFieldAsync_IncludesMonthWeatherReviewsInJournal()
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
                },
                new Core.Entities.Geospatial.FieldWeatherPeriodReview
                {
                    Id = "field-1_year_2025",
                    FieldId = "field-1",
                    PeriodType = Core.Entities.Geospatial.WeatherPeriodTypes.Year,
                    Year = 2025,
                    OccurredAt = new DateTime(2025, 12, 31, 12, 0, 0, DateTimeKind.Utc),
                    RainTotalMm = 500,
                    DayCount = 365,
                    WeatherProvider = "Open-Meteo",
                    CreatedAt = Nowish(),
                    UpdatedAt = Nowish()
                }
            });

        var entries = await _service.GetForFieldAsync(
            "field-1",
            "owner-1",
            Roles.FieldOwner,
            new ChronologioQuery());

        var review = Assert.Single(entries);
        Assert.Equal("weather.monthReview", review.EventType);
        Assert.Equal("weather", review.Category);
    }

    [Fact]
    public async Task GetForFieldAsync_ExcludesFutureMonthWeatherReviewsFromJournal()
    {
        AllowField("field-1", "Grove A");
        SetupEmptySources("field-1");

        var futureMonthEnd = DateTime.UtcNow.Date.AddMonths(1);
        var lastDay = DateTime.DaysInMonth(futureMonthEnd.Year, futureMonthEnd.Month);

        _weatherReviews.Setup(r => r.GetByFieldIdsAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new Core.Entities.Geospatial.FieldWeatherPeriodReview
                {
                    Id = $"field-1_month_{futureMonthEnd:yyyyMM}",
                    FieldId = "field-1",
                    PeriodType = Core.Entities.Geospatial.WeatherPeriodTypes.Month,
                    Year = futureMonthEnd.Year,
                    Month = futureMonthEnd.Month,
                    OccurredAt = new DateTime(futureMonthEnd.Year, futureMonthEnd.Month, lastDay, 12, 0, 0, DateTimeKind.Utc),
                    RainTotalMm = 12,
                    DayCount = 10,
                    WeatherProvider = "Open-Meteo",
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

    private static FinancialTransaction PostedMoney(
        string id,
        decimal amount,
        DateTime occurredOn,
        FinancialTransactionType type = FinancialTransactionType.Expense,
        string? relatedTaskId = null,
        string? relatedHarvestId = null,
        string description = "",
        FinancialTransactionCategory? category = null) =>
        new()
        {
            Id = id,
            OwnerUserId = "owner-1",
            FieldId = "field-1",
            Type = type,
            Status = FinancialTransactionStatus.Posted,
            Amount = amount,
            Currency = "EUR",
            Description = description,
            Category = category,
            RelatedTaskId = relatedTaskId,
            RelatedHarvestId = relatedHarvestId,
            OccurredOn = occurredOn,
            ResultYear = occurredOn.Year,
            CreatedByUserId = "maria",
            CreatedAt = occurredOn,
            UpdatedAt = occurredOn,
            PostedAt = occurredOn
        };

    private void AllowField(string fieldId, string name)
    {
        _access.Setup(a => a.CanUserAccessFieldAsync(fieldId, "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _fields.Setup(r => r.GetByIdAsync(fieldId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = fieldId, Name = name, OwnerId = "owner-1" });
    }

    private void SetupEmptySources(string fieldId)
    {
        _executions.Setup(r => r.GetByFieldIdAsync(fieldId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<TaskExecution>());
        _finance.Setup(r => r.GetPostedByFieldIdsAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FinancialTransaction>());
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

    private void SetupActiveExecution(string fieldId, TaskExecution execution, FieldTask fieldTask)
        => SetupActiveExecutions(fieldId, new[] { execution }, new[] { fieldTask });

    private void SetupActiveExecutions(
        string fieldId,
        IReadOnlyList<TaskExecution> executions,
        IReadOnlyList<FieldTask> fieldTasks)
    {
        _executions.Setup(r => r.GetByFieldIdAsync(fieldId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(executions);

        foreach (var task in fieldTasks)
        {
            _fieldTasks.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(task);
        }
    }
}
