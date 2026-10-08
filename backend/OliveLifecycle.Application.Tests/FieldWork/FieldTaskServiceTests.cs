using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class FieldTaskServiceTests
{
    private readonly Mock<IFieldTaskRepository> _tasks = new();
    private readonly Mock<ITaskExecutionRepository> _executions = new();
    private readonly Mock<IFieldWorkTaskTemplateVersionRepository> _versions = new();
    private readonly Mock<IFieldAccessScopeService> _fieldAccessScope = new();
    private readonly Mock<IFieldWorkAuthorizationService> _auth = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly Mock<IUserNotificationService> _notifications = new();
    private readonly FieldTaskService _service;

    public FieldTaskServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 3, 18, 10, 0, 0, DateTimeKind.Utc));
        var weather = new Mock<IFieldTaskWeatherEvaluationService>();
        weather
            .Setup(w => w.EvaluateTaskAsync(It.IsAny<FieldTask>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskWeatherEvaluation?)null);
        _fieldAccessScope.Setup(s => s.ResolveAccessibleFieldIdsAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<string>());
        _notifications
            .Setup(n => n.NotifyAsync(It.IsAny<OliveLifecycle.Core.Entities.UserNotification>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _service = new FieldTaskService(
            _tasks.Object,
            _executions.Object,
            _versions.Object,
            _auth.Object,
            _fieldAccessScope.Object,
            _clock.Object,
            weather.Object,
            Mock.Of<ITaskProposalEngine>(),
            _notifications.Object,
            Mock.Of<IFieldStatusGuard>());
    }

    [Fact]
    public async Task Create_StoresEstimatedCost_WithoutTreatingAsFinancialTotal()
    {
        _tasks.Setup(r => r.CreateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask t, CancellationToken _) =>
            {
                t.Id = "ft-1";
                return t;
            });

        var dto = await _service.CreateAsync(
            new CreateFieldTaskDto
            {
                FieldId = "field-1",
                Title = "Κλάδεμα",
                PlannedStart = new DateTime(2026, 3, 18),
                EstimatedCost = 320m
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal(320m, dto.EstimatedCost);
        Assert.Equal(2026, dto.ResultYear);
        Assert.Equal("planned", dto.Status);
        Assert.Equal("Να γίνει", dto.StatusLabel);
    }

    [Fact]
    public async Task Create_JanuaryWithExplicitResultYear_KeepsHarvestYear()
    {
        _tasks.Setup(r => r.CreateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask t, CancellationToken _) =>
            {
                t.Id = "ft-jan";
                return t;
            });

        var dto = await _service.CreateAsync(
            new CreateFieldTaskDto
            {
                FieldId = "field-1",
                Title = "Συγκομιδή",
                PlannedStart = new DateTime(2027, 1, 5),
                ResultYear = 2026,
                RelatedHarvestId = "harvest-2026"
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal(2026, dto.ResultYear);
        Assert.Equal("harvest-2026", dto.RelatedHarvestId);
    }

    [Fact]
    public async Task Complete_MarksDone_WithoutCreatingWorkRecord()
    {
        var task = PlannedTask();
        _tasks.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _tasks.Setup(r => r.UpdateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask t, CancellationToken _) => t);

        var dto = await _service.CompleteAsync(
            task.Id,
            new CompleteFieldTaskDto { Outcome = "completed", Notes = "Ολοκληρώθηκε" },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("done", dto.Status);
        Assert.Equal("Έγινε", dto.StatusLabel);
        Assert.Equal(2026, dto.ResultYear);
        Assert.Null(dto.LatestExecutionId);
        _executions.Verify(r => r.CreateAsync(It.IsAny<TaskExecution>(), It.IsAny<CancellationToken>()), Times.Never);
        _tasks.Verify(r => r.CreateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()), Times.Never);
        _tasks.Verify(r => r.UpdateAsync(
            It.Is<FieldTask>(t =>
                t.Status == FieldTaskStatus.Done
                && t.CompletedByUserId == "owner-1"
                && t.CompletedAt.HasValue),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Complete_DoesNotCreateFollowUpOrExecution()
    {
        var task = PlannedTask();
        task.ChecklistSnapshot =
        [
            new FieldTaskChecklistItem { Key = "a", GreekLabel = "A", EnglishLabel = "A", IsEssential = true },
            new FieldTaskChecklistItem { Key = "b", GreekLabel = "B", EnglishLabel = "B", IsEssential = true }
        ];

        _tasks.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _tasks.Setup(r => r.UpdateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask t, CancellationToken _) => t);

        var dto = await _service.CompleteAsync(
            task.Id,
            new CompleteFieldTaskDto
            {
                Outcome = "partially_completed",
                CreateFollowUpForRemainder = true,
                ChecklistAnswers = [new ChecklistAnswerDto { Key = "a", BoolValue = true }]
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("done", dto.Status);
        Assert.Null(dto.LatestExecutionId);
        _tasks.Verify(r => r.CreateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()), Times.Never);
        _executions.Verify(r => r.CreateAsync(It.IsAny<TaskExecution>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Skip_AcceptsReason()
    {
        var task = PlannedTask();
        _tasks.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _tasks.Setup(r => r.UpdateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask t, CancellationToken _) => t);

        var dto = await _service.SkipAsync(task.Id, "weather", "owner-1", Roles.FieldOwner);

        Assert.Equal("skipped", dto.Status);
        _tasks.Verify(r => r.UpdateAsync(
            It.Is<FieldTask>(t =>
                t.Status == FieldTaskStatus.Skipped
                && t.SkippedReason == "weather"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Start_ThrowsLifecycleRemoved()
    {
        await Assert.ThrowsAsync<OliveLifecycle.Core.Exceptions.ValidationException>(() =>
            _service.StartAsync("ft-1", "owner-1", Roles.FieldOwner));
    }

    [Fact]
    public async Task UndoCompletion_ReopensTask_AndHidesExecutionFromTimeline()
    {
        var task = PlannedTask();
        task.Status = FieldTaskStatus.Done;
        task.LatestExecutionId = "exec-1";
        task.LinkedWorkRecordId = "exec-1";
        var execution = new TaskExecution
        {
            Id = "exec-1",
            TaskId = task.Id,
            FieldId = task.FieldId,
            ResultYear = task.ResultYear,
            CompletedAt = _clock.Object.UtcNow.AddMinutes(-10),
            PlannedStartSnapshot = task.PlannedStart,
            PlannedEndSnapshot = task.PlannedEnd,
            RecordedByUserId = "owner-1"
        };

        _executions.Setup(r => r.GetByIdAsync("exec-1", It.IsAny<CancellationToken>())).ReturnsAsync(execution);
        _executions.Setup(r => r.UpdateAsync(It.IsAny<TaskExecution>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskExecution e, CancellationToken _) => e);
        _tasks.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _tasks.Setup(r => r.UpdateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask t, CancellationToken _) => t);

        var restored = await _service.UndoCompletionAsync("exec-1", "owner-1", Roles.FieldOwner);

        Assert.Equal(FieldTaskStatus.Planned.ToApiString(), restored.Status);
        Assert.Null(restored.LatestExecutionId);
        Assert.NotNull(execution.UndoneAt);
        Assert.False(execution.IsActive);
    }

    [Fact]
    public async Task Reschedule_ChangesDateOnlyOnExplicitAction()
    {
        var task = PlannedTask();
        _tasks.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _tasks.Setup(r => r.UpdateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask t, CancellationToken _) => t);

        var updated = await _service.RescheduleAsync(
            task.Id,
            new RescheduleFieldTaskDto
            {
                PlannedStart = new DateTime(2026, 3, 22),
                PlannedEnd = new DateTime(2026, 3, 23)
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal(new DateTime(2026, 3, 22), updated.PlannedStart);
        Assert.Equal(2026, updated.ResultYear);
    }

    [Fact]
    public async Task Assign_StoresCollaboratorWithoutGrantingFinancialAccess()
    {
        var task = PlannedTask();
        _tasks.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _tasks.Setup(r => r.UpdateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask t, CancellationToken _) => t);

        var updated = await _service.AssignAsync(
            task.Id,
            new AssignFieldTaskDto
            {
                AssignedCollaboratorId = "contact-1",
                AssignedUserId = null
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("contact-1", updated.AssignedCollaboratorId);
        Assert.Null(updated.AssignedUserId);
    }

    [Fact]
    public async Task Assign_NotifiesAssignedUser()
    {
        var task = PlannedTask();
        _tasks.Setup(r => r.GetByIdAsync("ft-1", It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _tasks.Setup(r => r.UpdateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask t, CancellationToken _) => t);

        await _service.AssignAsync(
            "ft-1",
            new AssignFieldTaskDto { AssignedUserId = "worker-1" },
            "owner-1",
            Roles.FieldOwner);

        _notifications.Verify(
            n => n.NotifyAsync(
                It.Is<OliveLifecycle.Core.Entities.UserNotification>(x =>
                    x.UserId == "worker-1"
                    && x.Type == "task_assigned"
                    && x.RelatedEntityId == "ft-1"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task List_WithoutFieldId_UsesScopeSubset()
    {
        _fieldAccessScope.Setup(s => s.ResolveAccessibleFieldIdsAsync(
                "partner-1", Roles.Producer, FamilyModules.Tasks, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<string> { "field-a", "field-b" });

        _tasks.Setup(r => r.QueryAsync(
                It.Is<FieldTaskQuery>(q =>
                    q.FieldId == null
                    && q.FieldIds != null
                    && q.FieldIds.Count == 2
                    && q.FieldIds.Contains("field-a")
                    && q.FieldIds.Contains("field-b")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new FieldTask
                {
                    Id = "t-a",
                    FieldId = "field-a",
                    Title = "A",
                    Status = FieldTaskStatus.Planned,
                    PlannedStart = new DateTime(2026, 3, 18),
                    ResultYear = 2026
                },
                new FieldTask
                {
                    Id = "t-b",
                    FieldId = "field-b",
                    Title = "B",
                    Status = FieldTaskStatus.Planned,
                    PlannedStart = new DateTime(2026, 3, 19),
                    ResultYear = 2026
                }
            });

        var list = await _service.ListAsync(null, null, null, "partner-1", Roles.Producer);

        Assert.Equal(2, list.Count);
        Assert.Contains(list, t => t.Id == "t-a");
        Assert.Contains(list, t => t.Id == "t-b");
    }

    [Fact]
    public async Task List_WithoutFieldId_EmptyScope_ReturnsEmpty()
    {
        _fieldAccessScope.Setup(s => s.ResolveAccessibleFieldIdsAsync(
                "partner-1", Roles.Producer, FamilyModules.Tasks, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<string>());

        var list = await _service.ListAsync(null, null, null, "partner-1", Roles.Producer);

        Assert.Empty(list);
        _tasks.Verify(
            r => r.QueryAsync(It.IsAny<FieldTaskQuery>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    private static FieldTask PlannedTask() => new()
    {
        Id = "ft-1",
        FieldId = "field-1",
        ResultYear = 2026,
        Title = "Κλάδεμα",
        Status = FieldTaskStatus.Planned,
        PlannedStart = new DateTime(2026, 3, 18),
        CreatedByUserId = "owner-1"
    };
}
