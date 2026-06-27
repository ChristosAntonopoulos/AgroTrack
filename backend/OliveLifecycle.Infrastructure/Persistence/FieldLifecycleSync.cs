using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;
using Microsoft.Extensions.Logging;

namespace OliveLifecycle.Infrastructure.Persistence;

public class FieldLifecycleSync : IFieldLifecycleSync
{
    private readonly IMongoClient _client;
    private readonly MongoDbContext _context;
    private readonly ILogger<FieldLifecycleSync> _logger;

    public FieldLifecycleSync(IMongoClient client, MongoDbContext context, ILogger<FieldLifecycleSync> logger)
    {
        _client = client;
        _context = context;
        _logger = logger;
    }

    public async Task SyncAsync(Field field, Lifecycle lifecycle, CancellationToken cancellationToken = default)
    {
        using var session = await _client.StartSessionAsync(cancellationToken: cancellationToken);
        session.StartTransaction();

        try
        {
            var fields = _context.GetCollection<FieldDocument>("fields");
            var lifecycles = _context.GetCollection<LifecycleDocument>("lifecycles");

            var fieldDoc = FieldMapper.ToDocument(field);
            var lifecycleDoc = LifecycleMapper.ToDocument(lifecycle);

            await fields.ReplaceOneAsync(
                session,
                Builders<FieldDocument>.Filter.Eq(f => f.Id, field.Id),
                fieldDoc,
                cancellationToken: cancellationToken);

            await lifecycles.ReplaceOneAsync(
                session,
                Builders<LifecycleDocument>.Filter.Eq(l => l.Id, lifecycle.Id),
                lifecycleDoc,
                cancellationToken: cancellationToken);

            await session.CommitTransactionAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Field/lifecycle transaction failed, falling back to sequential updates");
            await session.AbortTransactionAsync(cancellationToken);

            var fieldRepo = _context.GetCollection<FieldDocument>("fields");
            var lifecycleRepo = _context.GetCollection<LifecycleDocument>("lifecycles");
            await fieldRepo.ReplaceOneAsync(f => f.Id == field.Id, FieldMapper.ToDocument(field), cancellationToken: cancellationToken);
            await lifecycleRepo.ReplaceOneAsync(l => l.Id == lifecycle.Id, LifecycleMapper.ToDocument(lifecycle), cancellationToken: cancellationToken);
        }
    }
}
