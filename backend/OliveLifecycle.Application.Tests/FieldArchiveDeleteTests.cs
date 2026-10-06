using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.OilStock;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class FieldArchiveDeleteTests
{
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFinancialTransactionRepository> _transactions = new();
    private readonly Mock<IHarvestRecordRepository> _harvests = new();
    private readonly Mock<IFieldTaskRepository> _tasks = new();
    private readonly Mock<ITaskExecutionRepository> _executions = new();
    private readonly Mock<IFieldPhenologyObservationRepository> _phenology = new();
    private readonly Mock<IActivityRepository> _activities = new();
    private readonly Mock<INoteRepository> _notes = new();
    private readonly Mock<IMediaAttachmentRepository> _media = new();
    private readonly Mock<ILifecycleRepository> _lifecycles = new();
    private readonly Mock<IOilCellarRepository> _cellars = new();
    private readonly Mock<IOilLotRepository> _lots = new();
    private readonly Mock<IOilPressingRepository> _pressings = new();
    private readonly Mock<IFieldWorkProfileRepository> _profiles = new();
    private readonly Mock<IFieldAccessService> _access = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly FieldDeletionGuard _deletionGuard;
    private readonly FieldService _fieldService;

    public FieldArchiveDeleteTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 10, 6, 12, 0, 0, DateTimeKind.Utc));
        _deletionGuard = new FieldDeletionGuard(
            _fields.Object,
            _transactions.Object,
            _harvests.Object,
            _tasks.Object,
            _executions.Object,
            _phenology.Object,
            _activities.Object,
            _notes.Object,
            _media.Object,
            _lifecycles.Object,
            _cellars.Object,
            _lots.Object,
            _pressings.Object,
            _profiles.Object);

        SetupEmptyLinks();

        _fieldService = new FieldService(
            _fields.Object,
            Mock.Of<IUserRepository>(),
            _access.Object,
            Mock.Of<IFieldAccessScopeService>(),
            Mock.Of<IActivityService>(),
            _clock.Object,
            Mock.Of<IFieldAreaCalculator>(),
            Mock.Of<IFieldAreaValidationService>(),
            Mock.Of<IGreekCadastrePdfParser>(),
            Mock.Of<IKaekNormalizer>(),
            Mock.Of<OliveLifecycle.Application.Abstractions.Storage.IFileStorageService>(),
            Mock.Of<ILifecycleService>(),
            _lifecycles.Object,
            Mock.Of<OliveLifecycle.Application.Abstractions.Geospatial.IGeospatialJobQueue>(),
            _deletionGuard,
            Microsoft.Extensions.Logging.Abstractions.NullLogger<FieldService>.Instance);
    }

    [Fact]
    public async Task Archive_PreservesStatusAndLinks_RestoreReturnsActive()
    {
        var field = ActiveField("f1");
        _fields.Setup(r => r.GetByIdAsync("f1", It.IsAny<CancellationToken>())).ReturnsAsync(field);
        _access.Setup(a => a.CanUserModifyFieldAsync("f1", "owner", It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _fields.Setup(r => r.UpdateAsync(It.IsAny<Field>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Field f, CancellationToken _) => f);

        // Linked harvest + expense + photo + oil — archive must still succeed.
        _harvests.Setup(r => r.GetByFieldIdAsync("f1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([new HarvestRecord { Id = "h1", FieldId = "f1", OwnerId = "owner" }]);
        _transactions.Setup(r => r.QueryAsync(It.IsAny<FinancialTransactionQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FinancialTransactionPage
            {
                Items = [new FinancialTransaction { Id = "tx1", FieldId = "f1" }],
                TotalCount = 1
            });
        _media.Setup(r => r.QueryAsync(It.IsAny<MediaAttachmentQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((new List<MediaAttachment> { new() { Id = "m1", FieldId = "f1" } }, 1));
        _cellars.Setup(r => r.GetByOwnerPersonIdAsync("owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OilCellar { Id = "cellar-1", OwnerPersonId = "owner" });
        _lots.Setup(r => r.GetByCellarIdAsync("cellar-1", "owner", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new OilLot
                {
                    Id = "lot-1",
                    CellarId = "cellar-1",
                    FieldIds = ["f1"],
                    Provenance = [new OilProvenanceEntry { FieldId = "f1", Share = 1m }]
                }
            ]);

        var archived = await _fieldService.ArchiveFieldAsync("f1", "owner");
        Assert.Equal(nameof(FieldStatus.Archived), archived.Status);
        Assert.Equal("f1", archived.Id);

        field.Status = FieldStatus.Archived;
        var restored = await _fieldService.RestoreFieldAsync("f1", "owner");
        Assert.Equal(nameof(FieldStatus.Active), restored.Status);

        // Links still reportable against the same field id.
        Assert.True(await _deletionGuard.HasLinkedRecordsAsync("f1", "owner"));
    }

    [Fact]
    public async Task Delete_WithLinkedHistory_ReturnsConflict()
    {
        var field = ActiveField("f1");
        _fields.Setup(r => r.GetByIdAsync("f1", It.IsAny<CancellationToken>())).ReturnsAsync(field);
        _access.Setup(a => a.CanUserModifyFieldAsync("f1", "owner", It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _harvests.Setup(r => r.GetByFieldIdAsync("f1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([new HarvestRecord { Id = "h1", FieldId = "f1", OwnerId = "owner" }]);

        var ex = await Assert.ThrowsAsync<ConflictException>(
            () => _fieldService.DeleteFieldAsync("f1", "owner"));
        Assert.Contains("Archive", ex.Message, StringComparison.OrdinalIgnoreCase);
        _fields.Verify(r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Delete_EmptyDraft_Succeeds()
    {
        var field = ActiveField("draft-1");
        field.Status = FieldStatus.Draft;
        _fields.Setup(r => r.GetByIdAsync("draft-1", It.IsAny<CancellationToken>())).ReturnsAsync(field);
        _access.Setup(a => a.CanUserModifyFieldAsync("draft-1", "owner", It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _fields.Setup(r => r.DeleteAsync("draft-1", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var deleted = await _fieldService.DeleteFieldAsync("draft-1", "owner");
        Assert.True(deleted);
        _fields.Verify(r => r.DeleteAsync("draft-1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task StatusGuard_BlocksWritesOnArchivedField()
    {
        _fields.Setup(r => r.GetByIdAsync("f1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "f1", OwnerId = "owner", Status = FieldStatus.Archived });
        var guard = new FieldStatusGuard(_fields.Object);

        await Assert.ThrowsAsync<ValidationException>(
            () => guard.EnsureAcceptsNewRecordsAsync("f1"));
    }

    private void SetupEmptyLinks()
    {
        _transactions.Setup(r => r.QueryAsync(It.IsAny<FinancialTransactionQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FinancialTransactionPage { Items = [], TotalCount = 0 });
        _harvests.Setup(r => r.GetByFieldIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _tasks.Setup(r => r.QueryAsync(It.IsAny<FieldTaskQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _executions.Setup(r => r.GetByFieldIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _phenology.Setup(r => r.GetByFieldIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _activities.Setup(r => r.GetByFieldIdAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _notes.Setup(r => r.GetByOwnerUserIdAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _media.Setup(r => r.QueryAsync(It.IsAny<MediaAttachmentQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Array.Empty<MediaAttachment>(), 0));
        _lifecycles.Setup(r => r.GetByFieldIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Lifecycle?)null);
        _pressings.Setup(r => r.GetPendingAllocationAsync(It.IsAny<string?>(), It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _pressings.Setup(r => r.GetByRecorderAsync(It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _cellars.Setup(r => r.GetByOwnerPersonIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilCellar?)null);
        _lots.Setup(r => r.GetByCellarIdAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _profiles.Setup(r => r.GetByFieldIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OliveLifecycle.Core.Entities.FieldWork.FieldWorkProfile?)null);
    }

    private static Field ActiveField(string id)
    {
        var field = new Field
        {
            Id = id,
            OwnerId = "owner",
            Name = "Φιλιατρών 088",
            Status = FieldStatus.Active
        };
        field.People.Add(FieldPeopleRules.CreateAdminSeat("owner"));
        return field;
    }
}
