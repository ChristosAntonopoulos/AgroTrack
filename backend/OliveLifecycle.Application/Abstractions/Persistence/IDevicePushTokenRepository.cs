using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IDevicePushTokenRepository : IRepository<DevicePushToken, string>
{
    Task<IReadOnlyList<DevicePushToken>> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default);
    Task<DevicePushToken?> GetByTokenAsync(string expoPushToken, CancellationToken cancellationToken = default);
    Task UpsertAsync(DevicePushToken token, CancellationToken cancellationToken = default);
    Task<int> DeleteByUserIdAsync(string userId, CancellationToken cancellationToken = default);
    Task<bool> DeleteByTokenAsync(string userId, string expoPushToken, CancellationToken cancellationToken = default);
}
