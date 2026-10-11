using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.DTOs.Harvest;
using OliveLifecycle.Application.DTOs.OilStock;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.OilStock;
using Xunit;

namespace OliveLifecycle.Application.Tests.Qa;

/// <summary>
/// Phase 1 P0 regressions for My Oil: stock corrections, credit sales, sale reversal,
/// harvest→oil confirmation and replay keys.
/// </summary>
public class OilStockQaTests
{
    private const string Owner = "owner-1";

    private readonly Mock<IOilCellarRepository> _cellars = new();
    private readonly Mock<IOilLotRepository> _lots = new();
    private readonly Mock<IOilPressingRepository> _pressings = new();
    private readonly Mock<IOilCommitmentRepository> _commitments = new();
    private readonly Mock<IOilShareRequestRepository> _shareRequests = new();
    private readonly Mock<IStockMovementRepository> _movements = new();
    private readonly Mock<IFinancialTransactionService> _finance = new();
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IHarvestService> _harvests = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly List<StockMovement> _recorded = [];
    private readonly OilStockService _service;

    public OilStockQaTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc));
        _cellars.Setup(r => r.GetByOwnerPersonIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string person, CancellationToken _) => new OilCellar
            {
                Id = CellarId(person),
                OwnerPersonId = person,
                Status = OilCellarStatuses.Active
            });
        _commitments.Setup(r => r.GetByCellarIdAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _commitments.Setup(r => r.UpdateAsync(It.IsAny<OilCommitment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilCommitment c, CancellationToken _) => c);
        _movements.Setup(r => r.GetByCellarIdAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _movements.Setup(r => r.CreateAsync(It.IsAny<StockMovement>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((StockMovement m, CancellationToken _) =>
            {
                m.Id = $"move-{_recorded.Count + 1}";
                _recorded.Add(m);
                return m;
            });
        _lots.Setup(r => r.UpdateAsync(It.IsAny<OilLot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot l, CancellationToken _) => l);
        _service = new OilStockService(
            _cellars.Object,
            _lots.Object,
            _pressings.Object,
            _commitments.Object,
            _shareRequests.Object,
            _movements.Object,
            _finance.Object,
            _fields.Object,
            _harvests.Object,
            _clock.Object);
    }

    private static string CellarId(string person) => $"cellar:{person}";

    private OilLot ProvideLot(OilPack packing, string id = "lot-1")
    {
        var lot = new OilLot
        {
            Id = id,
            CellarId = CellarId(Owner),
            OwnerUserId = Owner,
            BatchId = "b1",
            Packing = packing,
            TotalAmount = OilPackMath.PackLitres(packing),
            Unit = "litres"
        };
        _lots.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(lot);
        _lots.Setup(r => r.GetByCellarIdAsync(
                CellarId(Owner), Owner, It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([lot]);
        return lot;
    }

    private void StoreCommitment(OilCommitment commitment) =>
        _commitments.Setup(r => r.GetByIdAsync(commitment.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(commitment);

    private void CapturePostedCommitments()
    {
        _commitments.Setup(r => r.CreateAsync(It.IsAny<OilCommitment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilCommitment c, CancellationToken _) =>
            {
                c.Id = "c-new";
                StoreCommitment(c);
                return c;
            });
    }

    private void IncomePostsAs(string txId) =>
        _finance.Setup(f => f.CreateAsync(
                It.IsAny<CreateFinancialTransactionDto>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FinancialTransactionDto { Id = txId });

    private static CreateOilCommitmentDto SaleDto(decimal amount, bool? isPaid = null, string? key = null) => new()
    {
        CounterpartyName = "Buyer",
        IsSale = true,
        Amount = amount,
        IsPaid = isPaid,
        IdempotencyKey = key,
        Requested = new OilPackDto { BulkLitres = 20 }
    };

    // ------------------------------------------------------------------ QA-038

    // ------------------------------------------------------------------ QA-034

    [Fact]
    public async Task QA_034_AdjustStock_RejectsAmountAboveCap()
    {
        var lot = ProvideLot(new OilPack { Tin16 = 3, BulkLitres = 10 });

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.AdjustStockAsync(
            Owner,
            new AdjustStockDto
            {
                OilLotId = "lot-1",
                Kind = "correction",
                Pack = new OilPackDto { BulkLitres = 50_000.5m },
                Notes = "typo"
            }));

        Assert.Contains("50,000", ex.Message);
        Assert.Equal(10, lot.Packing.BulkLitres);
        Assert.Empty(_recorded);
    }

    [Fact]
    public async Task QA_038_AdjustStock_RejectsNegativeAndRequiresReason()
    {
        var lot = ProvideLot(new OilPack { Tin16 = 3, BulkLitres = 10 });

        AdjustStockDto Adjust(OilPackDto pack, string? notes, string kind = "correction") => new()
        {
            OilLotId = "lot-1",
            Kind = kind,
            Pack = pack,
            Notes = notes
        };

        // Negative components must not be silently clamped into a valid-looking request.
        await Assert.ThrowsAsync<ValidationException>(() => _service.AdjustStockAsync(
            Owner, Adjust(new OilPackDto { BulkLitres = -5 }, "count")));
        await Assert.ThrowsAsync<ValidationException>(() => _service.AdjustStockAsync(
            Owner, Adjust(new OilPackDto { Tin16 = -1, BulkLitres = 10 }, "count")));
        await Assert.ThrowsAsync<ValidationException>(() => _service.AdjustStockAsync(
            Owner, Adjust(new OilPackDto { Tin17 = -2 }, "count")));

        // Nothing to adjust.
        await Assert.ThrowsAsync<ValidationException>(() => _service.AdjustStockAsync(
            Owner, Adjust(new OilPackDto(), "count")));

        // A correction without a discrepancy reason is refused; other kinds keep optional notes.
        await Assert.ThrowsAsync<ValidationException>(() => _service.AdjustStockAsync(
            Owner, Adjust(new OilPackDto { BulkLitres = 2 }, null)));
        await Assert.ThrowsAsync<ValidationException>(() => _service.AdjustStockAsync(
            Owner, Adjust(new OilPackDto { BulkLitres = 2 }, "   ")));

        Assert.Equal(3, lot.Packing.Tin16);
        Assert.Equal(10, lot.Packing.BulkLitres);
        Assert.Empty(_recorded);

        // A valid correction records before/after in the movement note.
        await _service.AdjustStockAsync(
            Owner, Adjust(new OilPackDto { BulkLitres = 4 }, "Stock count found more"));

        Assert.Equal(14, lot.Packing.BulkLitres);
        var movement = Assert.Single(_recorded);
        Assert.Contains("Stock count found more", movement.Notes);
        Assert.Contains("before: tin16 x3, tin17 x0, bulk 10 L", movement.Notes);
        Assert.Contains("after: tin16 x3, tin17 x0, bulk 14 L", movement.Notes);
    }

    [Fact]
    public async Task QA_038_AdjustStock_GiftWithoutNotes_StillAllowed()
    {
        var lot = ProvideLot(new OilPack { BulkLitres = 10 });

        await _service.AdjustStockAsync(Owner, new AdjustStockDto
        {
            OilLotId = "lot-1",
            Kind = "gifted",
            Pack = new OilPackDto { BulkLitres = 3 }
        });

        Assert.Equal(7, lot.Packing.BulkLitres);
    }

    // ------------------------------------------------------------------ QA-053

    [Fact]
    public async Task QA_053_CreditSale_PostsNoIncome_UntilPaymentCollected_AndOnlyOnce()
    {
        ProvideLot(new OilPack { BulkLitres = 80 });
        CapturePostedCommitments();
        IncomePostsAs("tx-credit");

        var created = await _service.CreateCommitmentAsync(
            Owner, Roles.FieldOwner, SaleDto(300, isPaid: false));

        Assert.Equal(OilPaymentStatuses.Receivable, created.PaymentStatus);
        Assert.Null(created.FinancialTransactionId);
        _finance.Verify(f => f.CreateAsync(
            It.IsAny<CreateFinancialTransactionDto>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);

        var paid = await _service.CollectPaymentAsync(Owner, Roles.FieldOwner, "c-new", null);
        Assert.Equal(OilPaymentStatuses.Paid, paid.PaymentStatus);
        Assert.Equal("tx-credit", paid.FinancialTransactionId);

        // Collecting again must not post a second income.
        var again = await _service.CollectPaymentAsync(Owner, Roles.FieldOwner, "c-new", null);
        Assert.Equal("tx-credit", again.FinancialTransactionId);
        _finance.Verify(f => f.CreateAsync(
            It.Is<CreateFinancialTransactionDto>(d =>
                d.Amount == 300m
                && d.SourceId == "c-new"
                && d.IdempotencyKey == "oil-commitment-income:c-new"),
            Owner, Roles.FieldOwner, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task QA_053_DefaultSale_StillPostsIncomeAndIsPaid()
    {
        ProvideLot(new OilPack { BulkLitres = 80 });
        CapturePostedCommitments();
        IncomePostsAs("tx-1");

        var created = await _service.CreateCommitmentAsync(
            Owner, Roles.FieldOwner, SaleDto(140));

        Assert.Equal(OilPaymentStatuses.Paid, created.PaymentStatus);
        Assert.Equal("tx-1", created.FinancialTransactionId);
    }

    [Fact]
    public async Task QA_053_IncomePostingFailure_LeavesSaleUnpaid_NotSilentlyPaid()
    {
        ProvideLot(new OilPack { BulkLitres = 80 });
        CapturePostedCommitments();
        _finance.Setup(f => f.CreateAsync(
                It.IsAny<CreateFinancialTransactionDto>(),
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("money down"));

        var created = await _service.CreateCommitmentAsync(
            Owner, Roles.FieldOwner, SaleDto(140));

        Assert.Equal(OilPaymentStatuses.Unpaid, created.PaymentStatus);
        Assert.Null(created.FinancialTransactionId);
    }

    [Fact]
    public async Task QA_053_CreditSale_RequiresAmount_AndCannotLinkExistingIncome()
    {
        ProvideLot(new OilPack { BulkLitres = 80 });

        var noAmount = SaleDto(0, isPaid: false);
        noAmount.Amount = null;
        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.CreateCommitmentAsync(Owner, Roles.FieldOwner, noAmount));

        var linked = SaleDto(100, isPaid: false);
        linked.FinancialTransactionId = "tx-x";
        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.CreateCommitmentAsync(Owner, Roles.FieldOwner, linked));
    }

    [Fact]
    public async Task QA_053_CollectPayment_RefusesCancelledAndNonSale()
    {
        StoreCommitment(new OilCommitment
        {
            Id = "c-cancelled",
            CellarId = CellarId(Owner),
            OwnerUserId = Owner,
            IsSale = true,
            Amount = 50,
            Cancelled = true
        });
        StoreCommitment(new OilCommitment
        {
            Id = "c-promise",
            CellarId = CellarId(Owner),
            OwnerUserId = Owner,
            IsSale = false
        });

        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.CollectPaymentAsync(Owner, Roles.FieldOwner, "c-cancelled", null));
        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.CollectPaymentAsync(Owner, Roles.FieldOwner, "c-promise", null));
    }

    // ------------------------------------------------------------------ QA-047

    private OilCommitment DeliveredSale(OilLot lot, string? txId = "tx-1") => new()
    {
        Id = "c-sale",
        CellarId = CellarId(Owner),
        OwnerUserId = Owner,
        CounterpartyName = "Buyer",
        IsSale = true,
        Amount = 200,
        FinancialTransactionId = txId,
        PaymentStatus = txId is null ? OilPaymentStatuses.Receivable : OilPaymentStatuses.Paid,
        Requested = new OilPack { BulkLitres = 20 },
        Delivered = new OilPack { BulkLitres = 20 },
        Allocations = [new OilLotAllocation { OilLotId = lot.Id, Pack = new OilPack { BulkLitres = 20 } }]
    };

    [Fact]
    public async Task QA_047_CancelSale_VoidsIncome_RestoresStock_AndFailsWhenAlreadyCancelled()
    {
        var lot = ProvideLot(new OilPack { BulkLitres = 5 });
        var sale = DeliveredSale(lot);
        StoreCommitment(sale);
        _movements.Setup(r => r.GetByCellarIdAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new StockMovement
            {
                Id = "move-sold",
                OilCommitmentId = "c-sale",
                Kind = StockMovementKind.Sold
            }]);

        await _service.CancelCommitmentAsync(Owner, Roles.FieldOwner, "c-sale");

        Assert.True(sale.Cancelled);
        Assert.Equal(OilPaymentStatuses.Cancelled, sale.PaymentStatus);
        Assert.Equal(25, lot.Packing.BulkLitres);
        Assert.True(OilPackMath.IsEmpty(sale.Delivered));
        _finance.Verify(f => f.VoidAsync(
            "tx-1", It.IsAny<VoidFinancialTransactionDto>(), Owner, Roles.FieldOwner,
            It.IsAny<CancellationToken>()), Times.Once);
        var reversal = Assert.Single(_recorded);
        Assert.Equal("move-sold", reversal.ReversalOfMovementId);
        Assert.Equal(20m, reversal.LitresDelta);

        // Second cancel: refused, and nothing is voided or restocked again.
        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.CancelCommitmentAsync(Owner, Roles.FieldOwner, "c-sale"));
        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.CancelSaleAsync(Owner, Roles.FieldOwner, "c-sale"));
        Assert.Equal(25, lot.Packing.BulkLitres);
        _finance.Verify(f => f.VoidAsync(
            It.IsAny<string>(), It.IsAny<VoidFinancialTransactionDto>(), It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        Assert.Single(_recorded);
    }

    [Fact]
    public async Task QA_047_CancelSale_FailsCompletely_WhenMoneyVoidIsRefused()
    {
        var lot = ProvideLot(new OilPack { BulkLitres = 5 });
        var sale = DeliveredSale(lot);
        StoreCommitment(sale);
        _finance.Setup(f => f.VoidAsync(
                It.IsAny<string>(), It.IsAny<VoidFinancialTransactionDto>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ForbiddenException("Only a field owner can void a transaction."));

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.CancelSaleAsync(Owner, Roles.Producer, "c-sale"));

        Assert.False(sale.Cancelled);
        Assert.Equal(5, lot.Packing.BulkLitres);
        Assert.Equal(20, sale.Delivered.BulkLitres);
        Assert.Empty(_recorded);
    }

    [Fact]
    public async Task QA_047_CancelCreditSale_HasNoIncomeToVoid()
    {
        var lot = ProvideLot(new OilPack { BulkLitres = 5 });
        var sale = DeliveredSale(lot, txId: null);
        StoreCommitment(sale);

        await _service.CancelCommitmentAsync(Owner, Roles.FieldOwner, "c-sale");

        Assert.True(sale.Cancelled);
        Assert.Equal(25, lot.Packing.BulkLitres);
        _finance.Verify(f => f.VoidAsync(
            It.IsAny<string>(), It.IsAny<VoidFinancialTransactionDto>(), It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task QA_047_CancelSale_SkipsVoid_WhenIncomeAlreadyVoided()
    {
        var lot = ProvideLot(new OilPack { BulkLitres = 5 });
        var sale = DeliveredSale(lot);
        StoreCommitment(sale);
        _finance.Setup(f => f.GetByIdAsync("tx-1", Owner, Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FinancialTransactionDto { Id = "tx-1", Status = "void" });

        await _service.CancelSaleAsync(Owner, Roles.FieldOwner, "c-sale");

        Assert.True(sale.Cancelled);
        _finance.Verify(f => f.VoidAsync(
            It.IsAny<string>(), It.IsAny<VoidFinancialTransactionDto>(), It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ------------------------------------------------------------------ QA-027

    private static ConfirmHarvestOilDto ConfirmDto(params string[] fieldIds) => new()
    {
        HarvestRecords =
        [
            new CreateHarvestRecordDto { FieldId = "f1", HarvestMethod = "oil", OilLitres = 30 },
            new CreateHarvestRecordDto { FieldId = "f2", HarvestMethod = "oil", OilLitres = 20 }
        ],
        Pressing = new CreateOilPressingDto
        {
            BatchId = "batch-1",
            TotalAmount = 50,
            Unit = "litres",
            FieldIds = fieldIds.ToList()
        }
    };

    private void HarvestsCreateAs(params string[] ids)
    {
        var queue = new Queue<string>(ids);
        _harvests.Setup(h => h.CreateAsync(
                It.IsAny<CreateHarvestRecordDto>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => new HarvestRecordDetailDto { Id = queue.Dequeue() });
    }

    [Fact]
    public async Task QA_027_ConfirmHarvestOil_VoidsCreatedHarvests_WhenPressingFails()
    {
        HarvestsCreateAs("h1", "h2");
        _pressings.Setup(r => r.CreateAsync(It.IsAny<OilPressing>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("db down"));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.ConfirmHarvestOilAsync(Owner, Roles.FieldOwner, ConfirmDto()));

        foreach (var id in new[] { "h1", "h2" })
        {
            _harvests.Verify(h => h.VoidAsync(
                id, It.IsAny<VoidHarvestRecordDto>(), Owner, Roles.FieldOwner,
                It.IsAny<CancellationToken>()), Times.Once);
        }
    }

    [Fact]
    public async Task QA_027_ConfirmHarvestOil_VoidsOnlyRowsItCreated_WhenSecondHarvestFails()
    {
        var calls = 0;
        _harvests.Setup(h => h.CreateAsync(
                It.IsAny<CreateHarvestRecordDto>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
            {
                if (++calls == 2) throw new ValidationException("field locked");
                return new HarvestRecordDetailDto { Id = "h1" };
            });

        var dto = ConfirmDto();
        dto.HarvestRecordIds = ["existing-h"];
        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.ConfirmHarvestOilAsync(Owner, Roles.FieldOwner, dto));

        _harvests.Verify(h => h.VoidAsync(
            "h1", It.IsAny<VoidHarvestRecordDto>(), It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Once);
        _harvests.Verify(h => h.VoidAsync(
            "existing-h", It.IsAny<VoidHarvestRecordDto>(), It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Never);
        _pressings.Verify(r => r.CreateAsync(
            It.IsAny<OilPressing>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task QA_027_ConfirmHarvestOil_LinksHarvestRowsToThePressing()
    {
        HarvestsCreateAs("h1", "h2");
        OilPressing? saved = null;
        _pressings.Setup(r => r.CreateAsync(It.IsAny<OilPressing>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilPressing p, CancellationToken _) =>
            {
                p.Id = "pressing-1";
                saved = p;
                return p;
            });
        _pressings.Setup(r => r.UpdateAsync(It.IsAny<OilPressing>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilPressing p, CancellationToken _) => p);
        _lots.Setup(r => r.CreateAsync(It.IsAny<OilLot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilLot l, CancellationToken _) =>
            {
                l.Id = "lot-new";
                return l;
            });

        var result = await _service.ConfirmHarvestOilAsync(Owner, Roles.FieldOwner, ConfirmDto());

        Assert.Equal(["h1", "h2"], result.HarvestRecordIds);
        Assert.NotNull(result.Pressing);
        Assert.Equal(["h1", "h2"], saved!.HarvestRecordIds);
        _harvests.Verify(h => h.VoidAsync(
            It.IsAny<string>(), It.IsAny<VoidHarvestRecordDto>(), It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task QA_027_ConfirmHarvestOil_RequiresExactlyOneOilTarget()
    {
        var neither = ConfirmDto();
        neither.Pressing = null;
        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.ConfirmHarvestOilAsync(Owner, Roles.FieldOwner, neither));

        var empty = new ConfirmHarvestOilDto
        {
            Pressing = new CreateOilPressingDto { BatchId = "b", TotalAmount = 1 }
        };
        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.ConfirmHarvestOilAsync(Owner, Roles.FieldOwner, empty));
    }

    // ------------------------------------------------------------------ idempotency

    [Fact]
    public async Task Idempotency_CreatePressing_ReplayReturnsOriginal_WithoutWritingAgain()
    {
        _pressings.Setup(r => r.GetByIdempotencyKeyAsync(Owner, "key-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OilPressing
            {
                Id = "pressing-original",
                BatchId = "batch-1",
                RecordedByUserId = Owner,
                IdempotencyKey = "key-1"
            });

        var replayed = await _service.CreatePressingAsync(Owner, new CreateOilPressingDto
        {
            BatchId = "batch-1",
            TotalAmount = 50,
            IdempotencyKey = " key-1 "
        });

        Assert.Equal("pressing-original", replayed.Id);
        _pressings.Verify(r => r.CreateAsync(It.IsAny<OilPressing>(), It.IsAny<CancellationToken>()), Times.Never);
        _lots.Verify(r => r.CreateAsync(It.IsAny<OilLot>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Idempotency_CreateCommitment_ReplayReturnsOriginal_WithoutReservingAgain()
    {
        ProvideLot(new OilPack { BulkLitres = 80 });
        _commitments.Setup(r => r.GetByIdempotencyKeyAsync(CellarId(Owner), "key-2", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OilCommitment
            {
                Id = "c-original",
                CellarId = CellarId(Owner),
                CounterpartyName = "Buyer",
                IsSale = true,
                Amount = 140,
                IdempotencyKey = "key-2"
            });

        var replayed = await _service.CreateCommitmentAsync(
            Owner, Roles.FieldOwner, SaleDto(140, key: "key-2"));

        Assert.Equal("c-original", replayed.Id);
        _commitments.Verify(r => r.CreateAsync(It.IsAny<OilCommitment>(), It.IsAny<CancellationToken>()), Times.Never);
        _finance.Verify(f => f.CreateAsync(
            It.IsAny<CreateFinancialTransactionDto>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Empty(_recorded);
    }

    [Fact]
    public async Task Idempotency_CreateCommitment_StoresKeyOnNewCommitment()
    {
        ProvideLot(new OilPack { BulkLitres = 80 });
        OilCommitment? saved = null;
        _commitments.Setup(r => r.CreateAsync(It.IsAny<OilCommitment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OilCommitment c, CancellationToken _) =>
            {
                c.Id = "c-keyed";
                saved = c;
                return c;
            });
        IncomePostsAs("tx-1");

        await _service.CreateCommitmentAsync(Owner, Roles.FieldOwner, SaleDto(140, key: "key-3"));

        Assert.Equal("key-3", saved!.IdempotencyKey);
    }
}
