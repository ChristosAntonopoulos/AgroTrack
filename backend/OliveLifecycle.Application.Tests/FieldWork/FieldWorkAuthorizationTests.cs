using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class FieldWorkAuthorizationTests
{
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFieldAccessService> _fieldAccess = new();
    private readonly Mock<IFieldTaskRepository> _tasks = new();
    private readonly FieldWorkAuthorizationService _service;

    public FieldWorkAuthorizationTests()
    {
        _service = new FieldWorkAuthorizationService(
            _fields.Object,
            _fieldAccess.Object,
            _tasks.Object);
    }

    [Fact]
    public async Task Owner_GetsFinancialCapabilities_AssignedWorkerDoesNot()
    {
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(ActiveField("owner-1"));
        _fieldAccess.Setup(a => a.CanUserModifyFieldAsync("field-1", "owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var owner = await _service.ResolveAsync("field-1", "owner-1", Roles.FieldOwner);
        Assert.True(owner.IsOwner);
        Assert.Contains(FinancialCapabilities.ViewSummary, owner.FinancialCapabilities);
        Assert.True(owner.CanCreateTasks);

        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(ActiveField("owner-1"));
        _fieldAccess.Setup(a => a.CanUserModifyFieldAsync("field-1", "worker-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _fieldAccess.Setup(a => a.CanFamilyWriteModuleAsync(
                "field-1", "worker-1", FamilyModules.Tasks, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _fieldAccess.Setup(a => a.CanFamilyAccessModuleAsync(
                "field-1", "worker-1", FamilyModules.Tasks, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _fieldAccess.Setup(a => a.CanUserAccessFieldAsync(
                "field-1", "worker-1", Roles.Producer, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _tasks.Setup(r => r.QueryAsync(It.IsAny<FieldTaskQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<FieldTask>
            {
                new() { Id = "t1", FieldId = "field-1", AssignedUserId = "worker-1" }
            });

        var worker = await _service.ResolveAsync("field-1", "worker-1", Roles.Producer);
        Assert.True(worker.IsAssignedWorker);
        Assert.True(worker.CanOperateAssignedTasks);
        Assert.False(worker.CanCreateTasks);
        Assert.Empty(worker.FinancialCapabilities);
    }

    [Fact]
    public async Task Agronomist_CanRecordPhenology_ButNotMoney()
    {
        var field = ActiveField("owner-1");
        field.Memberships.Add(new FieldMembership
        {
            UserId = "agro-1",
            Capacities = [FieldCapacities.Advise],
            Status = "active"
        });
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>())).ReturnsAsync(field);
        _fieldAccess.Setup(a => a.CanUserModifyFieldAsync("field-1", "agro-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _fieldAccess.Setup(a => a.CanFamilyWriteModuleAsync(
                "field-1", "agro-1", FamilyModules.Tasks, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var access = await _service.ResolveAsync("field-1", "agro-1", Roles.Agronomist);
        Assert.True(access.IsAgronomist);
        Assert.True(access.CanRecordPhenology);
        Assert.False(access.CanCreateTasks);
        Assert.Empty(access.FinancialCapabilities);
    }

    [Fact]
    public async Task DraftField_IsNotEligibleForProposals()
    {
        _fields.Setup(r => r.GetByIdAsync("field-draft", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field
            {
                Id = "field-draft",
                OwnerId = "owner-1",
                Status = FieldStatus.Draft,
                Name = "Draft"
            });

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _service.EnsureFieldEligibleForProposalsAsync("field-draft"));
        Assert.Contains("Draft", ex.Message);
    }

    private static Field ActiveField(string ownerId) => new()
    {
        Id = "field-1",
        OwnerId = ownerId,
        Status = FieldStatus.Active,
        Name = "Κτήμα Φιλιατρών",
        Memberships =
        [
            new FieldMembership
            {
                UserId = ownerId,
                Capacities = [FieldCapacities.Own, FieldCapacities.Work],
                Status = "active"
            }
        ]
    };
}
