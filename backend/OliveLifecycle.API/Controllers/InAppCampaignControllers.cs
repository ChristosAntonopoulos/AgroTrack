using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Campaigns;
using OliveLifecycle.Application.DTOs.Feedback;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.API.Controllers;

[Authorize(Policy = PolicyNames.RequireAdministrator)]
[Route("api/v1/admin/campaigns")]
public class AdminCampaignsController : BaseApiController
{
    private readonly IAdminCampaignService _campaigns;

    public AdminCampaignsController(IAdminCampaignService campaigns, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _campaigns = campaigns;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<InAppCampaignDto>>> List(CancellationToken cancellationToken)
    {
        return OkResult(await _campaigns.ListAsync(cancellationToken));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<InAppCampaignDto>> Get(string id, CancellationToken cancellationToken)
    {
        var item = await _campaigns.GetAsync(id, cancellationToken)
            ?? throw new NotFoundException("Campaign not found.");
        return OkResult(item);
    }

    [HttpPost]
    public async Task<ActionResult<InAppCampaignDto>> Create(
        [FromBody] UpsertInAppCampaignDto request,
        CancellationToken cancellationToken)
    {
        return OkResult(await _campaigns.CreateAsync(request, cancellationToken));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<InAppCampaignDto>> Update(
        string id,
        [FromBody] UpsertInAppCampaignDto request,
        CancellationToken cancellationToken)
    {
        return OkResult(await _campaigns.UpdateAsync(id, request, cancellationToken));
    }

    [HttpPost("{id}/publish")]
    public async Task<ActionResult<InAppCampaignDto>> Publish(string id, CancellationToken cancellationToken)
    {
        return OkResult(await _campaigns.PublishAsync(id, cancellationToken));
    }

    [HttpPost("{id}/archive")]
    public async Task<ActionResult<InAppCampaignDto>> Archive(string id, CancellationToken cancellationToken)
    {
        return OkResult(await _campaigns.ArchiveAsync(id, cancellationToken));
    }

    [HttpGet("{id}/responses")]
    public async Task<ActionResult<CampaignResponsesDto>> Responses(string id, CancellationToken cancellationToken)
    {
        return OkResult(await _campaigns.GetResponsesAsync(id, cancellationToken));
    }
}

[Authorize]
[Route("api/v1/me")]
public class MeInAppMessagesController : BaseApiController
{
    private readonly IInAppMessageService _messages;
    private readonly IUserRepository _users;

    public MeInAppMessagesController(
        IInAppMessageService messages,
        IUserRepository users,
        ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _messages = messages;
        _users = users;
    }

    [HttpGet("inbox")]
    public async Task<ActionResult<IReadOnlyList<InboxItemDto>>> GetInbox(CancellationToken cancellationToken)
    {
        var locale = ResolveLocale();
        return OkResult(await _messages.GetInboxAsync(UserContext.UserId, UserContext.Role, locale, cancellationToken));
    }

    [HttpGet("in-app-messages")]
    public async Task<ActionResult<IReadOnlyList<InAppMessageDto>>> GetPending(CancellationToken cancellationToken)
    {
        var locale = ResolveLocale();
        return OkResult(await _messages.GetPendingModalsAsync(
            UserContext.UserId, UserContext.Role, locale, cancellationToken));
    }

    [HttpGet("in-app-messages/{id}")]
    public async Task<ActionResult<InAppMessageDto>> GetMessage(string id, CancellationToken cancellationToken)
    {
        var locale = ResolveLocale();
        return OkResult(await _messages.GetMessageAsync(
            id, UserContext.UserId, UserContext.Role, locale, cancellationToken));
    }

    [HttpPost("in-app-messages/{id}/seen")]
    public async Task<ActionResult> MarkSeen(string id, CancellationToken cancellationToken)
    {
        await _messages.MarkSeenAsync(id, UserContext.UserId, UserContext.Role, cancellationToken);
        return NoContent();
    }

    [HttpPost("in-app-messages/{id}/dismiss")]
    public async Task<ActionResult> Dismiss(string id, CancellationToken cancellationToken)
    {
        await _messages.DismissAsync(id, UserContext.UserId, UserContext.Role, cancellationToken);
        return NoContent();
    }

    [HttpPost("in-app-messages/{id}/respond")]
    public async Task<ActionResult<InAppMessageDto>> Respond(
        string id,
        [FromBody] RespondInAppMessageDto request,
        CancellationToken cancellationToken)
    {
        var locale = ResolveLocale();
        var displayName = await ResolveDisplayNameAsync(cancellationToken);
        return OkResult(await _messages.RespondAsync(
            id,
            UserContext.UserId,
            UserContext.Role,
            displayName,
            locale,
            request,
            cancellationToken));
    }

    private string ResolveLocale()
    {
        var header = Request.Headers.AcceptLanguage.FirstOrDefault() ?? "el";
        return header.StartsWith("en", StringComparison.OrdinalIgnoreCase) ? "en" : "el";
    }

    private async Task<string?> ResolveDisplayNameAsync(CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(UserContext.UserId, cancellationToken);
        if (user == null)
        {
            return null;
        }

        var name = string.Join(
            " ",
            new[] { user.FirstName, user.LastName }.Where(p => !string.IsNullOrWhiteSpace(p))).Trim();
        return string.IsNullOrWhiteSpace(name) ? user.Email : name;
    }
}

[Authorize(Policy = PolicyNames.RequireAdministrator)]
[Route("api/v1/admin/feedback")]
public class AdminFeedbackController : BaseApiController
{
    private readonly IAdminFeedbackService _feedback;

    public AdminFeedbackController(IAdminFeedbackService feedback, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _feedback = feedback;
    }

    [HttpGet]
    public async Task<ActionResult<AdminFeedbackPageDto>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30,
        CancellationToken cancellationToken = default)
    {
        return OkResult(await _feedback.ListAsync(page, pageSize, cancellationToken));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AdminFeedbackDetailDto>> Get(string id, CancellationToken cancellationToken)
    {
        return OkResult(await _feedback.GetAsync(id, cancellationToken));
    }

    [HttpPost("{id}/seen")]
    public async Task<ActionResult> MarkSeen(string id, CancellationToken cancellationToken)
    {
        await _feedback.MarkSeenAsync(id, cancellationToken);
        return NoContent();
    }
}
