using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.DTOs.OilStock;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.OilStock;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class OilStockServiceCellarTests
{
    private readonly Mock<IOilCellarRepository> _cellars = new();
    private readonly Mock<IOilLotRepository> _lots = new();
    private readonly Mock<IOilPressingRepository> _pressings = new();
    private readonly Mock<IOilCommitmentRepository> _commitments = new();
    private readonly Mock<IOilShareRequestRepository> _shareRequests = new();
    private readonly Mock<IStockMovementRepository> _movements = new();
    private readonly Mock<IFinancialTransactionService> _finance = new();
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly OilStockService _service;

    public OilStockServiceCellarTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 3, 10, 12, 0, 0, DateTimeKind.Utc));
        // Every person already has a cellar; id is "cellar:" + person so assertions stay readable.
        _cellars.Setup(r => r.GetByOwnerPersonIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string person, CancellationToken _) => new OilCellar
            {
                Id = CellarIdFor(person),
                OwnerPersonId = person,
                Status = OilCellarStatuses.Active
            });
        _commitments.Setup(r => r.GetByCellarIdAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _movements.Setup(r => r.GetByCellarIdAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _movements.Setup(r => r.CreateAsync(It.IsAny<StockMovement>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((StockMovement m, CancellationToken _) =>
            {
                m.Id = "move-1";
                return m;
            });
        _lots.Setup(r => r.GetByCellarIdAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _service = new OilStockService(
            _cellars.Object,
            _lots.Object,
            _pressings.Object,
            _commitments.Object,
            _shareRequests.Object,
            _movements.Object,
            _finance.Object,
            _fields.Object,
            _clock.Object);
    }

    private static string CellarIdFor(string personId) => $"cellar:{personId}";

    private static Field Grove()
    {
        var field = new Field
        {
            Id = "field-1",
            OwnerId = "owner-1",
            Name = "Grove",
            People =
            [
                new FieldPerson
                {
                    UserId = "owner-1",
                    Role = FieldPersonRole.Admin,
                    Status = FamilyMemberStatuses.Active,
                    DisplayName = "Admin",
                    AccessLevel = FamilyAccessLevels.Work,
                    Modules = FamilyModules.All.ToList()
                },
                new FieldPerson
                {
                    UserId = "family-1",
                    Role = FieldPersonRole.Family,
                    Status = FamilyMemberStatuses.Active,
                    DisplayName = "Family",
                    AccessLevel = FamilyAccessLevels.Work,
                    Modules = FamilyModules.All.ToList()
                }
            ]
        };
        FieldPeopleRules.EnsureNormalized(field);
        return field;
    }

    /// <summary>Grove with a partner who works it but may never hold the oil.</summary>
    private static Field GroveWithPartner()
    {
        var field = Grove();
        field.People.Add(new FieldPerson
        {
            UserId = "partner-1",
            Role = FieldPersonRole.Partner,
            Status = FamilyMemberStatuses.Active,
            DisplayName = "Partner",
            AccessLevel = FamilyAccessLevels.Work,
            Modules = FamilyModules.All.ToList()
        });
        FieldPeopleRules.EnsureNormalized(field);
        return field;
    }

    [Fact]
    public async Task UpsertLot_Assigns_To_Family_Cellar_When_Admin_Chooses()
    {
        _fields.Setup(r => r.GetByIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Grove()]);
        _lots.Setup(r => r.GetByCellarAndBatchIdAsync(
                CellarIdFor("family-1"),
                "batch-1",
                "family-1",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot?)null);
        _lots.Setup(r => r.CreateAsync(It.IsAny<OilLot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot lot, CancellationToken _) =>
            {
                lot.Id = "lot-1";
                return lot;
            });

        var result = await _service.UpsertLotAsync(
            "owner-1",
            new UpsertOilLotDto
            {
                BatchId = "batch-1",
                FieldIds = ["field-1"],
                TotalAmount = 100,
                Unit = "litres",
                MillKept = 0,
                CellarOwnerUserId = "family-1",
                Packing = new OilPackDto { BulkLitres = 100 }
            });

        Assert.Equal("family-1", result.CellarOwnerUserId);
        Assert.Equal(CellarIdFor("family-1"), result.CellarId);
        _lots.Verify(r => r.CreateAsync(
            It.Is<OilLot>(l =>
                l.CellarId == CellarIdFor("family-1")
                && l.OwnerUserId == "family-1"
                && l.BatchId == "batch-1"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpsertLot_Allows_Family_To_File_Into_Admin_Cellar()
    {
        _fields.Setup(r => r.GetByIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Grove()]);
        _lots.Setup(r => r.GetByCellarAndBatchIdAsync(
                CellarIdFor("owner-1"),
                "batch-1",
                "owner-1",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot?)null);
        _lots.Setup(r => r.CreateAsync(It.IsAny<OilLot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot lot, CancellationToken _) =>
            {
                lot.Id = "lot-1";
                return lot;
            });

        var result = await _service.UpsertLotAsync(
            "family-1",
            new UpsertOilLotDto
            {
                BatchId = "batch-1",
                FieldIds = ["field-1"],
                TotalAmount = 50,
                Unit = "litres",
                CellarOwnerUserId = "owner-1",
                Packing = new OilPackDto { BulkLitres = 50 }
            });

        Assert.Equal("owner-1", result.CellarOwnerUserId);
        Assert.Equal(CellarIdFor("owner-1"), result.CellarId);
    }

    [Fact]
    public async Task UpsertLot_Rejects_Family_Assigning_To_Another_Family()
    {
        var field = Grove();
        field.People.Add(new FieldPerson
        {
            UserId = "family-2",
            Role = FieldPersonRole.Family,
            Status = FamilyMemberStatuses.Active,
            DisplayName = "Family Two",
            AccessLevel = FamilyAccessLevels.Work,
            Modules = FamilyModules.All.ToList()
        });
        FieldPeopleRules.EnsureNormalized(field);
        _fields.Setup(r => r.GetByIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([field]);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.UpsertLotAsync(
                "family-1",
                new UpsertOilLotDto
                {
                    BatchId = "batch-1",
                    FieldIds = ["field-1"],
                    TotalAmount = 50,
                    Unit = "litres",
                    CellarOwnerUserId = "family-2"
                }));
    }

    [Fact]
    public async Task CreateCommitment_Sale_Posts_Single_Income_With_Litres()
    {
        _lots.Setup(r => r.GetByCellarIdAsync(
                CellarIdFor("owner-1"),
                "owner-1",
                It.IsAny<int?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new OilLot
                {
                    Id = "lot-1",
                    CellarId = CellarIdFor("owner-1"),
                    OwnerUserId = "owner-1",
                    BatchId = "b1",
                    FieldIds = ["field-1"],
                    Packing = new OilPack { BulkLitres = 80 },
                    TotalAmount = 80,
                    Unit = "litres"
                }
            ]);
        _commitments.Setup(r => r.CreateAsync(It.IsAny<OilCommitment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilCommitment c, CancellationToken _) =>
            {
                c.Id = "c-1";
                return c;
            });
        _commitments.Setup(r => r.UpdateAsync(It.IsAny<OilCommitment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilCommitment c, CancellationToken _) => c);
        _finance.Setup(f => f.CreateAsync(
                It.IsAny<CreateFinancialTransactionDto>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FinancialTransactionDto { Id = "tx-1" });

        var created = await _service.CreateCommitmentAsync(
            "owner-1",
            Roles.FieldOwner,
            new CreateOilCommitmentDto
            {
                CounterpartyName = "Μιχάλης",
                IsSale = true,
                Amount = 560,
                Requested = new OilPackDto { BulkLitres = 80 },
                AlreadyDelivered = false
            });

        Assert.Equal("tx-1", created.FinancialTransactionId);
        _finance.Verify(f => f.CreateAsync(
            It.Is<CreateFinancialTransactionDto>(d =>
                d.Category == "olive_oil_sale"
                && d.Quantity == 80m
                && d.QuantityUnit == "litre"
                && d.CalculationMode == "quantity_and_total"
                && d.Amount == 560m
                && d.SourceId == "c-1"),
            "owner-1",
            Roles.FieldOwner,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateCommitment_With_Existing_FinancialTransactionId_Does_Not_Post_Again()
    {
        _lots.Setup(r => r.GetByCellarIdAsync(
                CellarIdFor("owner-1"),
                "owner-1",
                It.IsAny<int?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new OilLot
                {
                    Id = "lot-1",
                    CellarId = CellarIdFor("owner-1"),
                    OwnerUserId = "owner-1",
                    Packing = new OilPack { BulkLitres = 40 },
                    TotalAmount = 40,
                    Unit = "litres"
                }
            ]);
        _commitments.Setup(r => r.CreateAsync(It.IsAny<OilCommitment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilCommitment c, CancellationToken _) =>
            {
                c.Id = "c-2";
                return c;
            });

        var created = await _service.CreateCommitmentAsync(
            "owner-1",
            Roles.FieldOwner,
            new CreateOilCommitmentDto
            {
                CounterpartyName = "Buyer",
                IsSale = true,
                Amount = 280,
                FinancialTransactionId = "tx-existing",
                Requested = new OilPackDto { BulkLitres = 40 }
            });

        Assert.Equal("tx-existing", created.FinancialTransactionId);
        _finance.Verify(f => f.CreateAsync(
            It.IsAny<CreateFinancialTransactionDto>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateShareRequest_Family_Can_Ask_Admin()
    {
        _fields.Setup(r => r.GetByIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Grove()]);
        _shareRequests.Setup(r => r.CreateAsync(It.IsAny<OilShareRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilShareRequest r, CancellationToken _) =>
            {
                r.Id = "share-1";
                return r;
            });

        var created = await _service.CreateShareRequestAsync(
            "family-1",
            new CreateOilShareRequestDto
            {
                FieldIds = ["field-1"],
                Requested = new OilPackDto { Tin16 = 1, BulkLitres = 5 }
            });

        Assert.Equal("pending", created.Status);
        Assert.Equal("owner-1", created.FromOwnerUserId);
        Assert.Equal("family-1", created.ToUserId);
        Assert.Equal(1, created.Requested.Tin16);
        Assert.Equal(5, created.Requested.BulkLitres);
    }

    [Fact]
    public async Task CreateShareRequest_Rejects_Non_Family()
    {
        _fields.Setup(r => r.GetByIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Grove()]);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.CreateShareRequestAsync(
                "owner-1",
                new CreateOilShareRequestDto
                {
                    FieldIds = ["field-1"],
                    Requested = new OilPackDto { BulkLitres = 10 }
                }));
    }

    [Fact]
    public async Task RejectShareRequest_Works_For_Admin()
    {
        _shareRequests.Setup(r => r.GetByIdAsync("share-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OilShareRequest
            {
                Id = "share-1",
                FromOwnerUserId = "owner-1",
                ToUserId = "family-1",
                Requested = new OilPack { BulkLitres = 10 },
                Status = OilShareRequestStatuses.Pending
            });
        _shareRequests.Setup(r => r.UpdateAsync(It.IsAny<OilShareRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilShareRequest r, CancellationToken _) => r);

        var updated = await _service.RejectShareRequestAsync("owner-1", "share-1");
        Assert.Equal(OilShareRequestStatuses.Rejected, updated.Status);
    }

    [Fact]
    public async Task AcceptShareRequest_Moves_Pack_To_Requester_Cellar()
    {
        var adminLot = new OilLot
        {
            Id = "lot-admin",
            CellarId = CellarIdFor("owner-1"),
            OwnerUserId = "owner-1",
            BatchId = "b1",
            FieldIds = ["field-1"],
            ResultYear = 2025,
            Packing = new OilPack { Tin16 = 2, BulkLitres = 20 },
            TotalAmount = 52,
            Unit = "litres"
        };
        _shareRequests.Setup(r => r.GetByIdAsync("share-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OilShareRequest
            {
                Id = "share-1",
                FromOwnerUserId = "owner-1",
                ToUserId = "family-1",
                FromDisplayName = "Admin",
                ToDisplayName = "Family",
                FieldIds = ["field-1"],
                Requested = new OilPack { Tin16 = 1, BulkLitres = 5 },
                Status = OilShareRequestStatuses.Pending
            });
        _lots.Setup(r => r.GetByCellarIdAsync(
                CellarIdFor("owner-1"),
                "owner-1",
                null,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync([adminLot]);
        _lots.Setup(r => r.UpdateAsync(It.IsAny<OilLot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot l, CancellationToken _) => l);
        _lots.Setup(r => r.CreateAsync(It.IsAny<OilLot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot l, CancellationToken _) =>
            {
                l.Id = "lot-family";
                return l;
            });
        _shareRequests.Setup(r => r.UpdateAsync(It.IsAny<OilShareRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilShareRequest r, CancellationToken _) => r);

        var updated = await _service.AcceptShareRequestAsync("owner-1", "share-1");

        Assert.Equal(OilShareRequestStatuses.Accepted, updated.Status);
        Assert.Equal("lot-family", updated.ResultLotId);
        Assert.Equal(1, adminLot.Packing.Tin16);
        Assert.Equal(15, adminLot.Packing.BulkLitres);
        _lots.Verify(r => r.CreateAsync(
            It.Is<OilLot>(l =>
                l.CellarId == CellarIdFor("family-1")
                && l.OwnerUserId == "family-1"
                && l.BatchId == "share:share-1"
                && l.Packing.Tin16 == 1
                && l.Packing.BulkLitres == 5),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AcceptShareRequest_Pairs_Both_Legs_With_One_TransferId()
    {
        var movements = new List<StockMovement>();
        _movements.Setup(r => r.CreateAsync(It.IsAny<StockMovement>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((StockMovement m, CancellationToken _) =>
            {
                m.Id = $"move-{movements.Count + 1}";
                movements.Add(m);
                return m;
            });
        _shareRequests.Setup(r => r.GetByIdAsync("share-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OilShareRequest
            {
                Id = "share-1",
                FromOwnerUserId = "owner-1",
                ToUserId = "family-1",
                FieldIds = ["field-1"],
                Requested = new OilPack { BulkLitres = 5 },
                Status = OilShareRequestStatuses.Pending
            });
        _lots.Setup(r => r.GetByCellarIdAsync(
                CellarIdFor("owner-1"),
                "owner-1",
                null,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new OilLot
                {
                    Id = "lot-admin",
                    CellarId = CellarIdFor("owner-1"),
                    OwnerUserId = "owner-1",
                    FieldIds = ["field-1"],
                    Packing = new OilPack { BulkLitres = 20 }
                }
            ]);
        _lots.Setup(r => r.UpdateAsync(It.IsAny<OilLot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot l, CancellationToken _) => l);
        _lots.Setup(r => r.CreateAsync(It.IsAny<OilLot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot l, CancellationToken _) =>
            {
                l.Id = "lot-family";
                return l;
            });
        _shareRequests.Setup(r => r.UpdateAsync(It.IsAny<OilShareRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilShareRequest r, CancellationToken _) => r);

        await _service.AcceptShareRequestAsync("owner-1", "share-1");

        var sharedOut = movements.Single(m => m.Kind == StockMovementKind.SharedOut);
        var sharedIn = movements.Single(m => m.Kind == StockMovementKind.SharedIn);
        Assert.False(string.IsNullOrWhiteSpace(sharedOut.TransferId));
        Assert.Equal(sharedOut.TransferId, sharedIn.TransferId);
        Assert.Equal(CellarIdFor("owner-1"), sharedOut.CellarId);
        Assert.Equal(CellarIdFor("family-1"), sharedIn.CellarId);
    }

    [Fact]
    public async Task AcceptShareRequest_Fails_When_Insufficient_Stock()
    {
        _shareRequests.Setup(r => r.GetByIdAsync("share-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OilShareRequest
            {
                Id = "share-1",
                FromOwnerUserId = "owner-1",
                ToUserId = "family-1",
                FieldIds = ["field-1"],
                Requested = new OilPack { Tin16 = 5 },
                Status = OilShareRequestStatuses.Pending
            });
        _lots.Setup(r => r.GetByCellarIdAsync(
                CellarIdFor("owner-1"),
                "owner-1",
                null,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new OilLot
                {
                    Id = "lot-admin",
                    CellarId = CellarIdFor("owner-1"),
                    OwnerUserId = "owner-1",
                    FieldIds = ["field-1"],
                    Packing = new OilPack { Tin16 = 1 }
                }
            ]);

        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.AcceptShareRequestAsync("owner-1", "share-1"));
    }

    [Fact]
    public async Task CreatePressing_Files_Into_Admin_When_Partner_Records_It()
    {
        _fields.Setup(r => r.GetByIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([GroveWithPartner()]);
        _pressings.Setup(r => r.GetByBatchIdAsync("partner-1", "batch-9", It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilPressing?)null);
        _pressings.Setup(r => r.CreateAsync(It.IsAny<OilPressing>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilPressing p, CancellationToken _) =>
            {
                p.Id = "pressing-9";
                return p;
            });
        _pressings.Setup(r => r.UpdateAsync(It.IsAny<OilPressing>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilPressing p, CancellationToken _) => p);
        _cellars.Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string id, CancellationToken _) =>
            {
                var person = id.StartsWith("cellar:", StringComparison.Ordinal)
                    ? id["cellar:".Length..]
                    : id;
                return new OilCellar
                {
                    Id = CellarIdFor(person),
                    OwnerPersonId = person,
                    Status = OilCellarStatuses.Active
                };
            });
        _lots.Setup(r => r.GetByCellarAndBatchIdAsync(
                CellarIdFor("owner-1"),
                "batch-9",
                "owner-1",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot?)null);
        _lots.Setup(r => r.CreateAsync(It.IsAny<OilLot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot lot, CancellationToken _) =>
            {
                lot.Id = "lot-admin";
                return lot;
            });

        var created = await _service.CreatePressingAsync(
            "partner-1",
            new CreateOilPressingDto
            {
                BatchId = "batch-9",
                FieldIds = ["field-1"],
                TotalAmount = 120,
                Unit = "litres"
            });

        Assert.Equal(OilPressingStatuses.Confirmed, created.Status);
        Assert.Single(created.Allocations);
        Assert.Equal(120, created.Allocations[0].Litres);
        Assert.Equal("owner-1", created.Allocations[0].CellarOwnerUserId);
        _lots.Verify(r => r.CreateAsync(
            It.Is<OilLot>(l =>
                l.CellarId == CellarIdFor("owner-1")
                && l.OwnerUserId == "owner-1"
                && l.BatchId == "batch-9"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task TransferToUser_Moves_Pack_Into_Family_Cellar()
    {
        var adminLot = new OilLot
        {
            Id = "lot-admin",
            CellarId = CellarIdFor("owner-1"),
            OwnerUserId = "owner-1",
            BatchId = "b1",
            FieldIds = ["field-1"],
            ResultYear = 2025,
            Packing = new OilPack { Tin16 = 2, BulkLitres = 20 },
            TotalAmount = 52,
            Unit = "litres"
        };
        _fields.Setup(r => r.GetByIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Grove()]);
        _lots.Setup(r => r.GetByCellarIdAsync(
                CellarIdFor("owner-1"),
                "owner-1",
                null,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync([adminLot]);
        _lots.Setup(r => r.UpdateAsync(It.IsAny<OilLot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot l, CancellationToken _) => l);
        _lots.Setup(r => r.CreateAsync(It.IsAny<OilLot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot l, CancellationToken _) =>
            {
                l.Id = "lot-family";
                return l;
            });

        var moved = await _service.TransferToUserAsync(
            "owner-1",
            new TransferOilDto
            {
                ToUserId = "family-1",
                FieldIds = ["field-1"],
                Requested = new OilPackDto { Tin16 = 1, BulkLitres = 5 }
            });

        Assert.Equal("family-1", moved.ToUserId);
        Assert.Equal("lot-family", moved.ResultLotId);
        Assert.False(string.IsNullOrWhiteSpace(moved.TransferId));
        Assert.Equal(1, adminLot.Packing.Tin16);
        Assert.Equal(15, adminLot.Packing.BulkLitres);
        _lots.Verify(r => r.CreateAsync(
            It.Is<OilLot>(l =>
                l.CellarId == CellarIdFor("family-1")
                && l.OwnerUserId == "family-1"
                && l.Packing.Tin16 == 1
                && l.Packing.BulkLitres == 5),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task TransferToUser_Rejects_Non_Admin()
    {
        _fields.Setup(r => r.GetByIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Grove()]);
        _lots.Setup(r => r.GetByCellarIdAsync(
                CellarIdFor("family-1"),
                "family-1",
                null,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new OilLot
                {
                    Id = "lot-f",
                    CellarId = CellarIdFor("family-1"),
                    OwnerUserId = "family-1",
                    FieldIds = ["field-1"],
                    Packing = new OilPack { BulkLitres = 40 }
                }
            ]);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.TransferToUserAsync(
                "family-1",
                new TransferOilDto
                {
                    ToUserId = "owner-1",
                    FieldIds = ["field-1"],
                    Requested = new OilPackDto { BulkLitres = 10 }
                }));
    }

    [Fact]
    public async Task AllocatePressing_Lets_Grove_Admin_Split_A_Partner_Ticket()
    {
        _fields.Setup(r => r.GetByIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([GroveWithPartner()]);
        _pressings.Setup(r => r.GetByIdAsync("pressing-9", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OilPressing
            {
                Id = "pressing-9",
                BatchId = "batch-9",
                RecordedByUserId = "partner-1",
                FieldIds = ["field-1"],
                TotalLitres = 100,
                Unit = "litres",
                Status = OilPressingStatuses.PendingAllocation
            });
        _pressings.Setup(r => r.UpdateAsync(It.IsAny<OilPressing>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilPressing p, CancellationToken _) => p);
        _lots.Setup(r => r.GetByCellarAndBatchIdAsync(
                It.IsAny<string>(),
                "batch-9",
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot?)null);
        _lots.Setup(r => r.CreateAsync(It.IsAny<OilLot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot lot, CancellationToken _) =>
            {
                lot.Id = $"lot-{lot.OwnerUserId}";
                return lot;
            });

        var allocated = await _service.AllocatePressingAsync(
            "owner-1",
            "pressing-9",
            new AllocateOilPressingDto
            {
                Allocations =
                [
                    new OilPressingAllocationDto { CellarOwnerUserId = "owner-1", Litres = 60 },
                    new OilPressingAllocationDto { CellarOwnerUserId = "family-1", Litres = 40 }
                ]
            });

        Assert.Equal(OilPressingStatuses.Confirmed, allocated.Status);
        Assert.Equal(2, allocated.Allocations.Count);
        _lots.Verify(r => r.CreateAsync(
            It.Is<OilLot>(l => l.OwnerUserId == "family-1" && l.TotalAmount == 40m),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AllocatePressing_Rejects_Someone_Who_Is_Not_The_Grove_Admin()
    {
        _fields.Setup(r => r.GetByIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([GroveWithPartner()]);
        _pressings.Setup(r => r.GetByIdAsync("pressing-9", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OilPressing
            {
                Id = "pressing-9",
                RecordedByUserId = "partner-1",
                FieldIds = ["field-1"],
                TotalLitres = 100,
                Unit = "litres",
                Status = OilPressingStatuses.PendingAllocation
            });

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.AllocatePressingAsync(
                "family-1",
                "pressing-9",
                new AllocateOilPressingDto
                {
                    Allocations = [new OilPressingAllocationDto { CellarOwnerUserId = "family-1", Litres = 100 }]
                }));
    }

    [Fact]
    public async Task AdjustStock_Correction_Can_Take_Oil_Out_After_A_Stock_Count()
    {
        var lot = new OilLot
        {
            Id = "lot-1",
            CellarId = CellarIdFor("owner-1"),
            OwnerUserId = "owner-1",
            Packing = new OilPack { Tin16 = 3, BulkLitres = 10 }
        };
        _lots.Setup(r => r.GetByIdAsync("lot-1", It.IsAny<CancellationToken>())).ReturnsAsync(lot);
        _lots.Setup(r => r.UpdateAsync(It.IsAny<OilLot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot l, CancellationToken _) => l);

        await _service.AdjustStockAsync(
            "owner-1",
            new AdjustStockDto
            {
                OilLotId = "lot-1",
                Kind = "correction",
                Remove = true,
                Pack = new OilPackDto { BulkLitres = 4 },
                Notes = "Stock count"
            });

        Assert.Equal(6, lot.Packing.BulkLitres);
        _movements.Verify(r => r.CreateAsync(
            It.Is<StockMovement>(m => m.Kind == StockMovementKind.Correction && m.LitresDelta == -4m),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ReverseMovement_Puts_A_Gift_Back_In_The_Lot()
    {
        var lot = new OilLot
        {
            Id = "lot-1",
            CellarId = CellarIdFor("owner-1"),
            OwnerUserId = "owner-1",
            Packing = new OilPack { Tin16 = 1 }
        };
        _lots.Setup(r => r.GetByIdAsync("lot-1", It.IsAny<CancellationToken>())).ReturnsAsync(lot);
        _lots.Setup(r => r.UpdateAsync(It.IsAny<OilLot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot l, CancellationToken _) => l);
        _movements.Setup(r => r.GetByIdAsync("move-gift", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StockMovement
            {
                Id = "move-gift",
                CellarId = CellarIdFor("owner-1"),
                OwnerUserId = "owner-1",
                OilLotId = "lot-1",
                Kind = StockMovementKind.Gifted,
                PackDelta = new OilPack { Tin16 = 2 },
                LitresDelta = -32
            });
        _movements.Setup(r => r.GetReversalOfAsync("move-gift", It.IsAny<CancellationToken>()))
            .ReturnsAsync((StockMovement?)null);

        var reversal = await _service.ReverseMovementAsync("owner-1", "move-gift");

        Assert.Equal(3, lot.Packing.Tin16);
        Assert.Equal(32, reversal.LitresDelta);
        Assert.Equal("move-gift", reversal.ReversalOfMovementId);
    }

    [Fact]
    public async Task ReverseMovement_Refuses_A_Second_Undo()
    {
        _movements.Setup(r => r.GetByIdAsync("move-gift", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StockMovement
            {
                Id = "move-gift",
                CellarId = CellarIdFor("owner-1"),
                OwnerUserId = "owner-1",
                OilLotId = "lot-1",
                Kind = StockMovementKind.Gifted,
                PackDelta = new OilPack { Tin16 = 2 },
                LitresDelta = -32
            });
        _movements.Setup(r => r.GetReversalOfAsync("move-gift", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StockMovement { Id = "move-undo", ReversalOfMovementId = "move-gift" });

        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.ReverseMovementAsync("owner-1", "move-gift"));
    }

    [Fact]
    public async Task ReverseMovement_Refuses_Kinds_That_Are_Not_Undoable()
    {
        _movements.Setup(r => r.GetByIdAsync("move-prod", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StockMovement
            {
                Id = "move-prod",
                CellarId = CellarIdFor("owner-1"),
                OwnerUserId = "owner-1",
                OilLotId = "lot-1",
                Kind = StockMovementKind.Produced,
                PackDelta = new OilPack { BulkLitres = 50 },
                LitresDelta = 50
            });

        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.ReverseMovementAsync("owner-1", "move-prod"));
    }

    [Fact]
    public async Task ReverseMovement_Undoes_A_Sale_But_Leaves_The_Income_Alone()
    {
        var lot = new OilLot
        {
            Id = "lot-1",
            CellarId = CellarIdFor("owner-1"),
            OwnerUserId = "owner-1",
            Packing = new OilPack { BulkLitres = 5 }
        };
        var commitment = new OilCommitment
        {
            Id = "c-1",
            CellarId = CellarIdFor("owner-1"),
            OwnerUserId = "owner-1",
            CounterpartyName = "Buyer",
            IsSale = true,
            Amount = 200,
            FinancialTransactionId = "tx-1",
            Requested = new OilPack { BulkLitres = 20 },
            Delivered = new OilPack { BulkLitres = 20 },
            Allocations = [new OilLotAllocation { OilLotId = "lot-1", Pack = new OilPack { BulkLitres = 20 } }]
        };
        _lots.Setup(r => r.GetByIdAsync("lot-1", It.IsAny<CancellationToken>())).ReturnsAsync(lot);
        _lots.Setup(r => r.UpdateAsync(It.IsAny<OilLot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot l, CancellationToken _) => l);
        _commitments.Setup(r => r.GetByIdAsync("c-1", It.IsAny<CancellationToken>())).ReturnsAsync(commitment);
        _commitments.Setup(r => r.UpdateAsync(It.IsAny<OilCommitment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilCommitment c, CancellationToken _) => c);
        _movements.Setup(r => r.GetByIdAsync("move-sold", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StockMovement
            {
                Id = "move-sold",
                CellarId = CellarIdFor("owner-1"),
                OwnerUserId = "owner-1",
                OilCommitmentId = "c-1",
                Kind = StockMovementKind.Sold,
                PackDelta = new OilPack { BulkLitres = 20 },
                LitresDelta = -20
            });
        _movements.Setup(r => r.GetReversalOfAsync("move-sold", It.IsAny<CancellationToken>()))
            .ReturnsAsync((StockMovement?)null);

        var reversal = await _service.ReverseMovementAsync("owner-1", "move-sold");

        Assert.True(commitment.Cancelled);
        Assert.Equal(25, lot.Packing.BulkLitres);
        Assert.Equal(20, reversal.LitresDelta);
        Assert.Equal("tx-1", commitment.FinancialTransactionId);
    }
}
