using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class NoteRepository
    : MongoRepositoryBase<NoteDocument, Note>, INoteRepository
{
    public NoteRepository(MongoDbContext context) : base(context, "notes")
    {
    }

    protected override NoteDocument ToDocument(Note entity) =>
        NoteMapper.ToDocument(entity);

    protected override Note ToEntity(NoteDocument document) =>
        NoteMapper.ToEntity(document);

    protected override FilterDefinition<NoteDocument> BuildIdFilter(string id) =>
        Builders<NoteDocument>.Filter.Eq(n => n.Id, id);

    public async Task<IReadOnlyList<Note>> GetByOwnerUserIdAsync(
        string ownerUserId,
        string? fieldId = null,
        int? limit = null,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<NoteDocument>.Filter.Eq(n => n.OwnerUserId, ownerUserId);
        if (!string.IsNullOrWhiteSpace(fieldId))
        {
            filter &= Builders<NoteDocument>.Filter.Eq(n => n.FieldId, fieldId);
        }

        var query = Collection
            .Find(filter)
            .SortByDescending(n => n.Pinned)
            .ThenByDescending(n => n.UpdatedAt);

        List<NoteDocument> documents;
        if (limit is > 0)
        {
            documents = await query.Limit(limit.Value).ToListAsync(cancellationToken);
        }
        else
        {
            documents = await query.ToListAsync(cancellationToken);
        }

        return documents.Select(ToEntity).ToList();
    }
}
