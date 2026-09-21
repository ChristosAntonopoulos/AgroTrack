using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Photos;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/photos")]
public class PhotosController : BaseApiController
{
    private readonly IPhotoHubService _photos;

    public PhotosController(IPhotoHubService photos, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _photos = photos;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 50 * 1024 * 1024)]
    public async Task<ActionResult<IReadOnlyList<PhotoUploadResultDto>>> Upload(
        [FromForm] List<IFormFile> files,
        CancellationToken cancellationToken)
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

    [HttpGet]
    public async Task<ActionResult<PhotoListDto>> Query(
        [FromQuery] string? fieldId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? fieldAssignment,
        [FromQuery] string? ownerType,
        [FromQuery] string? linkStatus,
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
}
