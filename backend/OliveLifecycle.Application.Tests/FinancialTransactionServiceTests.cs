using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class FinancialTransactionServiceTests
{
    private readonly Mock<IFinancialTransactionRepository> _transactions = new();
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFieldTaskRepository> _fieldTasks = new();
    private readonly Mock<IHarvestRecordRepository> _harvests = new();
    private readonly Mock<IFinancialAuthorizationService> _auth = new();
    private readonly Mock<IActivityService> _activities = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly FinancialTransactionService _service;

    public FinancialTransactionServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 9, 10, 12, 0, 0, DateTimeKind.Utc));
        _service = new FinancialTransactionService(
            _transactions.Object,
            _fields.Object,
            _fieldTasks.Object,
            _harvests.Object,
            _auth.Object,
            _activities.Object,
            _clock.Object,
            NullLogger<FinancialTransactionService>.Instance);
    }

    [Fact]
    public async Task CreateAsync_PostsExpense_AndRecordsAudit()
    {
        AllowOwnerField("field-1");
        _transactions.Setup(r => r.CreateAsync(It.IsAny<FinancialTransaction>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FinancialTransaction t, CancellationToken _) =>
            {
                t.Id = "tx-1";
                return t;
            });

        var result = await _service.CreateAsync(
            new CreateFinancialTransactionDto
            {
                Type = "expense",
                Amount = 180,
                FieldId = "field-1",
                Category = "fertilizers",
                Description = "Λίπασμα για το Κτήμα Φιλιατρών"
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("tx-1", result.Id);
        Assert.Equal("posted", result.Status);
        Assert.Equal("Καταχωρημένο", result.StatusLabel);
        Assert.Equal("expense", result.Type);
        Assert.Equal("Έξοδο", result.TypeLabel);
        Assert.Equal("fertilizers", result.Category);
        Assert.Equal("Λιπάσματα", result.CategoryLabel);
        Assert.Equal(180m, result.Amount);
        Assert.Equal("EUR", result.Currency);
        Assert.Equal(2026, result.ResultYear);
        _activities.Verify(a => a.RecordAsync(
            "field-1",
            "financial_posted",
            It.IsAny<string>(),
            "owner-1",
            null,
            It.IsAny<Dictionary<string, string>>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_QuantityTimesUnitPrice_StoresCalculatedAmount()
    {
        AllowOwnerField("field-1");
        FinancialTransaction? saved = null;
        _transactions.Setup(r => r.CreateAsync(It.IsAny<FinancialTransaction>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FinancialTransaction t, CancellationToken _) =>
            {
                t.Id = "tx-fuel";
                saved = t;
                return t;
            });

        var result = await _service.CreateAsync(
            new CreateFinancialTransactionDto
            {
                Type = "expense",
                FieldId = "field-1",
                Category = "fuel_and_energy",
                Description = "Πετρέλαιο για αντλία άρδευσης",
                CalculationMode = "quantity_times_unit_price",
                Quantity = 15m,
                UnitPrice = 1.87m
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal(28.05m, result.Amount);
        Assert.Equal(15m, result.Quantity);
        Assert.Equal("litre", result.QuantityUnit);
        Assert.Equal("L", result.QuantityUnitAbbreviation);
        Assert.Equal(1.87m, result.UnitPrice);
        Assert.Equal("quantity_times_unit_price", result.CalculationMode);
        Assert.True(result.AmountIsCalculated);
        Assert.Equal("fuel", result.ProductKind);
        Assert.NotNull(saved);
        Assert.Equal(28.05m, saved!.Amount);
        Assert.DoesNotContain("15L", result.Description);
    }

    [Fact]
    public async Task CreateAsync_OliveOilSale_DefaultsToLitresAndCalculatesEuroPerLitre()
    {
        AllowOwnerField("field-1");
        _transactions.Setup(r => r.CreateAsync(It.IsAny<FinancialTransaction>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FinancialTransaction t, CancellationToken _) =>
            {
                t.Id = "tx-oil";
                return t;
            });

        var result = await _service.CreateAsync(
            new CreateFinancialTransactionDto
            {
                Type = "income",
                FieldId = "field-1",
                Category = "olive_oil_sale",
                Description = "Πώληση ελαιολάδου",
                CalculationMode = "quantity_times_unit_price",
                Quantity = 850m,
                UnitPrice = 6.20m
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal(5270.00m, result.Amount);
        Assert.Equal("litre", result.QuantityUnit);
        Assert.Equal("λίτρα", result.QuantityUnitLabel);
        Assert.Equal(6.20m, result.UnitPrice);
        Assert.Equal("olive_oil", result.ProductKind);
    }

    [Fact]
    public async Task CreateAsync_QuantityAndTotal_ZeroQuantity_IsRejected()
    {
        AllowOwnerField("field-1");

        await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(
            new CreateFinancialTransactionDto
            {
                Type = "expense",
                FieldId = "field-1",
                Category = "labor",
                Description = "Κλάδεμα",
                CalculationMode = "quantity_and_total",
                Quantity = 0m,
                Amount = 195m
            },
            "owner-1",
            Roles.FieldOwner));
    }

    [Fact]
    public async Task CreateAsync_SaveAsDraft_DoesNotPost()
    {
        AllowOwnerField("field-1");
        _transactions.Setup(r => r.CreateAsync(It.IsAny<FinancialTransaction>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FinancialTransaction t, CancellationToken _) =>
            {
                t.Id = "draft-1";
                return t;
            });

        var result = await _service.CreateAsync(
            new CreateFinancialTransactionDto
            {
                Type = "expense",
                Amount = 40,
                FieldId = "field-1",
                Description = "πρόχειρο",
                SaveAsDraft = true
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("draft", result.Status);
        Assert.Null(result.PostedAt);
        _activities.Verify(a => a.RecordAsync(
            "field-1",
            "financial_created",
            It.IsAny<string>(),
            "owner-1",
            null,
            It.IsAny<Dictionary<string, string>>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_IdempotentKey_ReturnsExisting()
    {
        AllowOwnerField("field-1");
        _transactions.Setup(r => r.GetByIdempotencyKeyAsync("owner-1", "key-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FinancialTransaction
            {
                Id = "existing",
                OwnerUserId = "owner-1",
                FieldId = "field-1",
                Type = FinancialTransactionType.Expense,
                Status = FinancialTransactionStatus.Posted,
                Amount = 180,
                Currency = "EUR",
                Category = FinancialTransactionCategory.Fertilizers,
                Description = "already saved",
                ResultYear = 2026,
                CreatedByUserId = "owner-1"
            });

        var first = await _service.CreateAsync(PostedExpense("key-1"), "owner-1", Roles.FieldOwner);
        var second = await _service.CreateAsync(PostedExpense("key-1"), "owner-1", Roles.FieldOwner);

        Assert.Equal("existing", first.Id);
        Assert.Equal("existing", second.Id);
        _transactions.Verify(r => r.CreateAsync(It.IsAny<FinancialTransaction>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_RejectsNegativeOrZeroAmount()
    {
        AllowOwnerField("field-1");

        await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(
            new CreateFinancialTransactionDto
            {
                Type = "expense",
                Amount = 0,
                FieldId = "field-1",
                Category = "labor",
                Description = "zero"
            },
            "owner-1",
            Roles.FieldOwner));
    }

    [Fact]
    public async Task CreateAsync_AcceptsFieldTaskRelatedId()
    {
        AllowOwnerField("field-1");
        _fieldTasks.Setup(r => r.GetByIdAsync("ft-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Core.Entities.FieldWork.FieldTask
            {
                Id = "ft-1",
                FieldId = "field-1",
                Title = "Κλάδεμα"
            });
        _transactions.Setup(r => r.CreateAsync(It.IsAny<FinancialTransaction>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FinancialTransaction t, CancellationToken _) =>
            {
                t.Id = "tx-ft";
                return t;
            });

        var result = await _service.CreateAsync(
            new CreateFinancialTransactionDto
            {
                Type = "expense",
                Amount = 40,
                FieldId = "field-1",
                Category = "labor",
                Description = "κλάδεμα",
                RelatedTaskId = "ft-1",
                ResultYear = 2026
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("ft-1", result.RelatedTaskId);
        Assert.Equal("posted", result.Status);
    }

    [Fact]
    public async Task CreateAsync_RejectsTaskOnWrongField()
    {
        AllowOwnerField("field-1");
        _fieldTasks.Setup(r => r.GetByIdAsync("task-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Core.Entities.FieldWork.FieldTask { Id = "task-1", FieldId = "other-field" });

        await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(
            new CreateFinancialTransactionDto
            {
                Type = "expense",
                Amount = 10,
                FieldId = "field-1",
                Category = "labor",
                Description = "work",
                RelatedTaskId = "task-1"
            },
            "owner-1",
            Roles.FieldOwner));
    }

    [Fact]
    public async Task CreateAsync_RejectsCategoryTypeMismatch()
    {
        AllowOwnerField("field-1");

        await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(
            new CreateFinancialTransactionDto
            {
                Type = "expense",
                Amount = 10,
                FieldId = "field-1",
                Category = "olive_oil_sale",
                Description = "wrong"
            },
            "owner-1",
            Roles.FieldOwner));
    }

    [Fact]
    public async Task CreateAsync_Unassigned_UsesOwnerUserId()
    {
        _auth.Setup(a => a.ResolveForUnassignedAsync("owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(OwnerAccess());
        _transactions.Setup(r => r.CreateAsync(It.IsAny<FinancialTransaction>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FinancialTransaction t, CancellationToken _) =>
            {
                t.Id = "general-1";
                return t;
            });

        var result = await _service.CreateAsync(
            new CreateFinancialTransactionDto
            {
                Type = "expense",
                Amount = 55,
                Category = "other_expense",
                Description = "γενικά"
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Null(result.FieldId);
        Assert.Equal("owner-1", result.OwnerUserId);
    }

    [Fact]
    public async Task VoidAsync_RequiresReason_AndPreservesRecord()
    {
        var posted = PostedEntity();
        _transactions.Setup(r => r.GetByIdAsync("tx-1", It.IsAny<CancellationToken>())).ReturnsAsync(posted);
        _auth.Setup(a => a.ResolveForTransactionAsync(posted, "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(OwnerAccess());
        _transactions.Setup(r => r.UpdateAsync(It.IsAny<FinancialTransaction>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FinancialTransaction t, CancellationToken _) => t);

        var result = await _service.VoidAsync("tx-1", new VoidFinancialTransactionDto { Reason = "λάθος ποσό" }, "owner-1", Roles.FieldOwner);

        Assert.Equal("void", result.Status);
        Assert.Equal("λάθος ποσό", result.VoidReason);
        Assert.Equal("owner-1", result.VoidedByUserId);
        _transactions.Verify(r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task VoidAsync_CannotPostAgain()
    {
        var voided = PostedEntity();
        voided.Status = FinancialTransactionStatus.Void;
        _transactions.Setup(r => r.GetByIdAsync("tx-1", It.IsAny<CancellationToken>())).ReturnsAsync(voided);
        _auth.Setup(a => a.ResolveForTransactionAsync(voided, "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(OwnerAccess());

        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.PostAsync("tx-1", "owner-1", Roles.FieldOwner));
    }

    [Fact]
    public async Task DeleteDraftAsync_RejectsPosted()
    {
        var posted = PostedEntity();
        _transactions.Setup(r => r.GetByIdAsync("tx-1", It.IsAny<CancellationToken>())).ReturnsAsync(posted);
        _auth.Setup(a => a.ResolveForTransactionAsync(posted, "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(OwnerAccess());

        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.DeleteDraftAsync("tx-1", "owner-1", Roles.FieldOwner));
    }

    [Fact]
    public async Task PostAsync_PromotesDraft()
    {
        var draft = PostedEntity();
        draft.Status = FinancialTransactionStatus.Draft;
        draft.PostedAt = null;
        _transactions.Setup(r => r.GetByIdAsync("tx-1", It.IsAny<CancellationToken>())).ReturnsAsync(draft);
        _auth.Setup(a => a.ResolveForTransactionAsync(draft, "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(OwnerAccess());
        _transactions.Setup(r => r.UpdateAsync(It.IsAny<FinancialTransaction>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FinancialTransaction t, CancellationToken _) => t);

        var result = await _service.PostAsync("tx-1", "owner-1", Roles.FieldOwner);

        Assert.Equal("posted", result.Status);
        Assert.NotNull(result.PostedAt);
    }

    private void AllowOwnerField(string fieldId)
    {
        _fields.Setup(r => r.GetByIdAsync(fieldId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = fieldId, OwnerId = "owner-1", Name = "Κτήμα", Status = FieldStatus.Active });
        _auth.Setup(a => a.ResolveForFieldAsync(fieldId, "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(OwnerAccess());
        _auth.Setup(a => a.CanViewTransaction(It.IsAny<FinancialAccess>(), It.IsAny<FinancialTransaction>(), "owner-1"))
            .Returns(true);
    }

    private static FinancialAccess OwnerAccess() => new()
    {
        IsOwner = true,
        Capabilities = FinancialCapabilities.OwnerAll.ToHashSet()
    };

    private static CreateFinancialTransactionDto PostedExpense(string key) => new()
    {
        Type = "expense",
        Amount = 180,
        FieldId = "field-1",
        Category = "fertilizers",
        Description = "Λίπασμα",
        IdempotencyKey = key
    };

    private static FinancialTransaction PostedEntity() => new()
    {
        Id = "tx-1",
        OwnerUserId = "owner-1",
        FieldId = "field-1",
        Type = FinancialTransactionType.Expense,
        Status = FinancialTransactionStatus.Posted,
        Amount = 180,
        Currency = "EUR",
        Category = FinancialTransactionCategory.Fertilizers,
        Description = "Λίπασμα",
        ResultYear = 2026,
        OccurredOn = new DateTime(2026, 9, 10, 12, 0, 0, DateTimeKind.Utc),
        CreatedByUserId = "owner-1",
        PostedAt = new DateTime(2026, 9, 10, 12, 0, 0, DateTimeKind.Utc)
    };
}
