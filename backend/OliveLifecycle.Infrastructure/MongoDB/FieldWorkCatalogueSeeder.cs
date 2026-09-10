using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using OliveLifecycle.Core.FieldWork;
using OliveLifecycle.Infrastructure.Persistence.Documents.FieldWork;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.MongoDB;

public static class FieldWorkCatalogueSeeder
{
    public static async Task SeedAsync(
        MongoDbContext context,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var templates = context.GetCollection<FieldWorkTaskTemplateDocument>("field_work_templates");
        var versions = context.GetCollection<FieldWorkTaskTemplateVersionDocument>("field_work_template_versions");
        var now = DateTime.UtcNow;
        var upserted = 0;

        foreach (var entry in FieldWorkCatalogue.All.Concat(FieldWorkEventCatalogue.All))
        {
            var template = FieldWorkCatalogueMapper.ToTemplate(entry);
            template.UpdatedAt = now;

            var existing = await templates.Find(t => t.Code == entry.Code).FirstOrDefaultAsync(cancellationToken);
            if (existing is null)
            {
                template.Id = ObjectId.GenerateNewId().ToString();
                template.CreatedAt = now;
                await templates.InsertOneAsync(FieldWorkPersistenceMapper.ToDocument(template), cancellationToken: cancellationToken);
            }
            else
            {
                template.Id = existing.Id;
                template.CreatedAt = existing.CreatedAt;
                await templates.ReplaceOneAsync(
                    t => t.Id == existing.Id,
                    FieldWorkPersistenceMapper.ToDocument(template),
                    cancellationToken: cancellationToken);
            }

            var version = FieldWorkCatalogueMapper.ToVersion(entry);
            version.UpdatedAt = now;

            var existingVersion = await versions
                .Find(v => v.TemplateCode == entry.Code && v.Version == FieldWorkCatalogue.Version)
                .FirstOrDefaultAsync(cancellationToken);
            if (existingVersion is null)
            {
                version.Id = ObjectId.GenerateNewId().ToString();
                version.CreatedAt = now;
                await versions.InsertOneAsync(FieldWorkPersistenceMapper.ToDocument(version), cancellationToken: cancellationToken);
            }
            else
            {
                version.Id = existingVersion.Id;
                version.CreatedAt = existingVersion.CreatedAt;
                await versions.ReplaceOneAsync(
                    v => v.Id == existingVersion.Id,
                    FieldWorkPersistenceMapper.ToDocument(version),
                    cancellationToken: cancellationToken);
            }

            upserted++;
        }

        logger.LogInformation("Seeded {Count} field-work catalogue templates (T01–T24 + E01–E08).", upserted);
    }
}
