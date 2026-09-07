using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.DTOs.Harvest;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class HarvestService : IHarvestService
{
    private readonly IHarvestRecordRepository _harvestRecordRepository;
    private readonly IFieldRepository _fieldRepository;
    private readonly IFieldAccessService _fieldAccessService;
    private readonly IFinancialEntryService _financialEntryService;
    private readonly IActivityService _activityService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ILogger<HarvestService> _logger;

    public HarvestService(
        IHarvestRecordRepository harvestRecordRepository,
        IFieldRepository fieldRepository,
        IFieldAccessService fieldAccessService,
        IFinancialEntryService financialEntryService,
        IActivityService activityService,
        IDateTimeProvider dateTimeProvider,
        ILogger<HarvestService> logger)
    {
        _harvestRecordRepository = harvestRecordRepository;
        _fieldRepository = fieldRepository;
        _fieldAccessService = fieldAccessService;
        _financialEntryService = financialEntryService;
        _activityService = activityService;
        _dateTimeProvider = dateTimeProvider;
        _logger = logger;
    }

    public async Task<HarvestRecordDetailDto> CreateAsync(
        CreateHarvestRecordDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserAccessFieldAsync(dto.FieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }

        var field = await _fieldRepository.GetByIdAsync(dto.FieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        var now = _dateTimeProvider.UtcNow;
        var harvestDate = dto.HarvestDate?.ToUniversalTime() ?? now;
        var oilYield = dto.OilYieldPercent;
        if (!oilYield.HasValue && dto.OilKg.HasValue && dto.OliveKg > 0)
        {
            oilYield = Math.Round(dto.OilKg.Value / dto.OliveKg * 100, 2);
        }

        var record = new HarvestRecord
        {
            FieldId = dto.FieldId,
            OwnerId = field.OwnerId,
            HarvestDate = harvestDate,
            HarvestMethod = dto.HarvestMethod?.Trim() ?? string.Empty,
            WorkersUsed = dto.WorkersUsed,
            OliveKg = dto.OliveKg,
            MillName = string.IsNullOrWhiteSpace(dto.MillName) ? null : dto.MillName.Trim(),
            OilKg = dto.OilKg,
            OilYieldPercent = oilYield,
            QualityGrade = dto.QualityGrade?.Trim() ?? string.Empty,
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            Status = FinancialEntryStatus.Posted,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _harvestRecordRepository.CreateAsync(record, cancellationToken);

        if (dto.SaleAmount.HasValue)
        {
            await _financialEntryService.CreateAsync(new CreateFinancialEntryDto
            {
                FieldId = dto.FieldId,
                HarvestId = created.Id,
                Kind = "income",
                Amount = dto.SaleAmount,
                Description = "Harvest sale",
                OccurredOn = harvestDate
            }, userId, userRole, cancellationToken);
        }

        if (dto.MillCost.HasValue)
        {
            await _financialEntryService.CreateAsync(new CreateFinancialEntryDto
            {
                FieldId = dto.FieldId,
                HarvestId = created.Id,
                Kind = "expense",
                Amount = dto.MillCost,
                Description = string.IsNullOrWhiteSpace(created.MillName) ? "Mill cost" : $"Mill cost — {created.MillName}",
                Category = "mill_cost",
                Bucket = "harvest",
                OccurredOn = harvestDate
            }, userId, userRole, cancellationToken);
        }

        await _activityService.RecordAsync(
            dto.FieldId,
            "harvest_recorded",
            $"Recorded harvest {created.OliveKg:0.##} kg olives",
            userId,
            null,
            new Dictionary<string, string>
            {
                ["harvestId"] = created.Id,
                ["oliveKg"] = created.OliveKg.ToString("0.##")
            },
            cancellationToken);

        _logger.LogInformation("Harvest {HarvestId} recorded on field {FieldId}", created.Id, dto.FieldId);
        return ToDto(created);
    }

    public async Task<IEnumerable<HarvestRecordDetailDto>> GetByFieldIdAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserAccessFieldAsync(fieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }

        var records = await _harvestRecordRepository.GetByFieldIdAsync(fieldId, cancellationToken);
        return records
            .Where(r => r.Status != FinancialEntryStatus.Voided)
            .Select(ToDto);
    }

    public async Task<HarvestRecordDetailDto> VoidAsync(
        string id,
        VoidHarvestRecordDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var record = await _harvestRecordRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Harvest record not found.");

        if (!await _fieldAccessService.CanUserAccessFieldAsync(record.FieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }

        if (!await _fieldAccessService.CanUserModifyFieldAsync(record.FieldId, userId, cancellationToken)
            && userRole != Roles.Administrator)
        {
            throw new ForbiddenException("Only a field owner can void a harvest.");
        }

        if (record.Status == FinancialEntryStatus.Voided)
        {
            throw new ValidationException("This harvest has already been voided.");
        }

        var now = _dateTimeProvider.UtcNow;
        record.Status = FinancialEntryStatus.Voided;
        record.VoidReason = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim();
        record.VoidedAt = now;
        record.VoidedBy = userId;
        record.UpdatedAt = now;

        var updated = await _harvestRecordRepository.UpdateAsync(record, cancellationToken);

        var ledger = await _financialEntryService.GetByFieldIdAsync(
            record.FieldId,
            userId,
            userRole,
            includeVoided: false,
            cancellationToken);
        foreach (var entry in ledger.Where(e => e.HarvestId == record.Id && e.Status != "voided"))
        {
            await _financialEntryService.VoidAsync(
                entry.Id,
                new VoidFinancialEntryDto { Reason = record.VoidReason ?? "Harvest voided" },
                userId,
                userRole,
                cancellationToken);
        }

        await _activityService.RecordAsync(
            record.FieldId,
            "harvest_voided",
            $"Voided harvest {updated.OliveKg:0.##} kg olives",
            userId,
            null,
            new Dictionary<string, string>
            {
                ["harvestId"] = updated.Id,
                ["oliveKg"] = updated.OliveKg.ToString("0.##")
            },
            cancellationToken);

        _logger.LogInformation("Harvest {HarvestId} voided on field {FieldId}", updated.Id, record.FieldId);
        return ToDto(updated);
    }

    private static HarvestRecordDetailDto ToDto(HarvestRecord record) => new()
    {
        Id = record.Id,
        FieldId = record.FieldId,
        HarvestDate = record.HarvestDate,
        HarvestMethod = record.HarvestMethod,
        WorkersUsed = record.WorkersUsed,
        OliveKg = record.OliveKg,
        MillName = record.MillName,
        OilKg = record.OilKg,
        OilYieldPercent = record.OilYieldPercent,
        QualityGrade = record.QualityGrade,
        Notes = record.Notes,
        Status = record.Status.ToApiString(),
        VoidReason = record.VoidReason,
        VoidedAt = record.VoidedAt
    };
}
