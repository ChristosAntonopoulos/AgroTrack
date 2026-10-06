using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.OilStock;

namespace OliveLifecycle.Application.Services;

public sealed class FieldDeletionGuard : IFieldDeletionGuard
{
    private readonly IFieldRepository _fields;
    private readonly IFinancialTransactionRepository _transactions;
    private readonly IHarvestRecordRepository _harvests;
    private readonly IFieldTaskRepository _tasks;
    private readonly ITaskExecutionRepository _executions;
    private readonly IFieldPhenologyObservationRepository _phenology;
    private readonly IActivityRepository _activities;
    private readonly INoteRepository _notes;
    private readonly IMediaAttachmentRepository _media;
    private readonly ILifecycleRepository _lifecycles;
    private readonly IOilCellarRepository _cellars;
    private readonly IOilLotRepository _lots;
    private readonly IOilPressingRepository _pressings;
    private readonly IFieldWorkProfileRepository _workProfiles;

    public FieldDeletionGuard(
        IFieldRepository fields,
        IFinancialTransactionRepository transactions,
        IHarvestRecordRepository harvests,
        IFieldTaskRepository tasks,
        ITaskExecutionRepository executions,
        IFieldPhenologyObservationRepository phenology,
        IActivityRepository activities,
        INoteRepository notes,
        IMediaAttachmentRepository media,
        ILifecycleRepository lifecycles,
        IOilCellarRepository cellars,
        IOilLotRepository lots,
        IOilPressingRepository pressings,
        IFieldWorkProfileRepository workProfiles)
    {
        _fields = fields;
        _transactions = transactions;
        _harvests = harvests;
        _tasks = tasks;
        _executions = executions;
        _phenology = phenology;
        _activities = activities;
        _notes = notes;
        _media = media;
        _lifecycles = lifecycles;
        _cellars = cellars;
        _lots = lots;
        _pressings = pressings;
        _workProfiles = workProfiles;
    }

    public async Task<bool> HasLinkedRecordsAsync(
        string fieldId,
        string ownerId,
        CancellationToken cancellationToken = default)
    {
        var summary = await InspectAsync(fieldId, ownerId, cancellationToken);
        return summary.HasAny;
    }

    public async Task<FieldLinkSummary> InspectAsync(
        string fieldId,
        string ownerId,
        CancellationToken cancellationToken = default)
    {
        var field = await _fields.GetByIdAsync(fieldId, cancellationToken);
        var hasCollaborators = false;
        var hasDocuments = false;
        if (field != null)
        {
            FieldPeopleRules.EnsureNormalized(field);
            hasCollaborators = field.People.Any(p =>
                p.Status == FamilyMemberStatuses.Active
                && !string.Equals(p.UserId, ownerId, StringComparison.Ordinal)
                && p.Role != FieldPersonRole.Admin);
            hasDocuments = field.Documents.Count > 0;
        }

        var moneyPage = await _transactions.QueryAsync(
            new FinancialTransactionQuery
            {
                FieldId = fieldId,
                Page = 1,
                PageSize = 1
            },
            cancellationToken);

        var harvests = await _harvests.GetByFieldIdAsync(fieldId, cancellationToken);
        var hasHarvest = harvests.Any();

        var tasks = await _tasks.QueryAsync(
            new FieldTaskQuery { FieldId = fieldId },
            cancellationToken);
        var executions = await _executions.GetByFieldIdAsync(fieldId, cancellationToken);
        var phenology = await _phenology.GetByFieldIdAsync(fieldId, cancellationToken);
        var workProfile = await _workProfiles.GetByFieldIdAsync(fieldId, cancellationToken);
        var hasTasksOrWork = tasks.Count > 0
            || executions.Count > 0
            || phenology.Count > 0
            || workProfile != null;

        var activities = await _activities.GetByFieldIdAsync(fieldId, limit: 1, cancellationToken);
        var hasChronologioOrActivity = activities.Any();

        var notes = await _notes.GetByOwnerUserIdAsync(ownerId, fieldId, limit: 1, cancellationToken);
        var hasNotes = notes.Count > 0;

        var mediaPage = await _media.QueryAsync(
            new MediaAttachmentQuery
            {
                FieldId = fieldId,
                Page = 1,
                PageSize = 1
            },
            cancellationToken);
        var hasPhotosOrDocuments = mediaPage.TotalCount > 0 || hasDocuments;

        var lifecycle = await _lifecycles.GetByFieldIdAsync(fieldId, cancellationToken);
        var hasLifecycle = lifecycle != null;

        var hasOil = await HasOilProvenanceAsync(fieldId, ownerId, cancellationToken);

        return new FieldLinkSummary
        {
            HasChronologioOrActivity = hasChronologioOrActivity,
            HasMoney = moneyPage.TotalCount > 0,
            HasHarvest = hasHarvest,
            HasOilProvenance = hasOil,
            HasPhotosOrDocuments = hasPhotosOrDocuments,
            HasCollaborators = hasCollaborators,
            HasTasksOrWork = hasTasksOrWork,
            HasNotes = hasNotes,
            HasLifecycle = hasLifecycle
        };
    }

    private async Task<bool> HasOilProvenanceAsync(
        string fieldId,
        string ownerId,
        CancellationToken cancellationToken)
    {
        var pending = await _pressings.GetPendingAllocationAsync(null, [fieldId], cancellationToken);
        if (pending.Count > 0)
        {
            return true;
        }

        var recorded = await _pressings.GetByRecorderAsync(ownerId, resultYear: null, cancellationToken);
        if (recorded.Any(p => OilProvenance.FieldIds(p.Provenance).Contains(fieldId, StringComparer.Ordinal)
            || (p.FieldIds?.Contains(fieldId, StringComparer.Ordinal) ?? false)))
        {
            return true;
        }

        var cellar = await _cellars.GetByOwnerPersonIdAsync(ownerId, cancellationToken);
        if (cellar == null)
        {
            return false;
        }

        var lots = await _lots.GetByCellarIdAsync(cellar.Id, legacyOwnerUserId: ownerId, cancellationToken: cancellationToken);
        return lots.Any(lot =>
            OilProvenance.ShareFor(lot.Provenance, lot.FieldIds, fieldId) > 0m
            || lot.FieldIds.Contains(fieldId, StringComparer.Ordinal));
    }
}
