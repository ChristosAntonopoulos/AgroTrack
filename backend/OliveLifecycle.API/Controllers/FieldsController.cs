using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/fields")]
public class FieldsController : BaseApiController
{
    private readonly IFieldService _fieldService;
    private readonly IBoundaryVertexPhotoService _boundaryVertexPhotos;

    public FieldsController(
        IFieldService fieldService,
        IBoundaryVertexPhotoService boundaryVertexPhotos,
        ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _fieldService = fieldService;
        _boundaryVertexPhotos = boundaryVertexPhotos;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FieldDto>>> GetFields(
        [FromQuery] string? module,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var fields = await _fieldService.GetFieldsForUserAsync(
            UserContext.UserId, UserContext.Role, module, status, cancellationToken);
        return OkResult(fields);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<FieldDto>> GetField(string id, CancellationToken cancellationToken)
    {
        var field = await _fieldService.GetFieldByIdAsync(id, UserContext.UserId, UserContext.Role, cancellationToken);
        if (field == null)
        {
            return NotFound();
        }

        return OkResult(field);
    }

    [HttpPost]
    public async Task<ActionResult<FieldDto>> CreateField([FromBody] CreateFieldDto createFieldDto, CancellationToken cancellationToken)
    {
        var field = await _fieldService.CreateFieldAsync(UserContext.UserId, createFieldDto, cancellationToken);
        return CreatedResult(nameof(GetField), new { id = field.Id }, field);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<FieldDto>> UpdateField(string id, [FromBody] UpdateFieldDto updateFieldDto, CancellationToken cancellationToken)
    {
        var field = await _fieldService.UpdateFieldAsync(id, UserContext.UserId, updateFieldDto, cancellationToken);
        return OkResult(field);
    }

    [HttpPost("{id}/archive")]
    public async Task<ActionResult<FieldDto>> ArchiveField(string id, CancellationToken cancellationToken)
    {
        var field = await _fieldService.ArchiveFieldAsync(id, UserContext.UserId, cancellationToken);
        return OkResult(field);
    }

    [HttpPost("{id}/restore")]
    public async Task<ActionResult<FieldDto>> RestoreField(string id, CancellationToken cancellationToken)
    {
        var field = await _fieldService.RestoreFieldAsync(id, UserContext.UserId, cancellationToken);
        return OkResult(field);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteField(string id, CancellationToken cancellationToken)
    {
        var deleted = await _fieldService.DeleteFieldAsync(id, UserContext.UserId, cancellationToken);
        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpPost("import/greek-cadastre")]
    [RequestSizeLimit(20_000_000)]
    public async Task<ActionResult<ImportGreekCadastreFieldResponse>> ImportGreekCadastre(
        [FromForm] IFormFile kdFile,
        [FromForm] IFormFile kfFile,
        CancellationToken cancellationToken)
    {
        if (kdFile == null || kfFile == null)
        {
            return BadRequest(new { message = "Both kdFile and kfFile PDF uploads are required." });
        }

        await using var kdStream = kdFile.OpenReadStream();
        await using var kfStream = kfFile.OpenReadStream();
        var response = await _fieldService.ImportGreekCadastreAsync(
            UserContext.UserId,
            kdStream,
            kdFile.FileName,
            kfStream,
            kfFile.FileName,
            cancellationToken);
        return OkResult(response);
    }

    [HttpPut("{id}/boundary")]
    public async Task<ActionResult<FieldDto>> UpdateBoundary(
        string id,
        [FromBody] UpdateFieldBoundaryRequest request,
        CancellationToken cancellationToken)
    {
        var field = await _fieldService.UpdateBoundaryAsync(id, UserContext.UserId, request, cancellationToken);
        await _boundaryVertexPhotos.RemapAfterBoundaryUpdateAsync(id, null, cancellationToken);
        return OkResult(field);
    }

    [HttpGet("{id}/boundary/vertex-photos")]
    public async Task<ActionResult<IReadOnlyList<BoundaryVertexPhotoDto>>> ListVertexPhotos(
        string id,
        CancellationToken cancellationToken)
    {
        var photos = await _boundaryVertexPhotos.ListAsync(
            id, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(photos);
    }

    [HttpPut("{id}/boundary/vertices/{index:int}/photo")]
    public async Task<ActionResult<BoundaryVertexPhotoDto>> AssignVertexPhoto(
        string id,
        int index,
        [FromBody] AssignBoundaryVertexPhotoRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.PhotoId))
        {
            return BadRequest(new { message = "photoId is required." });
        }

        var photo = await _boundaryVertexPhotos.AssignAsync(
            id, index, request.PhotoId.Trim(), UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(photo);
    }

    [HttpDelete("{id}/boundary/vertices/{index:int}/photo")]
    public async Task<IActionResult> ClearVertexPhoto(
        string id,
        int index,
        CancellationToken cancellationToken)
    {
        await _boundaryVertexPhotos.ClearAsync(
            id, index, UserContext.UserId, UserContext.Role, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id}/validate-area")]
    public async Task<ActionResult<FieldAreaValidationResponse>> ValidateArea(string id, CancellationToken cancellationToken)
    {
        var response = await _fieldService.ValidateAreaAsync(id, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(response);
    }

    [HttpPost("{id}/activate")]
    public async Task<ActionResult<ActivateFieldResponse>> ActivateField(
        string id,
        [FromBody] ActivateFieldRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _fieldService.ActivateFieldAsync(id, UserContext.UserId, UserContext.Role, request, cancellationToken);
        return OkResult(response);
    }

    [HttpPost("{id}/documents")]
    [RequestSizeLimit(20_000_000)]
    public async Task<ActionResult<FieldDto>> UploadDocument(
        string id,
        [FromForm] IFormFile file,
        [FromForm] string? type,
        CancellationToken cancellationToken)
    {
        if (file == null)
        {
            return BadRequest(new { message = "No file uploaded." });
        }

        await using var stream = file.OpenReadStream();
        var field = await _fieldService.UploadDocumentAsync(
            id,
            UserContext.UserId,
            UserContext.Role,
            stream,
            file.FileName,
            type ?? "Other",
            cancellationToken);
        return OkResult(field);
    }
}
