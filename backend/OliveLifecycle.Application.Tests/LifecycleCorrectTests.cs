using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Lifecycle;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class LifecycleCorrectTests
{
    private readonly Mock<ILifecycleRepository> _lifecycles = new();
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFieldAccessService> _access = new();
    private readonly Mock<IActivityService> _activities = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly Mock<IFieldLifecycleSync> _sync = new();
    private readonly LifecycleService _service;

    public LifecycleCorrectTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 9, 7, 12, 0, 0, DateTimeKind.Utc));
        _service = new LifecycleService(
            _lifecycles.Object,
            _fields.Object,
            _access.Object,
            _activities.Object,
            _clock.Object,
            _sync.Object,
            NullLogger<LifecycleService>.Instance);
    }

    [Fact]
    public async Task CorrectAsync_SetsYearAndStage()
    {
        _access.Setup(s => s.CanUserModifyFieldAsync("field-1", "owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _lifecycles.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Lifecycle
            {
                Id = "lc-1",
                FieldId = "field-1",
                CurrentYear = "low",
                CurrentStage = OliveLifecycleStage.Dormancy
            });
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", OwnerId = "owner-1" });

        var result = await _service.CorrectAsync(
            "field-1",
            new CorrectLifecycleDto { CurrentYear = "high", CurrentStage = "harvest" },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("high", result.CurrentYear);
        Assert.Equal("harvest", result.CurrentStage);
        _sync.Verify(s => s.SyncAsync(
            It.Is<Field>(f => f.CurrentLifecycleYear == "high" && f.CurrentLifecycleStage == "harvest"),
            It.Is<Lifecycle>(l => l.CurrentYear == "high" && l.CurrentStage == "harvest"),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
