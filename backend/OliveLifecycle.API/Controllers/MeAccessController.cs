using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/me/access-context")]
public class MeAccessController : BaseApiController
{
    private readonly IFieldPeopleService _fieldPeople;

    public MeAccessController(
        IFieldPeopleService fieldPeople,
        ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _fieldPeople = fieldPeople;
    }

    [HttpGet]
    public async Task<ActionResult<AccessContextDto>> Get(CancellationToken cancellationToken)
    {
        var fields = await _fieldPeople.GetMyFieldAccessAsync(UserContext.UserId, cancellationToken);
        return OkResult(new AccessContextDto
        {
            Fields = fields,
            OwnsAnyField = fields.Any(f =>
                string.Equals(f.Role, FieldPersonRole.Admin.ToString(), StringComparison.OrdinalIgnoreCase))
        });
    }
}

public class AccessContextDto
{
    public IReadOnlyList<FieldAccessSnapshotDto> Fields { get; set; } = Array.Empty<FieldAccessSnapshotDto>();
    public bool OwnsAnyField { get; set; }
}
