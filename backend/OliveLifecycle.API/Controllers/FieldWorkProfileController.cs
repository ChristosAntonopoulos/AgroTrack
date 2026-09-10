using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/fields/{fieldId}/work-profile")]
public class FieldWorkProfileController : BaseApiController
{
    private readonly IFieldWorkProfileService _profiles;
    private readonly IFieldWorkPlanPreviewService _planPreview;
    private readonly IFieldWorkLearningService _learning;

    public FieldWorkProfileController(
        IFieldWorkProfileService profiles,
        IFieldWorkPlanPreviewService planPreview,
        IFieldWorkLearningService learning,
        ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _profiles = profiles;
        _planPreview = planPreview;
        _learning = learning;
    }

    [HttpGet]
    public async Task<ActionResult<FieldWorkProfileDto?>> Get(
        string fieldId,
        CancellationToken cancellationToken)
    {
        var result = await _profiles.GetAsync(
            fieldId,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(result);
    }

    [HttpPost]
    public async Task<ActionResult<FieldWorkProfileDto>> CreateDraft(
        string fieldId,
        [FromBody] CreateFieldWorkProfileDto? dto,
        CancellationToken cancellationToken)
    {
        var result = await _profiles.CreateDraftAsync(
            fieldId,
            dto ?? new CreateFieldWorkProfileDto(),
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return CreatedResult(nameof(Get), new { fieldId }, result);
    }

    /// <summary>Resume / save onboarding answers without activating.</summary>
    [HttpPut]
    public async Task<ActionResult<FieldWorkProfileDto>> Update(
        string fieldId,
        [FromBody] UpdateFieldWorkProfileDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _profiles.UpdateAsync(
            fieldId,
            dto,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(result);
    }

    [HttpPost("activate")]
    public async Task<ActionResult<FieldWorkProfileDto>> Activate(
        string fieldId,
        [FromBody] ActivateFieldWorkProfileDto? dto,
        CancellationToken cancellationToken)
    {
        var result = await _profiles.ActivateAsync(
            fieldId,
            dto,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(result);
    }

    /// <summary>
    /// Copy practice preferences to other Active fields.
    /// Irrigation, last-performed dates, and assignments require explicit flags (off by default).
    /// Does not grant field access or financial visibility.
    /// </summary>
    [HttpPost("copy")]
    public async Task<ActionResult<CopyFieldWorkProfileResultDto>> Copy(
        string fieldId,
        [FromBody] CopyFieldWorkProfileDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _profiles.CopyAsync(
            fieldId,
            dto,
            UserContext.UserId,
            UserContext.Role,
            cancellationToken);
        return OkResult(result);
    }

    /// <summary>
    /// Dry-run year plan from draft/active profile eligibility. Does not create FieldTasks.
    /// </summary>
    [HttpGet("plan-preview")]
    public async Task<ActionResult<FieldWorkPlanPreviewDto>> GetPlanPreview(
        string fieldId,
        [FromQuery] int? year,
        CancellationToken cancellationToken)
    {
        var result = await _planPreview.GetAsync(
            fieldId,
            year,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(result);
    }

    /// <summary>Soft annual-review / incremental-question status (Phase 6).</summary>
    [HttpGet("learning/status")]
    public async Task<ActionResult<FieldWorkLearningStatusDto>> GetLearningStatus(
        string fieldId,
        CancellationToken cancellationToken)
    {
        var result = await _learning.GetStatusAsync(
            fieldId,
            UserContext.UserId,
            UserContext.Role,
            cancellationToken);
        return OkResult(result);
    }

    /// <summary>Whether repeated dismissals should prompt preference learning. Does not mutate profile.</summary>
    [HttpPost("learning/dismissal-evaluate")]
    public async Task<ActionResult<DismissalLearningEvaluateResultDto>> EvaluateDismissalLearning(
        string fieldId,
        [FromBody] DismissalLearningEvaluateDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _learning.EvaluateDismissalAsync(
            fieldId,
            dto,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(result);
    }

    /// <summary>Apply dismissal preference after explicit user choice. Sets ConfirmedAt + UpdatedByUserId.</summary>
    [HttpPost("learning/dismissal-apply")]
    public async Task<ActionResult<FieldWorkProfileDto>> ApplyDismissalLearning(
        string fieldId,
        [FromBody] DismissalLearningApplyDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _learning.ApplyDismissalAsync(
            fieldId,
            dto,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(result);
    }

    /// <summary>Whether completion should prompt frequency learning. Does not mutate profile.</summary>
    [HttpPost("learning/completion-evaluate")]
    public async Task<ActionResult<CompletionLearningEvaluateResultDto>> EvaluateCompletionLearning(
        string fieldId,
        [FromBody] CompletionLearningEvaluateDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _learning.EvaluateCompletionAsync(
            fieldId,
            dto,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(result);
    }

    /// <summary>
    /// Apply completion frequency after explicit confirm. no_change writes nothing.
    /// </summary>
    [HttpPost("learning/completion-apply")]
    public async Task<ActionResult<FieldWorkProfileDto>> ApplyCompletionLearning(
        string fieldId,
        [FromBody] CompletionLearningApplyDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _learning.ApplyCompletionAsync(
            fieldId,
            dto,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(result);
    }

    /// <summary>Record LastReviewedAt (annual soft review / incremental question ack).</summary>
    [HttpPost("learning/mark-reviewed")]
    public async Task<ActionResult<FieldWorkProfileDto>> MarkLearningReviewed(
        string fieldId,
        [FromBody] MarkProfileReviewedDto? dto,
        CancellationToken cancellationToken)
    {
        var result = await _learning.MarkReviewedAsync(
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
