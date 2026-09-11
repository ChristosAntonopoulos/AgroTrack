using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Feedback;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/feedback")]
public class FeedbackController : BaseApiController
{
    private readonly IFeedbackService _feedback;

    public FeedbackController(IFeedbackService feedback, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _feedback = feedback;
    }

    [HttpPost]
    [RequestSizeLimit(12 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<FeedbackSubmittedDto>> Submit(
        [FromForm] string? comment,
        [FromForm] string? pageUrl,
        [FromForm] IFormFile? screenshot,
        [FromForm] IFormFile? photo,
        CancellationToken cancellationToken)
    {
        var submitted = await _feedback.SubmitAsync(
            UserContext.UserId,
            UserContext.Role,
            new SubmitFeedbackRequest
            {
                Comment = comment,
                PageUrl = pageUrl,
                UserAgent = Request.Headers.UserAgent.ToString(),
                Screenshot = ToFile(screenshot),
                Photo = ToFile(photo)
            },
            cancellationToken);

        return OkResult(submitted);
    }

    private static FeedbackFile? ToFile(IFormFile? file)
    {
        if (file == null || file.Length == 0)
        {
            return null;
        }

        return new FeedbackFile
        {
            Content = file.OpenReadStream(),
            FileName = file.FileName,
            ContentType = file.ContentType
        };
    }
}
