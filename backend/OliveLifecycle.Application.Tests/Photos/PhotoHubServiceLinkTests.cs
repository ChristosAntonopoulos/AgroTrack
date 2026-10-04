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
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFileStorageService> _storage = new();
    private readonly Mock<IImageMetadataService> _images = new();
    private readonly Mock<IFieldGeoMatchService> _geoMatch = new();
    private readonly Mock<IPhotoContentUrlSigner> _urlSigner = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<INoteRepository> _notes = new();
    private readonly Mock<IHarvestRecordRepository> _harvests = new();
    private readonly Mock<IFieldTaskRepository> _tasks = new();
    private readonly Mock<IFieldPhenologyObservationRepository> _phenology = new();

    private PhotoHubService CreateSut()
    {
        _urlSigner
            .Setup(s => s.CreateUrl(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan?>()))
            .Returns((string id, string variant, string uid, TimeSpan? _) =>
                $"/api/v1/photos/{id}/content?variant={variant}&exp=1&uid={uid}&sig=test");
        _fields.Setup(f => f.GetByIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string id, CancellationToken _) => new Field { Id = id, Name = $"Field {id}" });
        _media.Setup(m => m.PurgeTrashedOlderThanAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        _fieldAccess
            .Setup(a => a.CanUserAccessFieldPhotosAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        return new PhotoHubService(
            _media.Object,
            _fieldAccessScope.Object,
            _fieldAccess.Object,
            _fields.Object,
            _storage.Object,
            _images.Object,
            _geoMatch.Object,
            _urlSigner.Object,
            _users.Object,
            _notes.Object,
            _harvests.Object,
            _tasks.Object,
            _phenology.Object);
    }

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
        var task = new FieldTask { Id = "task-1", FieldId = "field-1", Title = "Pruning", AttachmentIds = [] };
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
        Assert.Equal("Pruning", result.LinkedTitle);
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
    public async Task UnlinkAsync_ClearsTaskAttachmentId_KeepsField()
    {
        var photo = StandalonePhoto();
        photo.OwnerType = MediaOwnerType.Task;
        photo.OwnerId = "task-1";
        photo.LinkedTitle = "Pruning";
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
        Assert.Equal("field-1", result.FieldId);
        Assert.Null(result.LinkedTitle);
        Assert.DoesNotContain("photo-1", task.AttachmentIds);
        Assert.Contains("other", task.AttachmentIds);
    }

    [Fact]
    public async Task DeleteAsync_CollaboratorCannotTrashOthersPhoto()
    {
        var photo = StandalonePhoto();
        photo.UploadedByUserId = "owner-user";
        _media.Setup(m => m.GetByIdAsync("photo-1", It.IsAny<CancellationToken>())).ReturnsAsync(photo);
        _fieldAccess.Setup(a => a.CanUserAccessFieldAsync("field-1", "collab", "Producer", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _fieldAccess.Setup(a => a.CanUserModifyFieldAsync("field-1", "collab", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var sut = CreateSut();

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            sut.DeleteAsync("photo-1", "collab", "Producer"));
    }

    [Fact]
    public async Task GetById_WithoutPhotosModule_ThrowsForbidden()
    {
        var photo = StandalonePhoto();
        _media.Setup(m => m.GetByIdAsync("photo-1", It.IsAny<CancellationToken>())).ReturnsAsync(photo);
        var sut = CreateSut();
        _fieldAccess
            .Setup(a => a.CanUserAccessFieldPhotosAsync("field-1", "collab", "Producer", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            sut.GetByIdAsync("photo-1", "collab", "Producer"));
    }

    [Fact]
    public async Task DeleteAsync_UploaderSoftDeletes()
    {
        var photo = StandalonePhoto();
        MediaAttachment? updated = null;
        _media.Setup(m => m.GetByIdAsync("photo-1", It.IsAny<CancellationToken>())).ReturnsAsync(photo);
        _fieldAccess.Setup(a => a.CanUserAccessFieldAsync("field-1", "user-1", "Producer", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _media.Setup(m => m.UpdateAsync(It.IsAny<MediaAttachment>(), It.IsAny<CancellationToken>()))
            .Callback<MediaAttachment, CancellationToken>((e, _) => updated = e)
            .ReturnsAsync((MediaAttachment e, CancellationToken _) => e);

        var sut = CreateSut();
        await sut.DeleteAsync("photo-1", "user-1", "Producer");

        Assert.NotNull(updated);
        Assert.NotNull(updated!.DeletedAt);
        Assert.Equal("user-1", updated.DeletedByUserId);
        _storage.Verify(s => s.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RestoreAsync_ClearsTrashAndReturnsPhoto()
    {
        var photo = StandalonePhoto();
        photo.DeletedAt = DateTime.UtcNow.AddHours(-1);
        photo.DeletedByUserId = "user-1";
        MediaAttachment? updated = null;
        _media.Setup(m => m.GetByIdAsync("photo-1", It.IsAny<CancellationToken>())).ReturnsAsync(photo);
        _media.Setup(m => m.UpdateAsync(It.IsAny<MediaAttachment>(), It.IsAny<CancellationToken>()))
            .Callback<MediaAttachment, CancellationToken>((e, _) => updated = e)
            .ReturnsAsync((MediaAttachment e, CancellationToken _) => e);

        var sut = CreateSut();
        var dto = await sut.RestoreAsync("photo-1", "user-1", "Producer");

        Assert.Equal("photo-1", dto.Id);
        Assert.NotNull(updated);
        Assert.Null(updated!.DeletedAt);
        Assert.Null(updated.DeletedByUserId);
    }

    [Fact]
    public async Task PurgeAsync_RejectsPhotoThatIsNotInTrash()
    {
        var photo = StandalonePhoto();
        _media.Setup(m => m.GetByIdAsync("photo-1", It.IsAny<CancellationToken>())).ReturnsAsync(photo);
        var sut = CreateSut();

        await Assert.ThrowsAsync<ValidationException>(() =>
            sut.PurgeAsync("photo-1", "user-1", "Producer"));
        _storage.Verify(s => s.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetByIdAsync_ForbiddenWithoutFieldAccess()
    {
        var photo = StandalonePhoto();
        _media.Setup(m => m.GetByIdAsync("photo-1", It.IsAny<CancellationToken>())).ReturnsAsync(photo);
        var sut = CreateSut();
        _fieldAccess.Setup(a => a.CanUserAccessFieldPhotosAsync("field-1", "stranger", "Producer", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            sut.GetByIdAsync("photo-1", "stranger", "Producer"));
    }

    [Fact]
    public void PhotoContentUrlSigner_RejectsExpiredOrBadSignature()
    {
        var config = new Mock<Microsoft.Extensions.Configuration.IConfiguration>();
        config.Setup(c => c["Storage:SigningKey"]).Returns("unit-test-signing-key");
        config.Setup(c => c["JWT:SecretKey"]).Returns((string?)null);
        var signer = new PhotoContentUrlSigner(config.Object);
        var url = signer.CreateUrl("photo-1", PhotoContentVariants.Thumb, "user-1", TimeSpan.FromHours(1));
        Assert.Contains("/api/v1/photos/photo-1/content", url);
        Assert.Contains("uid=user-1", url);

        Assert.False(signer.TryValidate("photo-1", PhotoContentVariants.Thumb, 1, "deadbeef", "user-1"));
        var exp = DateTimeOffset.UtcNow.AddHours(-2).ToUnixTimeSeconds();
        Assert.False(signer.TryValidate("photo-1", PhotoContentVariants.Thumb, exp, "anything", "user-1"));
    }
}
