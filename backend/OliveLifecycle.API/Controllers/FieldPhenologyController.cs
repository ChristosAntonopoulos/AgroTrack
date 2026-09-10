using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/fields/{fieldId}/phenology")]
public class FieldPhenologyController : BaseApiController
{
    private readonly IFieldPhenologyService _phenology;

    public FieldPhenologyController(IFieldPhenologyService phenology, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _phenology = phenology;
    }

    [HttpGet]
    public async Task<ActionResult<FieldPhenologyDto>> GetCurrent(
        string fieldId,
        CancellationToken cancellationToken)
    {
        var result = await _phenology.GetCurrentAsync(
            fieldId,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(result);
    }

    [HttpGet("observations")]
    public async Task<ActionResult<IReadOnlyList<FieldPhenologyObservationDto>>> List(
        string fieldId,
        CancellationToken cancellationToken)
    {
        var result = await _phenology.ListAsync(
            fieldId,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(result);
    }

    [HttpPost]
    public async Task<ActionResult<FieldPhenologyObservationDto>> Record(
        string fieldId,
        [FromBody] CreateFieldPhenologyObservationDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _phenology.RecordAsync(
            fieldId,
            dto,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(result);
    }

    private string ResolveLanguage()
    {
        var header = Request.Headers.AcceptLanguage.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(header))
        {
            return "el";
        }

        return header.StartsWith("en", StringComparison.OrdinalIgnoreCase) ? "en" : "el";
    }
}
