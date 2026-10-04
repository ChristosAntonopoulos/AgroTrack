using OliveLifecycle.Application.DTOs.Feedback;

namespace OliveLifecycle.Application.Services;

public interface IFeedbackService
{
    Task<FeedbackSubmittedDto> SubmitAsync(
        string userId,
        string role,
        SubmitFeedbackRequest request,
        CancellationToken cancellationToken = default);
}
