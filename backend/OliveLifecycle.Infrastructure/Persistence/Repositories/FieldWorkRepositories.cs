using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents.FieldWork;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class FieldWorkTaskTemplateRepository
    : MongoRepositoryBase<FieldWorkTaskTemplateDocument, FieldWorkTaskTemplate>,
      IFieldWorkTaskTemplateRepository
{
    public FieldWorkTaskTemplateRepository(MongoDbContext context) : base(context, "field_work_templates")
    {
    }

    protected override FieldWorkTaskTemplateDocument ToDocument(FieldWorkTaskTemplate entity) =>
        FieldWorkPersistenceMapper.ToDocument(entity);

    protected override FieldWorkTaskTemplate ToEntity(FieldWorkTaskTemplateDocument document) =>
        FieldWorkPersistenceMapper.ToEntity(document);

    protected override FilterDefinition<FieldWorkTaskTemplateDocument> BuildIdFilter(string id) =>
        Builders<FieldWorkTaskTemplateDocument>.Filter.Eq(t => t.Id, id);

    public async Task<FieldWorkTaskTemplate?> GetByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        var document = await Collection
            .Find(t => t.Code == code)
            .FirstOrDefaultAsync(cancellationToken);
        return document is null ? null : ToEntity(document);
    }

    public async Task<IReadOnlyList<FieldWorkTaskTemplate>> GetActiveAsync(CancellationToken cancellationToken = default)
    {
        var documents = await Collection.Find(t => t.IsActive).ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }
}

public class FieldWorkTaskTemplateVersionRepository
    : MongoRepositoryBase<FieldWorkTaskTemplateVersionDocument, FieldWorkTaskTemplateVersion>,
      IFieldWorkTaskTemplateVersionRepository
{
    public FieldWorkTaskTemplateVersionRepository(MongoDbContext context)
        : base(context, "field_work_template_versions")
    {
    }

    protected override FieldWorkTaskTemplateVersionDocument ToDocument(FieldWorkTaskTemplateVersion entity) =>
        FieldWorkPersistenceMapper.ToDocument(entity);

    protected override FieldWorkTaskTemplateVersion ToEntity(FieldWorkTaskTemplateVersionDocument document) =>
        FieldWorkPersistenceMapper.ToEntity(document);

    protected override FilterDefinition<FieldWorkTaskTemplateVersionDocument> BuildIdFilter(string id) =>
        Builders<FieldWorkTaskTemplateVersionDocument>.Filter.Eq(t => t.Id, id);

    public async Task<FieldWorkTaskTemplateVersion?> GetByCodeAndVersionAsync(
        string templateCode,
        int version,
        CancellationToken cancellationToken = default)
    {
        var document = await Collection
            .Find(t => t.TemplateCode == templateCode && t.Version == version)
            .FirstOrDefaultAsync(cancellationToken);
        return document is null ? null : ToEntity(document);
    }

    public async Task<FieldWorkTaskTemplateVersion?> GetCurrentAsync(
        string templateCode,
        CancellationToken cancellationToken = default)
    {
        var document = await Collection
            .Find(t => t.TemplateCode == templateCode && t.IsActive)
            .SortByDescending(t => t.Version)
            .FirstOrDefaultAsync(cancellationToken);
        return document is null ? null : ToEntity(document);
    }
}

