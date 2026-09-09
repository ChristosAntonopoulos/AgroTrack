using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Task;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class TaskHarvestPhaseTests
{
    private readonly Mock<ITaskRepository> _tasks = new();
    private readonly Mock<ITaskTemplateRepository> _templates = new();
    private readonly Mock<IFieldAccessService> _access = new();
    private readonly Mock<ILifecycleService> _lifecycle = new();
    private readonly Mock<IActivityService> _activities = new();
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFamilyMemberRepository> _familyMembers = new();
    private readonly Mock<IGeospatialJobQueue> _jobs = new();
    private readonly Mock<IFinancialEntryService> _finance = new();
    private readonly Mock<IMediaAttachmentService> _media = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly TaskService _service;

    public TaskHarvestPhaseTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 9, 7, 12, 0, 0, DateTimeKind.Utc));
        _familyMembers.Setup(r => r.GetActiveByLinkedUserIdAllAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FamilyMember>());
        _service = new TaskService(
            _tasks.Object,
            _templates.Object,
            _access.Object,
            _lifecycle.Object,
            _activities.Object,
            _fields.Object,
            _familyMembers.Object,
            _jobs.Object,
            _finance.Object,
            _media.Object,
            _clock.Object,
            NullLogger<TaskService>.Instance);
    }

    [Fact]
    public async Task CreateTaskAsync_CopiesHarvestPhaseFromTemplate()
    {
        AllowCreate("field-1", "owner-1");
        _templates.Setup(r => r.GetByIdAsync("tpl-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskTemplate
            {
                Id = "tpl-1",
                Type = "harvest_ready_nets",
                Title = "Ready nets and crates",
                HarvestPhase = HarvestPhase.Prepare
            });
        _tasks.Setup(r => r.CreateAsync(It.IsAny<TaskItem>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskItem item, CancellationToken _) =>
            {
                item.Id = "task-1";
                return item;
            });

        var result = await _service.CreateTaskAsync(
            new CreateTaskDto
            {
                FieldId = "field-1",
                TemplateId = "tpl-1",
                Type = "harvest_ready_nets",
                Title = "Ready nets and crates"
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("prepare", result.HarvestPhase);
    }

    [Fact]
    public async Task CreateTaskAsync_InfersDailyPhaseFromOliveHarvestType()
    {
        AllowCreate("field-1", "owner-1");
        _tasks.Setup(r => r.CreateAsync(It.IsAny<TaskItem>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskItem item, CancellationToken _) =>
            {
                item.Id = "task-2";
                return item;
            });

        var result = await _service.CreateTaskAsync(
            new CreateTaskDto
            {
                FieldId = "field-1",
                Type = "olive_harvest",
                Title = "Olive harvest"
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("daily", result.HarvestPhase);
    }

    private void AllowCreate(string fieldId, string userId)
    {
        _access.Setup(s => s.CanUserAccessFieldAsync(fieldId, userId, Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _access.Setup(s => s.CanUserModifyFieldAsync(fieldId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _fields.Setup(r => r.GetByIdAsync(fieldId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = fieldId, OwnerId = userId, CurrentLifecycleYear = "low" });
        _lifecycle.Setup(s => s.ValidateTaskForLifecycleAsync(fieldId, "low", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
    }
}
