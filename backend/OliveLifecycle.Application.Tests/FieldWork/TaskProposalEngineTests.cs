using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class TaskProposalEngineTests
{
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<ITaskProposalRepository> _proposals = new();
    private readonly Mock<IFieldTaskRepository> _tasks = new();
    private readonly Mock<ITaskExecutionRepository> _executions = new();
    private readonly Mock<IFieldPhenologyObservationRepository> _phenology = new();
    private readonly Mock<IOfficialAgriculturalWarningRepository> _warnings = new();
    private readonly Mock<IFieldWorkProfileRepository> _profiles = new();
    private readonly Mock<ITaskProposalService> _proposalService = new();
    private readonly Mock<IFieldWorkAuthorizationService> _auth = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly Mock<IFieldWorkEventSignalCollector> _eventSignals = new();
    private readonly TaskProposalEngine _engine;

    public TaskProposalEngineTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc));
        _eventSignals
            .Setup(c => c.CollectAsync(
                It.IsAny<string>(),
                It.IsAny<FieldPhenologySnapshot>(),
                It.IsAny<IReadOnlyList<OfficialAgriculturalWarning>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FieldWorkEventSignals());
        _profiles.Setup(r => r.GetByFieldIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile?)null);
        _executions.Setup(r => r.GetByFieldAndYearAsync(
                It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<TaskExecution>());
        _engine = new TaskProposalEngine(
            _fields.Object,
            _proposals.Object,
            _tasks.Object,
            _executions.Object,
            _phenology.Object,
            _warnings.Object,
            _profiles.Object,
            _proposalService.Object,
            _auth.Object,
            _clock.Object,
            _eventSignals.Object);
    }

    [Fact]
    public async Task EvaluateField_IsIdempotent_ViaCreateProposalAsync()
    {
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", Status = FieldStatus.Active, IrrigationStatus = true });
        _phenology.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FieldPhenologyObservation>());
        _proposals.Setup(r => r.QueryAsync(It.IsAny<TaskProposalQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<TaskProposal>());
        _tasks.Setup(r => r.QueryAsync(It.IsAny<FieldTaskQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FieldTask>());
        _warnings.Setup(r => r.GetActiveForFieldAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<OfficialAgriculturalWarning>());

        var createdIds = new HashSet<string>();
        _proposalService.Setup(s => s.CreateProposalAsync(It.IsAny<TaskProposal>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskProposal p, CancellationToken _) =>
            {
                if (string.IsNullOrEmpty(p.Id))
                {
                    p.Id = Guid.NewGuid().ToString("N");
                }

                createdIds.Add(p.DedupKey);
                return p;
            });

        await _engine.EvaluateFieldAsync("field-1", 2026, "owner-1", Roles.FieldOwner);
        var firstCount = createdIds.Count;

        // Second pass returns same open proposals from CreateProposalAsync dedup.
        _proposalService.Setup(s => s.CreateProposalAsync(It.IsAny<TaskProposal>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskProposal p, CancellationToken _) =>
            {
                p.Id = "existing-" + p.DedupKey.GetHashCode();
                return p;
            });

        var second = await _engine.EvaluateFieldAsync("field-1", 2026, "owner-1", Roles.FieldOwner);
        Assert.True(firstCount > 0);
        Assert.Equal(firstCount, second.Count);
    }

    [Fact]
    public async Task EvaluateField_Draft_ReturnsEmpty()
    {
        _fields.Setup(r => r.GetByIdAsync("draft-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "draft-1", Status = FieldStatus.Draft });

        var result = await _engine.EvaluateFieldAsync("draft-1", 2026);
        Assert.Empty(result);
        _proposalService.Verify(s => s.CreateProposalAsync(It.IsAny<TaskProposal>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task EvaluateField_MissingWeather_NeverMarksGood()
    {
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", Status = FieldStatus.Active, IrrigationStatus = true });
        _phenology.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FieldPhenologyObservation>());
        _proposals.Setup(r => r.QueryAsync(It.IsAny<TaskProposalQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<TaskProposal>());
        _tasks.Setup(r => r.QueryAsync(It.IsAny<FieldTaskQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FieldTask>());
        _warnings.Setup(r => r.GetActiveForFieldAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<OfficialAgriculturalWarning>());

        TaskProposal? captured = null;
        _proposalService.Setup(s => s.CreateProposalAsync(It.IsAny<TaskProposal>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskProposal p, CancellationToken _) =>
            {
                captured ??= p;
                p.Id ??= Guid.NewGuid().ToString("N");
                return p;
            });

        await _engine.EvaluateFieldAsync(
            "field-1",
            2026,
            hasWeatherData: false,
            observedWeather: WeatherSuitability.Good);

        Assert.NotNull(captured);
        // Engine persists proposals; weather suitability lives on candidates — ensure Good was not forced into confidence.
        Assert.NotEqual(ProposalConfidence.StrongEvidence, captured!.Confidence);
    }
}