public class TaskProposalRepository
    : MongoRepositoryBase<TaskProposalDocument, TaskProposal>,
      ITaskProposalRepository
{
    public TaskProposalRepository(MongoDbContext context) : base(context, "task_proposals")
    {
    }

    protected override TaskProposalDocument ToDocument(TaskProposal entity) =>
        FieldWorkPersistenceMapper.ToDocument(entity);

    protected override TaskProposal ToEntity(TaskProposalDocument document) =>
        FieldWorkPersistenceMapper.ToEntity(document);

    protected override FilterDefinition<TaskProposalDocument> BuildIdFilter(string id) =>
        Builders<TaskProposalDocument>.Filter.Eq(t => t.Id, id);

    public async Task<IReadOnlyList<TaskProposal>> QueryAsync(
        TaskProposalQuery query,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<TaskProposalDocument>.Filter.Empty;

        if (!string.IsNullOrWhiteSpace(query.FieldId))
        {
            filter &= Builders<TaskProposalDocument>.Filter.Eq(p => p.FieldId, query.FieldId);
        }

        if (query.FieldIds is { Count: > 0 })
        {
            filter &= Builders<TaskProposalDocument>.Filter.In(p => p.FieldId, query.FieldIds);
        }

        if (query.ResultYear.HasValue)
        {
            filter &= Builders<TaskProposalDocument>.Filter.Eq(p => p.ResultYear, query.ResultYear.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.TemplateCode))
        {
            filter &= Builders<TaskProposalDocument>.Filter.Eq(p => p.TemplateCode, query.TemplateCode);
        }

        if (query.ActiveOnly)
        {
            filter &= Builders<TaskProposalDocument>.Filter.In(
                p => p.Status,
                new[]
                {
                    TaskProposalStatus.Active.ToApiString(),
                    TaskProposalStatus.Snoozed.ToApiString()
                });
        }
        else if (query.Status.HasValue)
        {
            filter &= Builders<TaskProposalDocument>.Filter.Eq(p => p.Status, query.Status.Value.ToApiString());
        }
        else if (query.Statuses is { Count: > 0 })
        {
            filter &= Builders<TaskProposalDocument>.Filter.In(
                p => p.Status,
                query.Statuses.Select(s => s.ToApiString()));
        }

        var documents = await Collection
            .Find(filter)
            .SortByDescending(p => p.GeneratedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<TaskProposal?> GetOpenByDedupKeyAsync(
        string dedupKey,
        CancellationToken cancellationToken = default)
    {
        var openStatuses = new[]
        {
            TaskProposalStatus.Active.ToApiString(),
            TaskProposalStatus.Snoozed.ToApiString()
        };
        var document = await Collection
            .Find(p => p.DedupKey == dedupKey && openStatuses.Contains(p.Status))
            .FirstOrDefaultAsync(cancellationToken);
        return document is null ? null : ToEntity(document);
    }

    public async Task<bool> HasDismissedForYearAsync(
        string fieldId,
        string templateCode,
        int resultYear,
        CancellationToken cancellationToken = default)
    {
        var status = TaskProposalStatus.DismissedForYear.ToApiString();
        return await Collection
            .Find(p =>
                p.FieldId == fieldId
                && p.TemplateCode == templateCode
                && p.ResultYear == resultYear
                && p.Status == status)
            .AnyAsync(cancellationToken);
    }
}

public class FieldTaskRepository
    : MongoRepositoryBase<FieldTaskDocument, FieldTask>,
      IFieldTaskRepository
{
    public FieldTaskRepository(MongoDbContext context) : base(context, "field_tasks")
    {
    }

    protected override FieldTaskDocument ToDocument(FieldTask entity) =>
        FieldWorkPersistenceMapper.ToDocument(entity);

    protected override FieldTask ToEntity(FieldTaskDocument document) =>
        FieldWorkPersistenceMapper.ToEntity(document);

    protected override FilterDefinition<FieldTaskDocument> BuildIdFilter(string id) =>
        Builders<FieldTaskDocument>.Filter.Eq(t => t.Id, id);

    public async Task<IReadOnlyList<FieldTask>> QueryAsync(
        FieldTaskQuery query,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<FieldTaskDocument>.Filter.Empty;

        if (!string.IsNullOrWhiteSpace(query.FieldId))
        {
            filter &= Builders<FieldTaskDocument>.Filter.Eq(t => t.FieldId, query.FieldId);
        }

        if (query.FieldIds is { Count: > 0 })
        {
            filter &= Builders<FieldTaskDocument>.Filter.In(t => t.FieldId, query.FieldIds);
        }

        if (query.ResultYear.HasValue)
        {
            filter &= Builders<FieldTaskDocument>.Filter.Eq(t => t.ResultYear, query.ResultYear.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.AssignedUserId))
        {
            filter &= Builders<FieldTaskDocument>.Filter.Eq(t => t.AssignedUserId, query.AssignedUserId);
        }

        if (query.Status.HasValue)
        {
            filter &= Builders<FieldTaskDocument>.Filter.Eq(t => t.Status, query.Status.Value.ToApiString());
        }
        else if (query.Statuses is { Count: > 0 })
        {
            filter &= Builders<FieldTaskDocument>.Filter.In(
                t => t.Status,
                query.Statuses.Select(s => s.ToApiString()));
        }

        var documents = await Collection
            .Find(filter)
            .SortByDescending(t => t.PlannedStart)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<FieldTask?> GetByProposalIdAsync(string proposalId, CancellationToken cancellationToken = default)
    {
        var document = await Collection
            .Find(t => t.ProposalId == proposalId)
            .FirstOrDefaultAsync(cancellationToken);
        return document is null ? null : ToEntity(document);
    }
}

public class TaskExecutionRepository
    : MongoRepositoryBase<TaskExecutionDocument, TaskExecution>,
      ITaskExecutionRepository
{
    public TaskExecutionRepository(MongoDbContext context) : base(context, "task_executions")
    {
    }

    protected override TaskExecutionDocument ToDocument(TaskExecution entity) =>
        FieldWorkPersistenceMapper.ToDocument(entity);

    protected override TaskExecution ToEntity(TaskExecutionDocument document) =>
        FieldWorkPersistenceMapper.ToEntity(document);

    protected override FilterDefinition<TaskExecutionDocument> BuildIdFilter(string id) =>
        Builders<TaskExecutionDocument>.Filter.Eq(t => t.Id, id);

    public async Task<IReadOnlyList<TaskExecution>> GetByTaskIdAsync(
        string taskId,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(e => e.TaskId == taskId)
            .SortByDescending(e => e.CompletedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<IReadOnlyList<TaskExecution>> GetByFieldAndYearAsync(
        string fieldId,
        int resultYear,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(e => e.FieldId == fieldId && e.ResultYear == resultYear)
            .SortByDescending(e => e.CompletedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<IReadOnlyList<TaskExecution>> GetByFieldIdAsync(
        string fieldId,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(e => e.FieldId == fieldId)
            .SortByDescending(e => e.CompletedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<IReadOnlyList<TaskExecution>> GetByFieldIdsAsync(
        IReadOnlyList<string> fieldIds,
        CancellationToken cancellationToken = default)
    {
        if (fieldIds.Count == 0)
        {
            return Array.Empty<TaskExecution>();
        }

        var documents = await Collection
            .Find(Builders<TaskExecutionDocument>.Filter.In(e => e.FieldId, fieldIds))
            .SortByDescending(e => e.CompletedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }
}

public class FieldPhenologyObservationRepository
    : MongoRepositoryBase<FieldPhenologyObservationDocument, FieldPhenologyObservation>,
      IFieldPhenologyObservationRepository
{
    public FieldPhenologyObservationRepository(MongoDbContext context)
        : base(context, "field_phenology_observations")
    {
    }

    protected override FieldPhenologyObservationDocument ToDocument(FieldPhenologyObservation entity) =>
        FieldWorkPersistenceMapper.ToDocument(entity);

    protected override FieldPhenologyObservation ToEntity(FieldPhenologyObservationDocument document) =>
        FieldWorkPersistenceMapper.ToEntity(document);

    protected override FilterDefinition<FieldPhenologyObservationDocument> BuildIdFilter(string id) =>
        Builders<FieldPhenologyObservationDocument>.Filter.Eq(t => t.Id, id);

    public async Task<IReadOnlyList<FieldPhenologyObservation>> GetByFieldIdAsync(
        string fieldId,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(o => o.FieldId == fieldId)
            .SortByDescending(o => o.ObservedOn)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }
}

public class TaskWeatherEvaluationRepository
    : MongoRepositoryBase<TaskWeatherEvaluationDocument, TaskWeatherEvaluation>,
      ITaskWeatherEvaluationRepository
{
    public TaskWeatherEvaluationRepository(MongoDbContext context)
        : base(context, "task_weather_evaluations")
    {
    }

    protected override TaskWeatherEvaluationDocument ToDocument(TaskWeatherEvaluation entity) =>
        FieldWorkPersistenceMapper.ToDocument(entity);

    protected override TaskWeatherEvaluation ToEntity(TaskWeatherEvaluationDocument document) =>
        FieldWorkPersistenceMapper.ToEntity(document);

    protected override FilterDefinition<TaskWeatherEvaluationDocument> BuildIdFilter(string id) =>
        Builders<TaskWeatherEvaluationDocument>.Filter.Eq(t => t.Id, id);
}

public class OfficialAgriculturalWarningRepository
    : MongoRepositoryBase<OfficialAgriculturalWarningDocument, OfficialAgriculturalWarning>,
      IOfficialAgriculturalWarningRepository
{
    public OfficialAgriculturalWarningRepository(MongoDbContext context)
        : base(context, "official_agricultural_warnings")
    {
    }

    protected override OfficialAgriculturalWarningDocument ToDocument(OfficialAgriculturalWarning entity) =>
        FieldWorkPersistenceMapper.ToDocument(entity);

    protected override OfficialAgriculturalWarning ToEntity(OfficialAgriculturalWarningDocument document) =>
        FieldWorkPersistenceMapper.ToEntity(document);

    protected override FilterDefinition<OfficialAgriculturalWarningDocument> BuildIdFilter(string id) =>
        Builders<OfficialAgriculturalWarningDocument>.Filter.Eq(t => t.Id, id);

    public async Task<IReadOnlyList<OfficialAgriculturalWarning>> GetActiveForFieldAsync(
        string fieldId,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<OfficialAgriculturalWarningDocument>.Filter.And(
            Builders<OfficialAgriculturalWarningDocument>.Filter.Eq(w => w.IsActive, true),
            Builders<OfficialAgriculturalWarningDocument>.Filter.Or(
                Builders<OfficialAgriculturalWarningDocument>.Filter.AnyEq(w => w.FieldIds, fieldId),
                Builders<OfficialAgriculturalWarningDocument>.Filter.Size(w => w.FieldIds, 0)));
        var documents = await Collection.Find(filter).ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }
}

public class FieldWorkProfileRepository
    : MongoRepositoryBase<FieldWorkProfileDocument, FieldWorkProfile>,
      IFieldWorkProfileRepository
{
    public FieldWorkProfileRepository(MongoDbContext context)
        : base(context, "field_work_profiles")
    {
    }

    protected override FieldWorkProfileDocument ToDocument(FieldWorkProfile entity) =>
        FieldWorkPersistenceMapper.ToDocument(entity);

    protected override FieldWorkProfile ToEntity(FieldWorkProfileDocument document) =>
        FieldWorkPersistenceMapper.ToEntity(document);

    protected override FilterDefinition<FieldWorkProfileDocument> BuildIdFilter(string id) =>
        Builders<FieldWorkProfileDocument>.Filter.Eq(t => t.Id, id);

    public async Task<FieldWorkProfile?> GetByFieldIdAsync(
        string fieldId,
        CancellationToken cancellationToken = default)
    {
        var document = await Collection
            .Find(p => p.FieldId == fieldId)
            .FirstOrDefaultAsync(cancellationToken);
        return document is null ? null : ToEntity(document);
    }
}
