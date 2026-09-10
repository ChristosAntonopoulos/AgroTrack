using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class TaskProposalServiceTests
{
    private readonly Mock<ITaskProposalRepository> _proposals = new();
    private readonly Mock<IFieldTaskRepository> _tasks = new();
    private readonly Mock<IFieldWorkTaskTemplateRepository> _templates = new();
    private readonly Mock<IFieldWorkTaskTemplateVersionRepository> _versions = new();
    private readonly Mock<IFieldWorkProfileRepository> _profiles = new();
    private readonly Mock<IFieldWorkAuthorizationService> _auth = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly TaskProposalService _service;

    public TaskProposalServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 6, 10, 12, 0, 0, DateTimeKind.Utc));
        var weather = new Mock<IFieldTaskWeatherEvaluationService>();
        weather
            .Setup(w => w.EvaluateTaskAsync(It.IsAny<FieldTask>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskWeatherEvaluation?)null);
        _profiles.Setup(r => r.GetByFieldIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile?)null);
        var logger = new Mock<Microsoft.Extensions.Logging.ILogger<TaskProposalService>>();
        _service = new TaskProposalService(
            _proposals.Object,
            _tasks.Object,
            _templates.Object,
            _versions.Object,
            _profiles.Object,
            _auth.Object,
            _clock.Object,
            weather.Object,
            logger.Object);
    }

    [Fact]
    public async Task Accept_CreatesExactlyOneFieldTask_AndCopiesChecklist()
    {
        var proposal = OpenProposal();
        _proposals.Setup(r => r.GetByIdAsync(proposal.Id, It.IsAny<CancellationToken>())).ReturnsAsync(proposal);
        _tasks.Setup(r => r.GetByProposalIdAsync(proposal.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask?)null);
        _versions.Setup(r => r.GetByCodeAndVersionAsync("T14", 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FieldWorkTaskTemplateVersion
            {
                TemplateCode = "T14",
                Version = 1,
                GreekName = "Έλεγχος παγίδων δάκου",
                DefaultChecklist =
                [
                    new TaskChecklistDefinition
                    {
                        Key = "trap_id",
                        GreekLabel = "Αναγνωριστικό παγίδας",
                        EnglishLabel = "Trap identifier",
                        IsEssential = true,
                        SortOrder = 1
                    }
                ]
            });
        _tasks.Setup(r => r.CreateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask t, CancellationToken _) =>
            {
                t.Id = "task-1";
                return t;
            });
        _proposals.Setup(r => r.UpdateAsync(It.IsAny<TaskProposal>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskProposal p, CancellationToken _) => p);

        var result = await _service.AcceptAsync(
            proposal.Id,
            new AcceptTaskProposalDto(),
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("accepted", result.Status);
        Assert.Equal("task-1", result.AcceptedTaskId);
        _tasks.Verify(r => r.CreateAsync(
            It.Is<FieldTask>(t =>
                t.ProposalId == proposal.Id
                && t.ChecklistSnapshot.Count == 1
                && t.ChecklistSnapshot[0].Key == "trap_id"
                && t.Status == FieldTaskStatus.Planned
                && t.EstimatedCost == null),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Accept_Twice_DoesNotCreateSecondFieldTask()
    {
        var proposal = OpenProposal();
        proposal.Status = TaskProposalStatus.Accepted;
        proposal.AcceptedTaskId = "task-1";

        _proposals.Setup(r => r.GetByIdAsync(proposal.Id, It.IsAny<CancellationToken>())).ReturnsAsync(proposal);
        _tasks.Setup(r => r.GetByIdAsync("task-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FieldTask { Id = "task-1", FieldId = "field-1", ProposalId = proposal.Id });

        await _service.AcceptAsync(proposal.Id, new AcceptTaskProposalDto(), "owner-1", Roles.FieldOwner);
        await _service.AcceptAsync(proposal.Id, new AcceptTaskProposalDto(), "owner-1", Roles.FieldOwner);

        _tasks.Verify(r => r.CreateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task List_ExcludesDismissedForYear()
    {
        _auth.Setup(a => a.EnsureCanViewFieldWorkAsync("field-1", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _proposals.Setup(r => r.QueryAsync(It.IsAny<TaskProposalQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TaskProposal>
            {
                OpenProposal(),
                new()
                {
                    Id = "p-dismissed",
                    FieldId = "field-1",
                    TemplateCode = "T14",
                    Status = TaskProposalStatus.DismissedForYear,
                    GreekExplanation = "Όχι φέτος",
                    ResultYear = 2026
                }
            });

        var items = await _service.ListAsync("field-1", 2026, "owner-1", Roles.FieldOwner);
        Assert.Single(items);
        Assert.Equal("p-1", items[0].Id);
    }

    [Fact]
    public async Task CreateProposal_RejectsDraftField()
    {
        _auth.Setup(a => a.EnsureFieldEligibleForProposalsAsync("field-draft", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ValidationException("Draft fields do not receive task proposals."));

        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.CreateProposalAsync(new TaskProposal
            {
                FieldId = "field-draft",
                TemplateCode = "T02",
                ResultYear = 2026,
                GreekExplanation = "test"
            }));
    }

    [Fact]
    public async Task CreateProposal_ReturnsExistingOpenDuplicate()
    {
        _auth.Setup(a => a.EnsureFieldEligibleForProposalsAsync("field-1", It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _proposals.Setup(r => r.HasDismissedForYearAsync("field-1", "T14", 2026, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var existing = OpenProposal();
        _proposals.Setup(r => r.GetOpenByDedupKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var created = await _service.CreateProposalAsync(new TaskProposal
        {
            FieldId = "field-1",
            TemplateCode = "T14",
            ResultYear = 2026,
            ReasonCodes = ["weekly_check"],
            GreekExplanation = "Έλεγχος"
        });

        Assert.Equal(existing.Id, created.Id);
        _proposals.Verify(r => r.CreateAsync(It.IsAny<TaskProposal>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private static TaskProposal OpenProposal() => new()
    {
        Id = "p-1",
        FieldId = "field-1",
        ResultYear = 2026,
        TemplateCode = "T14",
        TemplateVersion = 1,
        Status = TaskProposalStatus.Active,
        GreekExplanation = "Ήρθε η εβδομαδιαία ημερομηνία ελέγχου.",
        Confidence = ProposalConfidence.WorthChecking,
        SourceType = ProposalSourceType.SeasonalBaseline,
        ReasonCodes = ["weekly_check"],
        DedupKey = "field-1|T14|WEEKLY_CHECK|-|-"
    };
}
