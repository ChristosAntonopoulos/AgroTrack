using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace OliveLifecycle.Application.Tests.Qa;

public class Qa043044WritableFieldTests
{
    [Fact]
    public async Task QA_043_SelectWritableField_IsReversible_A_to_B_to_A()
    {
        var profiles = new Mock<IBillingProfileRepository>();
        var fields = new Mock<IFieldRepository>();
        var clock = new Mock<IDateTimeProvider>();
        clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc));

        var profile = QaTestFixtures.FreePlanWithWritable(QaTestFixtures.OwnerId, null, needsSelection: true);
        profiles.Setup(p => p.GetByUserIdAsync(QaTestFixtures.OwnerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);
        profiles.Setup(p => p.UpsertAsync(It.IsAny<BillingProfile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((BillingProfile p, CancellationToken _) => p);
        fields.Setup(f => f.GetByOwnerIdAsync(QaTestFixtures.OwnerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                QaTestFixtures.OwnerField(QaTestFixtures.EditableFieldId, "Stasto"),
                QaTestFixtures.OwnerField(QaTestFixtures.ViewOnlyFieldId, "test")
            });

        var service = new SubscriptionService(
            profiles.Object,
            Mock.Of<IProcessedBillingEventRepository>(),
            fields.Object,
            clock.Object,
            Options.Create(new SubscriptionOptions { FreeOwnedFieldLimit = 1, ProOwnedFieldLimit = 5 }),
            NullLogger<SubscriptionService>.Instance);

        await service.SelectWritableFieldAsync(QaTestFixtures.OwnerId, QaTestFixtures.EditableFieldId);
        Assert.Equal(QaTestFixtures.EditableFieldId, profile.SelectedWritableFieldId);

        await service.SelectWritableFieldAsync(QaTestFixtures.OwnerId, QaTestFixtures.ViewOnlyFieldId);
        Assert.Equal(QaTestFixtures.ViewOnlyFieldId, profile.SelectedWritableFieldId);

        await service.SelectWritableFieldAsync(QaTestFixtures.OwnerId, QaTestFixtures.EditableFieldId);
        Assert.Equal(QaTestFixtures.EditableFieldId, profile.SelectedWritableFieldId);

        // Idempotent re-select of same field
        await service.SelectWritableFieldAsync(QaTestFixtures.OwnerId, QaTestFixtures.EditableFieldId);
        Assert.Equal(QaTestFixtures.EditableFieldId, profile.SelectedWritableFieldId);
    }

    [Fact]
    public async Task QA_044_ViewOnlyField_TaskCreate_ReturnsFieldNotWritable()
    {
        var fields = new Mock<IFieldRepository>();
        var fieldAccess = new Mock<IFieldAccessService>();
        var tasks = new Mock<IFieldTaskRepository>();

        var field = QaTestFixtures.OwnerField(QaTestFixtures.ViewOnlyFieldId, "Stasto");
        FieldPeopleRules.EnsureNormalized(field);
        fields.Setup(f => f.GetByIdAsync(QaTestFixtures.ViewOnlyFieldId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(field);
        fieldAccess.Setup(a => a.EnsureFieldWritableForWriteAsync(
                QaTestFixtures.ViewOnlyFieldId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ForbiddenException(
                "This grove is view-only on the free plan.",
                FieldWriteErrorCodes.FieldNotWritable));

        var auth = new FieldWorkAuthorizationService(fields.Object, fieldAccess.Object, tasks.Object);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() =>
            auth.EnsureCanCreateOrEditTaskAsync(
                QaTestFixtures.ViewOnlyFieldId,
                QaTestFixtures.OwnerId,
                Roles.FieldOwner));

        Assert.Equal(FieldWriteErrorCodes.FieldNotWritable, ex.Code);
    }

    [Fact]
    public async Task QA_044_ViewOnlyOwner_CannotCreateTasks()
    {
        var fields = new Mock<IFieldRepository>();
        var fieldAccess = new Mock<IFieldAccessService>();
        var tasks = new Mock<IFieldTaskRepository>();

        var field = QaTestFixtures.OwnerField(QaTestFixtures.ViewOnlyFieldId, "Stasto");
        FieldPeopleRules.EnsureNormalized(field);
        fields.Setup(f => f.GetByIdAsync(QaTestFixtures.ViewOnlyFieldId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(field);
        fieldAccess.Setup(a => a.IsFieldWritableUnderSubscriptionAsync(field, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        tasks.Setup(t => t.QueryAsync(It.IsAny<FieldTaskQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<FieldTask>());

        var auth = new FieldWorkAuthorizationService(fields.Object, fieldAccess.Object, tasks.Object);
        var access = await auth.ResolveAsync(
            QaTestFixtures.ViewOnlyFieldId,
            QaTestFixtures.OwnerId,
            Roles.FieldOwner);

        Assert.True(access.IsOwner);
        Assert.True(access.CanView);
        Assert.False(access.CanCreateTasks);
        Assert.False(access.CanEditWorkProfile);
    }
}
