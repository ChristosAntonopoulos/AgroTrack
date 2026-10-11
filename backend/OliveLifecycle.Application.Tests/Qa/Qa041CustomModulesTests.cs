using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests.Qa;

/// <summary>QA-041: custom module grants chosen on update must be stored on the seat.</summary>
public class Qa041CustomModulesTests
{
    [Fact]
    public async Task QA_041_UpdatePerson_PersistsCustomModulesAndAccessLevel()
    {
        var fields = new Mock<IFieldRepository>();
        var access = new Mock<IFieldAccessService>();
        access.Setup(a => a.CanUserAdministerFieldAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        var clock = new Mock<IDateTimeProvider>();
        clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 10, 1, 8, 0, 0, DateTimeKind.Utc));
        var users = new Mock<IUserRepository>();
        var subscriptions = new Mock<ISubscriptionService>();

        var field = new Field { Id = "field-1", OwnerId = "admin-1", Name = "Grove", Status = FieldStatus.Active };
        FieldPeopleRules.AddOrReplaceSeat(
            field, FieldPersonRole.Admin, "admin-1", FamilyModules.All, FamilyAccessLevels.Work, "admin-1",
            status: FamilyMemberStatuses.Active);
        FieldPeopleRules.AddOrReplaceSeat(
            field, FieldPersonRole.Partner, "partner-1", ["chronologio"], FamilyAccessLevels.Work, "admin-1",
            status: FamilyMemberStatuses.Active);

        fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>())).ReturnsAsync(field);
        fields.Setup(r => r.UpdateAsync(It.IsAny<Field>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Field f, CancellationToken _) => f);

        var service = new FieldPeopleService(
            fields.Object,
            users.Object,
            Mock.Of<IFieldTaskRepository>(),
            Mock.Of<IActivityRepository>(),
            Mock.Of<IFieldInviteRepository>(),
            access.Object,
            subscriptions.Object,
            clock.Object,
            Mock.Of<ISavedContactService>(),
            Mock.Of<IUserNotificationService>(),
            Mock.Of<IPushNotificationSender>(),
            Microsoft.Extensions.Logging.Abstractions.NullLogger<FieldPeopleService>.Instance);

        await service.UpdatePersonAsync(
            "field-1",
            "admin-1",
            "partner-1",
            new UpdateFieldPersonDto { Modules = ["chronologio", "money", "harvest"], AccessLevel = "help" });

        var seat = FieldPeopleRules.GetActiveOrPendingByUserId(field, "partner-1")!;
        Assert.Contains("money", seat.Modules);
        Assert.Contains("harvest", seat.Modules);
        Assert.Equal(FamilyAccessLevels.Normalize("help"), seat.AccessLevel);
        fields.Verify(r => r.UpdateAsync(It.Is<Field>(f => f.Id == "field-1"), It.IsAny<CancellationToken>()), Times.Once);
    }
}
