using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Media;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/media")]
public class MediaController : BaseApiController
{
    private readonly IMediaAttachmentService _media;

    public MediaController(IMediaAttachmentService media, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _media = media;
    }

    [HttpPost]
    public async Task<ActionResult<IReadOnlyList<MediaAttachmentDto>>> Attach(
        [FromBody] AttachMediaDto dto,
        CancellationToken cancellationToken)
    {
        var created = await _media.AttachUrlsAsync(
            dto.OwnerType,
            dto.OwnerId,
            dto.FieldId,
            dto.Urls,
            UserContext.UserId,
            UserContext.Role,
            cancellationToken);
        return OkResult(created);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MediaAttachmentDto>>> GetByOwner(
        [FromQuery] string ownerType,
        [FromQuery] string ownerId,
        CancellationToken cancellationToken)
    {
        var items = await _media.GetByOwnerAsync(ownerType, ownerId, cancellationToken);
        return OkResult(items);
    }
}
