using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Abstractions.Storage;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/files")]
public class FilesController : BaseApiController
{
    private readonly IFileStorageService _fileStorageService;

    public FilesController(IFileStorageService fileStorageService, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _fileStorageService = fileStorageService;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<object>> Upload(IFormFile file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }

        await using var stream = file.OpenReadStream();
        var url = await _fileStorageService.SaveAsync(stream, file.FileName, file.ContentType, cancellationToken);
        return Ok(new { url });
    }
}
