using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class FieldTaskServiceTests
{
    private readonly Mock<IFieldTaskRepository> _tasks = new();
    private readonly Mock<ITaskExecutionRepository> _executions = new();
    private readonly Mock<IFieldWorkTaskTemplateVersionRepository> _versions = new();
    private readonly Mock<IFieldWorkAuthorizationService> _auth = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly FieldTaskService _service;

    public FieldTaskServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 3, 18, 10, 0, 0, DateTimeKind.Utc));
        var weather = new Mock<IFieldTaskWeatherEvaluationService>();
        weather
            .Setup(w => w.EvaluateTaskAsync(It.IsAny<FieldTask>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskWeatherEvaluation?)null);
        _service = new FieldTaskService(
            _tasks.Object,
            _executions.Object,
            _versions.Object,
            _auth.Object,
            _clock.Object,
            weather.Object,
            Mock.Of<ITaskProposalEngine>());
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
        Assert.Equal("Προγραμματισμένη", dto.StatusLabel);
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
    public async Task Complete_CreatesExactlyOneTaskExecution()
    {
        var task = PlannedTask();
        _tasks.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _executions.Setup(r => r.CreateAsync(It.IsAny<TaskExecution>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskExecution e, CancellationToken _) =>
            {
                e.Id = "exec-1";
                return e;
            });
        _tasks.Setup(r => r.UpdateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask t, CancellationToken _) => t);

        var execution = await _service.CompleteAsync(
            task.Id,
            new CompleteFieldTaskDto { Outcome = "completed", Notes = "Ολοκληρώθηκε" },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("exec-1", execution.Id);
        Assert.Equal("completed", execution.Outcome);
        Assert.Equal(2026, execution.ResultYear);
        _executions.Verify(r => r.CreateAsync(It.IsAny<TaskExecution>(), It.IsAny<CancellationToken>()), Times.Once);
        _tasks.Verify(r => r.UpdateAsync(
            It.Is<FieldTask>(t => t.Status == FieldTaskStatus.Completed && t.LatestExecutionId == "exec-1"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Complete_Partial_CreatesFollowUpTask()
    {
        var task = PlannedTask();
        task.ChecklistSnapshot =
        [
            new FieldTaskChecklistItem { Key = "a", GreekLabel = "A", EnglishLabel = "A", IsEssential = true },
            new FieldTaskChecklistItem { Key = "b", GreekLabel = "B", EnglishLabel = "B", IsEssential = true }
        ];

        _tasks.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _tasks.Setup(r => r.CreateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask t, CancellationToken _) =>
            {
                t.Id = "follow-1";
                return t;
            });
        _executions.Setup(r => r.CreateAsync(It.IsAny<TaskExecution>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskExecution e, CancellationToken _) =>
            {
                e.Id = "exec-partial";
                return e;
            });
        _tasks.Setup(r => r.UpdateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask t, CancellationToken _) => t);

        var execution = await _service.CompleteAsync(
            task.Id,
            new CompleteFieldTaskDto
            {
                Outcome = "partially_completed",
                ChecklistAnswers = [new ChecklistAnswerDto { Key = "a", BoolValue = true }]
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.True(execution.FollowUpRequired);
        Assert.Equal("follow-1", execution.FollowUpTaskId);
        _tasks.Verify(r => r.CreateAsync(
            It.Is<FieldTask>(t =>
                t.ChecklistSnapshot.Count == 1
                && t.ChecklistSnapshot[0].Key == "b"
                && t.PlannedStart == task.PlannedStart),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UndoCompletion_ReopensTask_AndHidesExecutionFromTimeline()
    {
        var task = PlannedTask();
        task.Status = FieldTaskStatus.Completed;
        task.LatestExecutionId = "exec-1";
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

        Assert.Equal(FieldTaskStatus.InProgress.ToApiString(), restored.Status);
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
