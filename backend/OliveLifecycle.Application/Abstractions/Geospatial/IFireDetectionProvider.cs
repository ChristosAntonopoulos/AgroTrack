using OliveLifecycle.Core.Entities.Geospatial;

namespace OliveLifecycle.Application.Abstractions.Geospatial;

public interface IFireDetectionProvider
{
    string ProviderName { get; }
    Task<IReadOnlyList<FireDetection>> FetchActiveFiresAsync(CancellationToken cancellationToken = default);
}
