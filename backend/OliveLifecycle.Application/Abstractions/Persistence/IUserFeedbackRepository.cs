using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IUserFeedbackRepository : IRepository<UserFeedback, string>
{
    Task<(IReadOnlyList<UserFeedback> Items, int Total)> GetNewestPageAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<int> CountUnseenAsync(CancellationToken cancellationToken = default);
}
