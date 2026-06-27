using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IFieldLifecycleSync
{
    Task SyncAsync(Field field, Lifecycle lifecycle, CancellationToken cancellationToken = default);
}
