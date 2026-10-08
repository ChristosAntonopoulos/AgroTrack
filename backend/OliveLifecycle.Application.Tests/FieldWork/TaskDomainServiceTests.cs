using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.FieldWork;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class TaskDomainServiceTests
{
    private readonly Mock<IFieldTaskRepository> _tasks = new();
    private readonly Mock<ITaskExecutionRepository> _workRecords = new();
    private readonly Mock<IFieldWorkTaskTemplateVersionRepository> _versions = new();
    private readonly Mock<IFieldWorkAuthorizationService> _auth = new();
    private readonly Mock<IFieldAccessScopeService> _fieldAccessScope = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly Mock<IUserNotificationService> _notifications = new();
    private readonly Mock<ITaskSuggestionDismissalRepository> _dismissals = new();
    private readonly TaskService _tasksService;
    private readonly WorkRecordService _workRecordsService;
    private readonly TaskSuggestionService _suggestions;

    public TaskDomainServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 3, 18, 10, 0, 0, DateTimeKind.Utc));
        _fieldAccessScope.Setup(s => s.ResolveAccessibleFieldIdsAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<string>());
        _notifications
            .Setup(n => n.NotifyAsync(It.IsAny<OliveLifecycle.Core.Entities.UserNotification>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _tasksService = new TaskService(
            _tasks.Object,
            _workRecords.Object,
            _versions.Object,
            _auth.Object,
            _fieldAccessScope.Object,
            _clock.Object,
            Mock.Of<IFieldStatusGuard>(),
            _notifications.Object);

        _workRecordsService = new WorkRecordService(
            _workRecords.Object,
            _tasks.Object,
            _auth.Object,
            _clock.Object,
            Mock.Of<IFieldStatusGuard>(),
            _tasksService);

        _suggestions = new TaskSuggestionService(
            _auth.Object,
            _dismissals.Object,
            _tasks.Object,
            _clock.Object);
    }

    [Fact]
    public async Task Create_OnlyCreatesTaskOnExplicitCall()
    {
        FieldTask? created = null;
        _tasks.Setup(r => r.CreateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask t, CancellationToken _) =>
            {
                t.Id = "task-1";
                created = t;
                return t;
            });

        var dto = await _tasksService.CreateAsync(
            new CreateTaskDto
            {
                FieldId = "field-1",
                Title = "Κλάδεμα καρποφορίας",
                TemplateCode = "T06",
                TimingBucket = "today"
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.NotNull(created);
        Assert.Equal("task-1", dto.Id);
        Assert.Equal("planned", dto.Status);
        Assert.Equal("template", dto.Source);
        Assert.Equal("T06", dto.TemplateCode);
        Assert.Equal("owner-1", dto.OwnerId);
        _tasks.Verify(r => r.CreateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Suggestions_AreNotCountedAsTasks()
    {
        _dismissals.Setup(r => r.GetByFieldAndYearAsync("field-1", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<TaskSuggestionDismissal>());
        _tasks.Setup(r => r.QueryAsync(It.IsAny<FieldTaskQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FieldTask>());

        var suggestions = await _suggestions.ListAsync("field-1", new DateTime(2026, 3, 18), "owner-1", Roles.FieldOwner);
        var tasks = await _tasksService.ListAsync("today", "field-1", "owner-1", Roles.FieldOwner);

        Assert.Empty(tasks);
        // Suggestions may be empty outside window; they must never appear in task list either way.
        Assert.DoesNotContain(suggestions, s => string.IsNullOrWhiteSpace(s.TemplateCode));
        Assert.All(suggestions, s => Assert.Contains(s.TemplateCode, CuratedTaskTemplates.Codes));
    }

    [Fact]
    public async Task Complete_DoesNotCreateWorkRecord()
    {
        var task = PlannedTask();
        _tasks.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _tasks.Setup(r => r.UpdateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask t, CancellationToken _) => t);

        var result = await _tasksService.CompleteAsync(task.Id, "owner-1", Roles.FieldOwner);

        Assert.Equal("done", result.Status);
        Assert.NotNull(result.CompletedAt);
        Assert.Null(result.LinkedWorkRecordId);
        _workRecords.Verify(r => r.CreateAsync(It.IsAny<TaskExecution>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task WorkRecord_CanLinkAndCompletePlannedTask()
    {
        var task = PlannedTask();
        _tasks.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _tasks.Setup(r => r.UpdateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask t, CancellationToken _) => t);
        _workRecords.Setup(r => r.CreateAsync(It.IsAny<TaskExecution>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskExecution e, CancellationToken _) =>
            {
                e.Id = "wr-1";
                return e;
            });
        _workRecords.Setup(r => r.GetByIdAsync("wr-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => new TaskExecution
            {
                Id = "wr-1",
                FieldId = "field-1",
                ResultYear = 2026,
                CompletedAt = _clock.Object.UtcNow,
                RecordedByUserId = "owner-1"
            });
        _workRecords.Setup(r => r.UpdateAsync(It.IsAny<TaskExecution>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskExecution e, CancellationToken _) => e);

        var record = await _workRecordsService.CreateAsync(
            new CreateWorkRecordDto
            {
                FieldId = "field-1",
                Title = "Κλάδεμα",
                LinkedTaskId = task.Id,
                OfferPlannedTaskMatch = false
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("wr-1", record.Id);
        Assert.Equal(task.Id, record.LinkedTaskId);
        Assert.Equal(FieldTaskStatus.Done, task.Status);
        Assert.Equal("wr-1", task.LinkedWorkRecordId);
    }

    [Fact]
    public async Task Templates_NeverBecomeTasksUntilScheduled()
    {
        _dismissals.Setup(r => r.GetByFieldAndYearAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<TaskSuggestionDismissal>());
        _tasks.Setup(r => r.QueryAsync(It.IsAny<FieldTaskQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FieldTask>());

        await _suggestions.ListAsync("field-1", new DateTime(2026, 3, 18), "owner-1", Roles.FieldOwner);

        _tasks.Verify(r => r.CreateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CrossAccount_AccessDenied()
    {
        _auth.Setup(a => a.EnsureCanCreateOrEditTaskAsync("field-x", "intruder", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ForbiddenException("denied"));

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _tasksService.CreateAsync(
                new CreateTaskDto { FieldId = "field-x", Title = "Hack" },
                "intruder",
                Roles.FieldOwner));
    }

    [Fact]
    public async Task Migration_PreservesData_AndRemovesOpenProposals()
    {
        var tasks = new List<FieldTask>
        {
            new()
            {
                Id = "t1",
                FieldId = "f1",
                Title = "Keep me",
                Status = FieldTaskStatus.Planned,
                CreatedByUserId = "owner-1",
                PlannedStart = new DateTime(2026, 3, 1)
            },
            new()
            {
                Id = "t2",
                FieldId = "f1",
                Title = "Done task",
                Status = FieldTaskStatus.Done,
                CreatedByUserId = "owner-1",
                LatestExecutionId = "e1"
            }
        };
        var executions = new List<TaskExecution>
        {
            new()
            {
                Id = "e1",
                TaskId = "t2",
                FieldId = "f1",
                ResultYear = 2026,
                CompletedAt = new DateTime(2026, 2, 1),
                RecordedByUserId = "owner-1"
            }
        };
        var proposals = new List<TaskProposal>
        {
            new()
            {
                Id = "p1",
                FieldId = "f1",
                TemplateCode = "T06",
                Status = TaskProposalStatus.Active,
                ResultYear = 2026
            }
        };

        var taskRepo = new Mock<IFieldTaskRepository>();
        var execRepo = new Mock<ITaskExecutionRepository>();
        var proposalRepo = new Mock<ITaskProposalRepository>();
        taskRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(tasks);
        execRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(executions);
        proposalRepo.Setup(r => r.QueryAsync(It.IsAny<TaskProposalQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(proposals);
        taskRepo.Setup(r => r.UpdateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask t, CancellationToken _) => t);
        execRepo.Setup(r => r.UpdateAsync(It.IsAny<TaskExecution>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskExecution e, CancellationToken _) => e);
        proposalRepo.Setup(r => r.DeleteAsync("p1", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var migrator = new TasksDomainMigrationService(
            taskRepo.Object,
            execRepo.Object,
            proposalRepo.Object,
            Mock.Of<Microsoft.Extensions.Logging.ILogger<TasksDomainMigrationService>>());

        var dry = await migrator.RunAsync(confirm: false);
        Assert.False(dry.Confirmed);
        Assert.Equal(1, dry.OpenProposalsDeleted);
        proposalRepo.Verify(r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);

        var confirmed = await migrator.RunAsync(confirm: true);
        Assert.True(confirmed.Confirmed);
        proposalRepo.Verify(r => r.DeleteAsync("p1", It.IsAny<CancellationToken>()), Times.Once);
        Assert.Equal("e1", tasks.First(t => t.Id == "t2").LinkedWorkRecordId);
        Assert.Equal("Keep me", tasks.First(t => t.Id == "t1").Title);
        Assert.Equal("owner-1", tasks.First(t => t.Id == "t1").OwnerId);
    }

    private static FieldTask PlannedTask() => new()
    {
        Id = "ft-1",
        FieldId = "field-1",
        ResultYear = 2026,
        Title = "Κλάδεμα",
        Status = FieldTaskStatus.Planned,
        PlannedStart = new DateTime(2026, 3, 18),
        ScheduledFor = new DateTime(2026, 3, 18),
        CreatedByUserId = "owner-1",
        OwnerId = "owner-1"
    };
}
