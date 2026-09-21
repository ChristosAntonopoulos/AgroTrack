using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class MediaAttachmentServiceTests
{
    private readonly Mock<IMediaAttachmentRepository> _media = new();
    private readonly Mock<IFieldAccessService> _fieldAccess = new();
    private readonly MediaAttachmentService _service;

    public MediaAttachmentServiceTests()
    {
        _service = new MediaAttachmentService(_media.Object, _fieldAccess.Object);
    }

    [Fact]
    public async Task GetByOwner_FiltersUnauthorizedFields()
    {
        _media.Setup(r => r.GetByOwnerAsync(MediaOwnerType.Note, "note-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new MediaAttachment
                {
                    Id = "m-ok",
                    OwnerType = MediaOwnerType.Note,
                    OwnerId = "note-1",
                    FieldId = "field-allowed",
                    MediaType = "image",
                    Url = "/ok.jpg",
                    UploadedByUserId = "other"
                },
                new MediaAttachment
                {
                    Id = "m-denied",
                    OwnerType = MediaOwnerType.Note,
                    OwnerId = "note-1",
                    FieldId = "field-denied",
                    MediaType = "image",
                    Url = "/denied.jpg",
                    UploadedByUserId = "other"
                },
                new MediaAttachment
                {
                    Id = "m-mine",
                    OwnerType = MediaOwnerType.Note,
                    OwnerId = "note-1",
                    FieldId = "",
                    MediaType = "image",
                    Url = "/mine.jpg",
                    UploadedByUserId = "user-1"
                },
                new MediaAttachment
                {
                    Id = "m-other-unscoped",
                    OwnerType = MediaOwnerType.Note,
                    OwnerId = "note-1",
                    FieldId = "",
                    MediaType = "image",
                    Url = "/other.jpg",
                    UploadedByUserId = "someone-else"
                }
            });

        _fieldAccess.Setup(a => a.CanUserAccessFieldModuleAsync(
                "field-allowed", "user-1", Roles.Producer, FamilyModules.Photos, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _fieldAccess.Setup(a => a.CanUserAccessFieldModuleAsync(
                "field-denied", "user-1", Roles.Producer, FamilyModules.Photos, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await _service.GetByOwnerAsync("note", "note-1", "user-1", Roles.Producer);

        Assert.Equal(2, result.Count);
        Assert.Contains(result, m => m.Id == "m-ok");
        Assert.Contains(result, m => m.Id == "m-mine");
        Assert.DoesNotContain(result, m => m.Id == "m-denied");
        Assert.DoesNotContain(result, m => m.Id == "m-other-unscoped");
    }
}
