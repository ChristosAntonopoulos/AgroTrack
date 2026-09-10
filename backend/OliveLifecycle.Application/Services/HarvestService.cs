using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.DTOs.Harvest;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.FieldWork;
using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Application.Services;

public class HarvestService : IHarvestService
{
    private readonly IHarvestRecordRepository _harvestRecordRepository;
    private readonly IFieldRepository _fieldRepository;
    private readonly IFieldAccessService _fieldAccessService;
    private readonly IFinancialTransactionRepository _financialTransactions;
    private readonly IFinancialTransactionService _financialTransactionService;
    private readonly IMediaAttachmentService _mediaAttachmentService;
    private readonly IActivityService _activityService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ILogger<HarvestService> _logger;

    public HarvestService(
        IHarvestRecordRepository harvestRecordRepository,
        IFieldRepository fieldRepository,
        IFieldAccessService fieldAccessService,
        IFinancialTransactionRepository financialTransactions,
        IFinancialTransactionService financialTransactionService,
        IMediaAttachmentService mediaAttachmentService,
        IActivityService activityService,
        IDateTimeProvider dateTimeProvider,
        ILogger<HarvestService> logger)
    {
        _harvestRecordRepository = harvestRecordRepository;
        _fieldRepository = fieldRepository;
        _fieldAccessService = fieldAccessService;
        _financialTransactions = financialTransactions;
        _financialTransactionService = financialTransactionService;
        _mediaAttachmentService = mediaAttachmentService;
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

        await EnsureHarvestModuleAsync(dto.FieldId, userId, userRole, write: true, cancellationToken);

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
            ResultYear = ResultYearResolver.Resolve(harvestDate, dto.ResultYear, now),
            HarvestMethod = dto.HarvestMethod?.Trim() ?? string.Empty,
            WorkersUsed = dto.WorkersUsed,
            OliveKg = dto.OliveKg,
            MillName = string.IsNullOrWhiteSpace(dto.MillName) ? null : dto.MillName.Trim(),
            OilKg = dto.OilKg,
            OilLitres = dto.OilLitres is > 0 ? dto.OilLitres : null,
            ConversionFactor = dto.ConversionFactor is > 0 ? dto.ConversionFactor : null,
            ConversionSource = string.IsNullOrWhiteSpace(dto.ConversionSource) ? null : dto.ConversionSource.Trim(),
            ConversionRecordedAt = dto.ConversionFactor is > 0 ? now : null,
            OilYieldPercent = oilYield,
            QualityGrade = dto.QualityGrade?.Trim() ?? string.Empty,
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            Status = FinancialEntryStatus.Posted,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _harvestRecordRepository.CreateAsync(record, cancellationToken);

        var mediaUrls = (dto.MediaUrls ?? new List<string>())
            .Where(u => !string.IsNullOrWhiteSpace(u))
            .Select(u => u.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(MediaAttachmentService.MaxImagesPerOwner)
            .ToList();
        if (mediaUrls.Count > 0)
        {
            await _mediaAttachmentService.AttachUrlsAsync(
                MediaOwnerType.Harvest.ToApiString(),
                created.Id,
                created.FieldId,
                mediaUrls,
                userId,
                userRole,
                cancellationToken);
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

        await EnsureHarvestModuleAsync(fieldId, userId, userRole, write: false, cancellationToken);

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

        var linkedMoney = await _financialTransactions.GetByRelatedHarvestIdAsync(record.Id, cancellationToken);
        var voidReason = record.VoidReason ?? "Harvest voided";
        foreach (var tx in linkedMoney)
        {
            if (tx.Status == FinancialTransactionStatus.Posted)
            {
                await _financialTransactionService.VoidAsync(
                    tx.Id,
                    new VoidFinancialTransactionDto { Reason = voidReason },
                    userId,
                    userRole,
                    cancellationToken);
            }
            else if (tx.Status == FinancialTransactionStatus.Draft)
            {
                await _financialTransactionService.DeleteDraftAsync(tx.Id, userId, userRole, cancellationToken);
            }
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

    private async Task EnsureHarvestModuleAsync(
        string fieldId,
        string userId,
        string userRole,
        bool write,
        CancellationToken cancellationToken)
    {
        if (userRole == Roles.Administrator
            || await _fieldAccessService.CanUserModifyFieldAsync(fieldId, userId, cancellationToken))
        {
            return;
        }

        var family = await _fieldAccessService.GetFamilyAccessForFieldAsync(fieldId, userId, cancellationToken);
        if (family == null)
        {
            return;
        }

        if (!family.Modules.Any(m => string.Equals(m, FamilyModules.Harvest, StringComparison.OrdinalIgnoreCase)))
        {
            throw new ForbiddenException("You do not have access to harvest for this field.");
        }

        if (write && !FamilyAccessLevels.CanCreateContent(family.AccessLevel))
        {
            throw new ForbiddenException("You can only view harvest on this field.");
        }
    }

    private static HarvestRecordDetailDto ToDto(HarvestRecord record) => new()
    {
        Id = record.Id,
        FieldId = record.FieldId,
        HarvestDate = record.HarvestDate,
        ResultYear = record.ResultYear != 0
            ? record.ResultYear
            : AthensTime.CalendarYear(record.HarvestDate),
        HarvestMethod = record.HarvestMethod,
        WorkersUsed = record.WorkersUsed,
        OliveKg = record.OliveKg,
        MillName = record.MillName,
        OilKg = record.OilKg,
        OilLitres = record.OilLitres,
        ConversionFactor = record.ConversionFactor,
        ConversionSource = record.ConversionSource,
        ConversionRecordedAt = record.ConversionRecordedAt,
        OilYieldPercent = record.OilYieldPercent,
        QualityGrade = record.QualityGrade,
        Notes = record.Notes,
        Status = record.Status.ToApiString(),
        VoidReason = record.VoidReason,
        VoidedAt = record.VoidedAt
    };
}
