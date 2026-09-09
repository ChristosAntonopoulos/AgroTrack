using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Notes;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class NoteServiceTests
{
    private readonly Mock<INoteRepository> _notes = new();
    private readonly Mock<IMediaAttachmentRepository> _media = new();
    private readonly Mock<IMediaAttachmentService> _mediaService = new();
    private readonly Mock<IFieldAccessService> _access = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly NoteService _service;

    public NoteServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 9, 8, 12, 0, 0, DateTimeKind.Utc));
        _media.Setup(m => m.GetByOwnersAsync(It.IsAny<MediaOwnerType>(), It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<MediaAttachment>());
        _media.Setup(m => m.GetByOwnerAsync(It.IsAny<MediaOwnerType>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<MediaAttachment>());
        _service = new NoteService(_notes.Object, _media.Object, _mediaService.Object, _access.Object, _clock.Object);
    }

    [Fact]
    public async Task CreateAsync_SavesPrivateNoteForOwner()
    {
        _notes.Setup(r => r.CreateAsync(It.IsAny<Note>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Note n, CancellationToken _) =>
            {
                n.Id = "note-1";
                return n;
            });

        var created = await _service.CreateAsync("owner-1", Roles.FieldOwner, new UpsertNoteDto
        {
            Body = "  Check irrigation tomorrow  "
        });

        Assert.Equal("note-1", created.Id);
        Assert.Equal("Check irrigation tomorrow", created.Body);
        Assert.Null(created.FieldId);
        Assert.False(created.Pinned);
        _notes.Verify(r => r.CreateAsync(
            It.Is<Note>(n => n.OwnerUserId == "owner-1" && n.Body == "Check irrigation tomorrow"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_RequiresBody()
    {
        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.CreateAsync("owner-1", Roles.FieldOwner, new UpsertNoteDto
            {
                Body = "  "
            }));
    }

    [Fact]
    public async Task CreateAsync_RejectsFieldTheUserCannotAccess()
    {
        _access.Setup(a => a.CanUserAccessFieldAsync("field-x", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.CreateAsync("owner-1", Roles.FieldOwner, new UpsertNoteDto
            {
                Body = "Gate code",
                FieldId = "field-x"
            }));

        _notes.Verify(r => r.CreateAsync(It.IsAny<Note>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_PinsToAccessibleField()
    {
        _access.Setup(a => a.CanUserAccessFieldAsync("field-1", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _notes.Setup(r => r.CreateAsync(It.IsAny<Note>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Note n, CancellationToken _) =>
            {
                n.Id = "note-2";
                return n;
            });

        var created = await _service.CreateAsync("owner-1", Roles.FieldOwner, new UpsertNoteDto
        {
            Body = "North terrace dry",
            FieldId = "field-1",
            Pinned = true
        });

        Assert.Equal("field-1", created.FieldId);
        Assert.True(created.Pinned);
    }

    [Fact]
    public async Task GetMineAsync_ReturnsPinnedFirstThenRecent()
    {
        _notes.Setup(r => r.GetByOwnerUserIdAsync("owner-1", null, 5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Note>
            {
                new()
                {
                    Id = "pinned",
                    OwnerUserId = "owner-1",
                    Body = "Pinned",
                    Pinned = true,
                    UpdatedAt = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new()
                {
                    Id = "recent",
                    OwnerUserId = "owner-1",
                    Body = "Recent",
                    Pinned = false,
                    UpdatedAt = new DateTime(2026, 9, 8, 0, 0, 0, DateTimeKind.Utc)
                }
            });

        var result = await _service.GetMineAsync("owner-1", limit: 5);

        Assert.Equal(2, result.Count);
        Assert.Equal("pinned", result[0].Id);
        Assert.Equal("recent", result[1].Id);
    }

    [Fact]
    public async Task UpdateAsync_RejectsNonOwner()
    {
        _notes.Setup(r => r.GetByIdAsync("note-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Note
            {
                Id = "note-1",
                OwnerUserId = "owner-1",
                Body = "Secret"
            });

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.UpdateAsync("other-user", Roles.Producer, "note-1", new UpsertNoteDto
            {
                Body = "Hacked"
            }));

        _notes.Verify(r => r.UpdateAsync(It.IsAny<Note>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_RejectsNonOwner()
    {
        _notes.Setup(r => r.GetByIdAsync("note-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Note
            {
                Id = "note-1",
                OwnerUserId = "owner-1",
                Body = "Secret"
            });

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.DeleteAsync("other-user", "note-1"));

        _notes.Verify(r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
