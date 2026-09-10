using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.FieldWork;

namespace OliveLifecycle.Application.Services;

public interface IFieldPhenologyService
{
    Task<FieldPhenologyDto> GetCurrentAsync(
        string fieldId,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldPhenologyObservationDto> RecordAsync(
        string fieldId,
        CreateFieldPhenologyObservationDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FieldPhenologyObservationDto>> ListAsync(
        string fieldId,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);
}

public class FieldPhenologyService : IFieldPhenologyService
{
    private readonly IFieldPhenologyObservationRepository _observations;
    private readonly IFieldWorkAuthorizationService _auth;
    private readonly ITaskProposalEngine _proposalEngine;
    private readonly IDateTimeProvider _clock;

    public FieldPhenologyService(
        IFieldPhenologyObservationRepository observations,
        IFieldWorkAuthorizationService auth,
        ITaskProposalEngine proposalEngine,
        IDateTimeProvider clock)
    {
        _observations = observations;
        _auth = auth;
        _proposalEngine = proposalEngine;
        _clock = clock;
    }

    public async Task<FieldPhenologyDto> GetCurrentAsync(
        string fieldId,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanViewFieldWorkAsync(fieldId, userId, userRole, cancellationToken);
        var observations = await _observations.GetByFieldIdAsync(fieldId, cancellationToken);
        var snapshot = PhenologyResolver.Resolve(observations);
        return FieldWorkMapper.ToDto(fieldId, snapshot, language);
    }

    public async Task<FieldPhenologyObservationDto> RecordAsync(
        string fieldId,
        CreateFieldPhenologyObservationDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanRecordPhenologyAsync(fieldId, userId, userRole, cancellationToken);

        var source = PhenologySourceExtensions.FromApiString(dto.Source) ?? PhenologySource.User;
        if (userRole == Roles.Agronomist && dto.Source is null)
        {
            source = PhenologySource.Agronomist;
        }

        var now = _clock.UtcNow;
        var observation = new FieldPhenologyObservation
        {
            FieldId = fieldId,
            StageCode = OliveBbchStageExtensions.FromApiString(dto.StageCode),
            ObservedOn = dto.ObservedOn?.ToUniversalTime() ?? now,
            Source = source,
            Confidence = ProposalConfidenceExtensions.FromApiString(dto.Confidence)
                ?? ProposalConfidence.WorthChecking,
            PhotoIds = dto.PhotoIds?.ToList() ?? [],
            Notes = dto.Notes,
            ObservedByUserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _observations.CreateAsync(observation, cancellationToken);
        await _proposalEngine.EvaluateFieldAsync(fieldId, resultYear: null, cancellationToken: cancellationToken);
        return FieldWorkMapper.ToDto(created, language);
    }

    public async Task<IReadOnlyList<FieldPhenologyObservationDto>> ListAsync(
        string fieldId,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanViewFieldWorkAsync(fieldId, userId, userRole, cancellationToken);
        var observations = await _observations.GetByFieldIdAsync(fieldId, cancellationToken);
        return observations.Select(o => FieldWorkMapper.ToDto(o, language)).ToList();
    }
}
