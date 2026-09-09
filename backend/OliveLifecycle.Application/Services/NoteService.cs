using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Notes;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class NoteService : INoteService
{
    private const int MaxBodyLength = 4000;

    private readonly INoteRepository _notes;
    private readonly IMediaAttachmentRepository _media;
    private readonly IMediaAttachmentService _mediaService;
    private readonly IFieldAccessService _fieldAccess;
    private readonly IDateTimeProvider _clock;

    public NoteService(
        INoteRepository notes,
        IMediaAttachmentRepository media,
        IMediaAttachmentService mediaService,
        IFieldAccessService fieldAccess,
        IDateTimeProvider clock)
    {
        _notes = notes;
        _media = media;
        _mediaService = mediaService;
        _fieldAccess = fieldAccess;
        _clock = clock;
    }

    public async Task<IReadOnlyList<NoteDto>> GetMineAsync(
        string userId,
        string? fieldId = null,
        int? limit = null,
        CancellationToken cancellationToken = default)
    {
        var notes = await _notes.GetByOwnerUserIdAsync(userId, fieldId, limit, cancellationToken);
        var media = await _media.GetByOwnersAsync(
            MediaOwnerType.Note,
            notes.Select(n => n.Id),
            cancellationToken);
        var byOwner = media.GroupBy(m => m.OwnerId).ToDictionary(g => g.Key, g => g.Select(x => x.Url).ToList());
        return notes.Select(n => ToDto(n, byOwner.GetValueOrDefault(n.Id))).ToList();
    }

    public async Task<NoteDto> CreateAsync(
        string userId,
        string userRole,
        UpsertNoteDto dto,
        CancellationToken cancellationToken = default)
    {
        var mediaUrls = NormalizeMediaUrls(dto.MediaUrls);
        var body = NormalizeBody(dto.Body, allowEmpty: mediaUrls.Count > 0);
        var fieldId = await NormalizeFieldIdAsync(userId, userRole, dto.FieldId, cancellationToken);
        var now = _clock.UtcNow;
        var occurredAt = dto.OccurredAt?.ToUniversalTime() ?? now;

        var note = new Note
        {
            OwnerUserId = userId,
            Body = body,
            FieldId = fieldId,
            Pinned = dto.Pinned || !string.IsNullOrWhiteSpace(fieldId),
            OccurredAt = occurredAt,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _notes.CreateAsync(note, cancellationToken);

        if (mediaUrls.Count > 0)
        {
            if (string.IsNullOrWhiteSpace(fieldId))
            {
                throw new ValidationException("A field is required when attaching photos.");
            }

            await _mediaService.AttachUrlsAsync(
                MediaOwnerType.Note.ToApiString(),
                created.Id,
                fieldId,
                mediaUrls,
                userId,
                userRole,
                cancellationToken);
        }

        return ToDto(created, mediaUrls);
    }

    public async Task<NoteDto> UpdateAsync(
        string userId,
        string userRole,
        string id,
        UpsertNoteDto dto,
        CancellationToken cancellationToken = default)
    {
        var note = await RequireOwnedAsync(id, userId, cancellationToken);
        var existingMedia = await _media.GetByOwnerAsync(MediaOwnerType.Note, note.Id, cancellationToken);
        var mediaUrls = NormalizeMediaUrls(dto.MediaUrls);
        var hasMedia = mediaUrls.Count > 0 || existingMedia.Count > 0;
        note.Body = NormalizeBody(dto.Body, allowEmpty: hasMedia);
        note.FieldId = await NormalizeFieldIdAsync(userId, userRole, dto.FieldId, cancellationToken);
        note.Pinned = dto.Pinned;
        if (dto.OccurredAt.HasValue)
        {
            note.OccurredAt = dto.OccurredAt.Value.ToUniversalTime();
        }

        note.UpdatedAt = _clock.UtcNow;

        var updated = await _notes.UpdateAsync(note, cancellationToken);

        if (mediaUrls.Count > 0 && !string.IsNullOrWhiteSpace(updated.FieldId))
        {
            await _mediaService.AttachUrlsAsync(
                MediaOwnerType.Note.ToApiString(),
                updated.Id,
                updated.FieldId,
                mediaUrls,
                userId,
                userRole,
                cancellationToken);
        }

        var allMedia = await _media.GetByOwnerAsync(MediaOwnerType.Note, updated.Id, cancellationToken);
        return ToDto(updated, allMedia.Select(m => m.Url).ToList());
    }

    public async Task DeleteAsync(string userId, string id, CancellationToken cancellationToken = default)
    {
        await RequireOwnedAsync(id, userId, cancellationToken);
        await _notes.DeleteAsync(id, cancellationToken);
    }

    private async Task<Note> RequireOwnedAsync(string id, string userId, CancellationToken cancellationToken)
    {
        var note = await _notes.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Note not found.");
        if (note.OwnerUserId != userId)
        {
            throw new ForbiddenException("You cannot access this note.");
        }

        return note;
    }

    private async Task<string?> NormalizeFieldIdAsync(
        string userId,
        string userRole,
        string? fieldId,
        CancellationToken cancellationToken)
    {
        var trimmed = string.IsNullOrWhiteSpace(fieldId) ? null : fieldId.Trim();
        if (trimmed == null)
        {
            return null;
        }

        if (!await _fieldAccess.CanUserAccessFieldAsync(trimmed, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You can only pin notes to fields you can access.");
        }

        return trimmed;
    }

    private static string NormalizeBody(string? body, bool allowEmpty)
    {
        var trimmed = (body ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            if (allowEmpty)
            {
                return string.Empty;
            }

            throw new ValidationException("Note body is required.");
        }

        if (trimmed.Length > MaxBodyLength)
        {
            throw new ValidationException($"Note body must be at most {MaxBodyLength} characters.");
        }

        return trimmed;
    }

    private static List<string> NormalizeMediaUrls(IEnumerable<string>? urls) =>
        (urls ?? Array.Empty<string>())
            .Where(u => !string.IsNullOrWhiteSpace(u))
            .Select(u => u.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(MediaAttachmentService.MaxImagesPerOwner)
            .ToList();

    private static NoteDto ToDto(Note note, IReadOnlyList<string>? mediaUrls = null) => new()
    {
        Id = note.Id,
        Body = note.Body,
        FieldId = note.FieldId,
        Pinned = note.Pinned,
        OccurredAt = note.OccurredAt == default ? note.CreatedAt : note.OccurredAt,
        CreatedAt = note.CreatedAt,
        UpdatedAt = note.UpdatedAt,
        MediaUrls = mediaUrls?.ToList() ?? new List<string>()
    };
}
