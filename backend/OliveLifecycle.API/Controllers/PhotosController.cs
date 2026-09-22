using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Abstractions.Storage;
using OliveLifecycle.Application.DTOs.Photos;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/photos")]
public class PhotosController : BaseApiController
{
    private readonly IPhotoHubService _photos;
    private readonly IPhotoUploadSessionStore _sessions;

    public PhotosController(
        IPhotoHubService photos,
        IPhotoUploadSessionStore sessions,
        ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _photos = photos;
        _sessions = sessions;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 50 * 1024 * 1024)]
    public async Task<ActionResult<IReadOnlyList<PhotoUploadResultDto>>> Upload(
        [FromForm] List<IFormFile> files,
        [FromForm] bool allowDuplicates = false,
        CancellationToken cancellationToken = default)
    {
        if (files == null || files.Count == 0)
        {
            return BadRequest(new { message = "No files uploaded." });
        }

        var uploads = new List<PhotoUploadFile>();
        var streams = new List<Stream>();
        try
        {
            foreach (var file in files)
            {
                if (file.Length <= 0) continue;
                var stream = file.OpenReadStream();
                streams.Add(stream);
                uploads.Add(new PhotoUploadFile
                {
                    Content = stream,
                    FileName = file.FileName,
                    ContentType = file.ContentType
                });
            }

            var results = await _photos.UploadAsync(
                uploads,
                UserContext.UserId,
                UserContext.Role,
                allowDuplicates,
                cancellationToken);
            return OkResult(results);
        }
        finally
        {
            foreach (var stream in streams)
            {
                await stream.DisposeAsync();
            }
        }
    }

    [HttpPost("uploads")]
    public async Task<ActionResult<PhotoUploadSessionDto>> BeginUpload(
        [FromBody] BeginPhotoUploadDto dto,
        CancellationToken cancellationToken)
    {
        var session = await _sessions.CreateAsync(
            UserContext.UserId,
            dto.FileName,
            dto.ContentType ?? "image/jpeg",
            dto.TotalBytes,
            cancellationToken);
        return OkResult(ToSessionDto(session));
    }

    [HttpGet("uploads/{uploadId}")]
    public async Task<ActionResult<PhotoUploadSessionDto>> GetUpload(
        string uploadId,
        CancellationToken cancellationToken)
    {
        var session = await _sessions.GetAsync(uploadId, UserContext.UserId, cancellationToken);
        if (session == null)
        {
            return NotFound();
        }

        return OkResult(ToSessionDto(session));
    }

    [HttpPut("uploads/{uploadId}")]
    [RequestSizeLimit(1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 1024 * 1024)]
    public async Task<ActionResult<PhotoUploadSessionDto>> AppendUpload(
        string uploadId,
        CancellationToken cancellationToken)
    {
        long start;
        if (Request.Query.TryGetValue("offset", out var offsetRaw) && long.TryParse(offsetRaw, out var offset))
        {
            start = offset;
        }
        else if (!TryParseContentRange(Request.Headers.ContentRange.ToString(), out start, out _, out _))
        {
            return BadRequest(new { message = "Content-Range is required." });
        }

        try
        {
            var result = await _sessions.AppendAsync(
                uploadId, UserContext.UserId, start, Request.Body, cancellationToken);
            if (result.Conflict)
            {
                return Conflict(ToSessionDto(result.Session));
            }

            return OkResult(ToSessionDto(result.Session));
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("uploads/{uploadId}/complete")]
    public async Task<ActionResult<PhotoUploadResultDto>> CompleteUpload(
        string uploadId,
        [FromBody] CompletePhotoUploadDto dto,
        CancellationToken cancellationToken)
    {
        var session = await _sessions.GetAsync(uploadId, UserContext.UserId, cancellationToken);
        if (session == null)
        {
            return NotFound();
        }

        if (session.ReceivedBytes != session.TotalBytes)
        {
            return Conflict(ToSessionDto(session));
        }

        await using var stream = await _sessions.OpenReadAsync(uploadId, UserContext.UserId, cancellationToken);
        if (stream == null)
        {
            return NotFound();
        }

        var results = await _photos.UploadAsync(
            new[]
            {
                new PhotoUploadFile
                {
                    Content = stream,
                    FileName = session.FileName,
                    ContentType = session.ContentType,
                    CapturedAt = dto.CapturedAt,
                    Latitude = dto.Latitude,
                    Longitude = dto.Longitude,
                    SourceHash = dto.SourceHash,
                    Transcoded = dto.Transcoded
                }
            },
            UserContext.UserId,
            UserContext.Role,
            dto.AllowDuplicates,
            cancellationToken);
        await _sessions.DeleteAsync(uploadId, UserContext.UserId, cancellationToken);
        return OkResult(results[0]);
    }

    private static PhotoUploadSessionDto ToSessionDto(PhotoUploadSession session) => new()
    {
        UploadId = session.Id,
        ReceivedBytes = session.ReceivedBytes,
        TotalBytes = session.TotalBytes
    };

    private static bool TryParseContentRange(string header, out long start, out long end, out long total)
    {
        start = 0;
        end = 0;
        total = 0;
        if (string.IsNullOrWhiteSpace(header))
        {
            return false;
        }

        var value = header.Trim();
        if (value.StartsWith("bytes ", StringComparison.OrdinalIgnoreCase))
        {
            value = value[6..];
        }

        var slash = value.IndexOf('/');
        var dash = value.IndexOf('-');
        if (slash < 0 || dash < 0 || dash > slash)
        {
            return false;
        }

        return long.TryParse(value[..dash], out start)
            && long.TryParse(value[(dash + 1)..slash], out end)
            && (value[(slash + 1)..] == "*" || long.TryParse(value[(slash + 1)..], out total));
    }

    [HttpGet]
    public async Task<ActionResult<PhotoListDto>> Query(
        [FromQuery] string? fieldId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? fieldAssignment,
        [FromQuery] string? ownerType,
        [FromQuery] string? linkStatus,
        [FromQuery] string? sort,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 48,
        CancellationToken cancellationToken = default)
    {
        var result = await _photos.QueryAsync(
            new PhotoQueryDto
            {
                FieldId = fieldId,
                From = from,
                To = to,
                FieldAssignment = fieldAssignment,
                OwnerType = ownerType,
                LinkStatus = linkStatus,
                Sort = sort,
                Page = page,
                PageSize = pageSize
            },
            UserContext.UserId,
            UserContext.Role,
            cancellationToken);
        return OkResult(result);
    }

    /// <summary>
    /// Serves original or thumbnail bytes via a short-lived HMAC signature (no auth cookie required for img tags).
    /// Invalid/expired signatures return 404.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("{id}/content")]
    public async Task<IActionResult> GetContent(
        string id,
        [FromQuery] string variant = "original",
        [FromQuery] long exp = 0,
        [FromQuery] string? sig = null,
        [FromQuery] string? uid = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _photos.GetContentBySignatureAsync(
                id, variant, exp, sig ?? string.Empty, uid ?? string.Empty, cancellationToken);
            Response.Headers.CacheControl = "private, max-age=300";
            return File(result.Content, result.ContentType, enableRangeProcessing: false);
        }
        catch
        {
            return NotFound();
        }
    }

    [HttpGet("trash")]
    public async Task<ActionResult<PhotoListDto>> Trash(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 48,
        CancellationToken cancellationToken = default)
    {
        var result = await _photos.QueryAsync(
            new PhotoQueryDto
            {
                TrashedOnly = true,
                Sort = "newest",
                Page = page,
                PageSize = pageSize
            },
            UserContext.UserId,
            UserContext.Role,
            cancellationToken);
        return OkResult(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PhotoDto>> GetById(string id, CancellationToken cancellationToken)
    {
        var photo = await _photos.GetByIdAsync(id, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(photo);
    }

    [HttpPatch("{id}/field")]
    public async Task<ActionResult<PhotoDto>> ConfirmField(
        string id,
        [FromBody] ConfirmPhotoFieldDto dto,
        CancellationToken cancellationToken)
    {
        var photo = await _photos.ConfirmFieldAsync(
            id, dto, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(photo);
    }

    [HttpPatch("{id}")]
    public async Task<ActionResult<PhotoDto>> Update(
        string id,
        [FromBody] UpdatePhotoDto dto,
        CancellationToken cancellationToken)
    {
        var photo = await _photos.UpdateAsync(
            id, dto, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(photo);
    }

    [HttpPost("{id}/link")]
    public async Task<ActionResult<PhotoDto>> Link(
        string id,
        [FromBody] LinkPhotoDto dto,
        CancellationToken cancellationToken)
    {
        var photo = await _photos.LinkAsync(
            id, dto, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(photo);
    }

    [HttpPost("{id}/unlink")]
    public async Task<ActionResult<PhotoDto>> Unlink(string id, CancellationToken cancellationToken)
    {
        var photo = await _photos.UnlinkAsync(id, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(photo);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        await _photos.DeleteAsync(id, UserContext.UserId, UserContext.Role, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id}/restore")]
    public async Task<ActionResult<PhotoDto>> Restore(string id, CancellationToken cancellationToken)
    {
        var photo = await _photos.RestoreAsync(id, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(photo);
    }

    [HttpDelete("{id}/permanent")]
    public async Task<ActionResult> Purge(string id, CancellationToken cancellationToken)
    {
        await _photos.PurgeAsync(id, UserContext.UserId, UserContext.Role, cancellationToken);
        return NoContent();
    }
}
