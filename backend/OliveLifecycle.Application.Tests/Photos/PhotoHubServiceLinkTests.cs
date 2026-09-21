using Moq;
using OliveLifecycle.Application.Abstractions.Imaging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Abstractions.Storage;
using OliveLifecycle.Application.DTOs.Photos;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests.Photos;

public class PhotoHubServiceLinkTests
{
    private readonly Mock<IMediaAttachmentRepository> _media = new();
    private readonly Mock<IFieldAccessScopeService> _fieldAccessScope = new();
    private readonly Mock<IFieldAccessService> _fieldAccess = new();
    private readonly Mock<IFileStorageService> _storage = new();
    private readonly Mock<IImageMetadataService> _images = new();
    private readonly Mock<IFieldGeoMatchService> _geoMatch = new();
    private readonly Mock<INoteRepository> _notes = new();
    private readonly Mock<IHarvestRecordRepository> _harvests = new();
    private readonly Mock<IFieldTaskRepository> _tasks = new();
    private readonly Mock<IFieldPhenologyObservationRepository> _phenology = new();

    private PhotoHubService CreateSut() => new(
        _media.Object,
        _fieldAccessScope.Object,
        _fieldAccess.Object,
        _storage.Object,
        _images.Object,
        _geoMatch.Object,
        _notes.Object,
        _harvests.Object,
        _tasks.Object,
        _phenology.Object);

    private static MediaAttachment StandalonePhoto(string fieldId = "field-1") => new()
    {
        Id = "photo-1",
        OwnerType = MediaOwnerType.Field,
        OwnerId = string.Empty,
        FieldId = fieldId,
        Url = "/uploads/photos/a.jpg",
        ThumbnailUrl = "/uploads/photos/a_thumb.jpg",
        UploadedByUserId = "user-1",
        FieldAssignment = FieldAssignmentStatus.Manual,
        CapturedAt = DateTime.UtcNow.AddDays(-1),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    [Fact]
    public async Task LinkAsync_WrongField_ThrowsValidation()
    {
        var photo = StandalonePhoto("field-1");
        _media.Setup(m => m.GetByIdAsync("photo-1", It.IsAny<CancellationToken>())).ReturnsAsync(photo);
        _fieldAccess.Setup(a => a.CanUserAccessFieldAsync("field-1", "user-1", "FieldOwner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _tasks.Setup(t => t.GetByIdAsync("task-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FieldTask { Id = "task-1", FieldId = "other-field" });

        var sut = CreateSut();

        await Assert.ThrowsAsync<ValidationException>(() =>
            sut.LinkAsync("photo-1", new LinkPhotoDto { OwnerType = "task", OwnerId = "task-1" }, "user-1", "FieldOwner"));
    }

    [Fact]
    public async Task LinkAsync_Task_SyncsAttachmentIds()
    {
        var photo = StandalonePhoto();
        var task = new FieldTask { Id = "task-1", FieldId = "field-1", AttachmentIds = [] };
        _media.Setup(m => m.GetByIdAsync("photo-1", It.IsAny<CancellationToken>())).ReturnsAsync(photo);
        _media.Setup(m => m.CountByOwnerAsync(MediaOwnerType.Task, "task-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        _media.Setup(m => m.UpdateAsync(It.IsAny<MediaAttachment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MediaAttachment e, CancellationToken _) => e);
        _fieldAccess.Setup(a => a.CanUserAccessFieldAsync("field-1", "user-1", "FieldOwner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _tasks.Setup(t => t.GetByIdAsync("task-1", It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _tasks.Setup(t => t.UpdateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask e, CancellationToken _) => e);

        var sut = CreateSut();
        var result = await sut.LinkAsync(
            "photo-1",
            new LinkPhotoDto { OwnerType = "task", OwnerId = "task-1" },
            "user-1",
            "FieldOwner");

        Assert.True(result.IsLinked);
        Assert.Equal("task", result.OwnerType);
        Assert.Contains("photo-1", task.AttachmentIds);
    }

    [Fact]
    public async Task LinkAsync_WithoutField_ThrowsValidation()
    {
        var photo = StandalonePhoto(fieldId: "");
        photo.UploadedByUserId = "user-1";
        _media.Setup(m => m.GetByIdAsync("photo-1", It.IsAny<CancellationToken>())).ReturnsAsync(photo);

        var sut = CreateSut();

        await Assert.ThrowsAsync<ValidationException>(() =>
            sut.LinkAsync("photo-1", new LinkPhotoDto { OwnerType = "note", OwnerId = "note-1" }, "user-1", "FieldOwner"));
    }

    [Fact]
    public async Task UnlinkAsync_ClearsTaskAttachmentId()
    {
        var photo = StandalonePhoto();
        photo.OwnerType = MediaOwnerType.Task;
        photo.OwnerId = "task-1";
        var task = new FieldTask { Id = "task-1", FieldId = "field-1", AttachmentIds = ["photo-1", "other"] };

        _media.Setup(m => m.GetByIdAsync("photo-1", It.IsAny<CancellationToken>())).ReturnsAsync(photo);
        _media.Setup(m => m.UpdateAsync(It.IsAny<MediaAttachment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MediaAttachment e, CancellationToken _) => e);
        _fieldAccess.Setup(a => a.CanUserAccessFieldAsync("field-1", "user-1", "FieldOwner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _tasks.Setup(t => t.GetByIdAsync("task-1", It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _tasks.Setup(t => t.UpdateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldTask e, CancellationToken _) => e);

        var sut = CreateSut();
        var result = await sut.UnlinkAsync("photo-1", "user-1", "FieldOwner");

        Assert.False(result.IsLinked);
        Assert.Equal("field", result.OwnerType);
        Assert.DoesNotContain("photo-1", task.AttachmentIds);
        Assert.Contains("other", task.AttachmentIds);
    }
}
