using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Family;
using OliveLifecycle.Application.DTOs.OwnerPartner;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/me/access-context")]
public class MeAccessController : BaseApiController
{
    private readonly IFamilyService _family;
    private readonly IOwnerPartnerService _partners;

    public MeAccessController(
        IFamilyService family,
        IOwnerPartnerService partners,
        ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _family = family;
        _partners = partners;
    }

    [HttpGet]
    public async Task<ActionResult<AccessContextDto>> Get(CancellationToken cancellationToken)
    {
        var family = await _family.GetMyMembershipAccessAsync(UserContext.UserId, cancellationToken);
        var partner = await _partners.GetMyMembershipAccessAsync(UserContext.UserId, cancellationToken);
        return OkResult(new AccessContextDto
        {
            FamilyMemberships = family,
            PartnerMemberships = partner
        });
    }
}

public class AccessContextDto
{
    public IReadOnlyList<FamilyAccessSnapshot> FamilyMemberships { get; set; } = Array.Empty<FamilyAccessSnapshot>();
    public IReadOnlyList<OwnerPartnerAccessSnapshot> PartnerMemberships { get; set; } = Array.Empty<OwnerPartnerAccessSnapshot>();
}
