using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.DTOs.OilStock;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.OilStock;
using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Application.Services;

public class OilStockService : IOilStockService
{
    private readonly IOilCellarRepository _cellars;
    private readonly IOilLotRepository _lots;
    private readonly IOilPressingRepository _pressings;
    private readonly IOilCommitmentRepository _commitments;
    private readonly IOilShareRequestRepository _shareRequests;
    private readonly IStockMovementRepository _movements;
    private readonly IFinancialTransactionService _finance;
    private readonly IFieldRepository _fields;
    private readonly IDateTimeProvider _clock;

    public OilStockService(
        IOilCellarRepository cellars,
        IOilLotRepository lots,
        IOilPressingRepository pressings,
        IOilCommitmentRepository commitments,
        IOilShareRequestRepository shareRequests,
        IStockMovementRepository movements,
        IFinancialTransactionService finance,
        IFieldRepository fields,
        IDateTimeProvider clock)
    {
        _cellars = cellars;
        _lots = lots;
        _pressings = pressings;
        _commitments = commitments;
        _shareRequests = shareRequests;
        _movements = movements;
        _finance = finance;
        _fields = fields;
        _clock = clock;
    }

    public async Task<OilStockSummaryDto> GetSummaryAsync(
        string userId,
        int? resultYear,
        string? fieldId,
        CancellationToken cancellationToken = default)
    {
        var cellar = await EnsureCellarForPersonAsync(userId, cancellationToken);
        var lots = await LoadLotsAsync(cellar, resultYear, fieldId, cancellationToken);
        var commitments = (await LoadCommitmentsAsync(cellar, cancellationToken))
            .Where(c => !c.Cancelled)
            .ToList();

        var reservedByLot = BuildOpenReservationByLot(commitments, saleOnly: false);

        var lotDtos = lots.Select(lot => ToLotDto(lot, reservedByLot)).ToList();
        var onHand = SumPacks(lots.Select(l => l.Packing));
        var held = SumPacks(lotDtos.Select(l => OilStockDtoMapper.FromDto(l.Reserved)));
        // Pending delivery is the sale subset of held (still in cellar).
        var pending = SumPacks(
            commitments
                .Where(c => c.IsSale && !OilPackMath.IsFullyCovered(c.Requested, c.Delivered))
                .Select(c => OilPackMath.Remaining(c.Requested, c.Delivered)));
        var promiseOnly = OilPackMath.Subtract(held, pending);
        var available = OilPackMath.Subtract(onHand, held);
        var delivered = SumPacks(commitments.Select(c => c.Delivered));

        var open = commitments
            .Where(c => !OilPackMath.IsFullyCovered(c.Requested, c.Delivered))
            .Select(ToCommitmentDto)
            .ToList();

        return new OilStockSummaryDto
        {
            OnHand = OilStockDtoMapper.ToDto(onHand),
            Held = OilStockDtoMapper.ToDto(held),
            Reserved = OilStockDtoMapper.ToDto(promiseOnly),
            PendingDelivery = OilStockDtoMapper.ToDto(pending),
            Available = OilStockDtoMapper.ToDto(available),
            Delivered = OilStockDtoMapper.ToDto(delivered),
            OpenReservationCount = open.Count(c => c.DerivedStatus == "reserved"),
            PendingDeliveryCount = open.Count(c => c.DerivedStatus == "pending_delivery"),
            Lots = lotDtos.OrderByDescending(l => l.PressedOn).ThenByDescending(l => l.Id).ToList(),
            OpenCommitments = open
        };
    }

    public async Task<IReadOnlyList<OilLotDto>> ListLotsAsync(
        string userId,
        int? resultYear,
        string? fieldId,
        CancellationToken cancellationToken = default)
    {
        var summary = await GetSummaryAsync(userId, resultYear, fieldId, cancellationToken);
        return summary.Lots;
    }

    public async Task<OilLotDto> UpsertLotAsync(
        string userId,
        UpsertOilLotDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.BatchId))
        {
            throw new ValidationException("batchId is required.");
        }

        if (dto.TotalAmount < 0)
        {
            throw new ValidationException("totalAmount must be >= 0.");
        }

        var provenance = ResolveProvenance(dto.Provenance, dto.FieldIds);
        var fieldIds = OilProvenance.FieldIds(provenance);
        var cellarOwnerUserId = await ResolveCellarOwnerAsync(userId, dto.CellarOwnerUserId, fieldIds, cancellationToken);
        var cellar = await EnsureCellarForPersonAsync(cellarOwnerUserId, cancellationToken);

        var unit = NormalizeUnit(dto.Unit);
        var pressedOn = dto.PressedOn ?? _clock.UtcNow;
        var resultYear = dto.ResultYear ?? AgriculturalYear.For(pressedOn);
        var farmerLitres = OilPackMath.ToFarmerLitres(
            dto.TotalAmount,
            unit,
            Math.Max(0, dto.MillKept),
            dto.ConversionFactor);

        var packing = dto.Packing is null || OilPackMath.IsEmpty(OilStockDtoMapper.FromDto(dto.Packing))
            ? OilPackMath.DefaultPackingFromFarmerLitres(farmerLitres)
            : OilStockDtoMapper.FromDto(dto.Packing);

        var existing = await _lots.GetByCellarAndBatchIdAsync(
            cellar.Id,
            dto.BatchId.Trim(),
            cellar.OwnerPersonId,
            cancellationToken);
        var now = _clock.UtcNow;

        if (existing is null)
        {
            var created = new OilLot
            {
                CellarId = cellar.Id,
                OwnerUserId = cellar.OwnerPersonId,
                BatchId = dto.BatchId.Trim(),
                SourcePressingId = NullIfEmpty(dto.SourcePressingId),
                PressedOn = pressedOn,
                ResultYear = resultYear,
                HarvestRecordIds = Distinct(dto.HarvestRecordIds),
                FieldIds = fieldIds,
                Provenance = provenance,
                TotalAmount = dto.TotalAmount,
                Unit = unit,
                MillKept = Math.Max(0, dto.MillKept),
                ConversionFactor = dto.ConversionFactor,
                Packing = packing,
                Notes = NullIfEmpty(dto.Notes),
                CreatedAt = now,
                UpdatedAt = now
            };
            created = await _lots.CreateAsync(created, cancellationToken);
            await RecordMovementAsync(
                cellar,
                created.Id,
                null,
                StockMovementKind.Produced,
                packing,
                OilPackMath.PackLitres(packing),
                cellar.OwnerPersonId == userId
                    ? "Oil lot created"
                    : $"Oil lot assigned to cellar by {userId}",
                pressedOn,
                cancellationToken);
            return ToLotDto(created, new Dictionary<string, OilPack>());
        }

        AdoptIntoCellar(existing, cellar);
        var previousPack = existing.Packing.Clone();
        existing.PressedOn = pressedOn;
        existing.ResultYear = resultYear;
        if (dto.HarvestRecordIds is { Count: > 0 })
        {
            existing.HarvestRecordIds = Distinct(dto.HarvestRecordIds);
        }

        if (fieldIds.Count > 0)
        {
            existing.FieldIds = fieldIds;
            existing.Provenance = provenance;
        }

        if (!string.IsNullOrWhiteSpace(dto.SourcePressingId))
        {
            existing.SourcePressingId = dto.SourcePressingId.Trim();
        }

        existing.TotalAmount = dto.TotalAmount;
        existing.Unit = unit;
        existing.MillKept = Math.Max(0, dto.MillKept);
        existing.ConversionFactor = dto.ConversionFactor ?? existing.ConversionFactor;

        // Harvest re-sync must not restore oil that already left the cellar.
        var cellarLocked = await HasCellarMutationsAsync(cellar, existing.Id, cancellationToken);
        var packingChanged = false;
        if (!cellarLocked)
        {
            packingChanged = !PackEquals(previousPack, packing);
            existing.Packing = packing;
        }

        if (dto.Notes is not null) existing.Notes = NullIfEmpty(dto.Notes);
        existing.UpdatedAt = now;

        existing = await _lots.UpdateAsync(existing, cancellationToken);
        if (packingChanged)
        {
            await RecordMovementAsync(
                cellar,
                existing.Id,
                null,
                StockMovementKind.Packed,
                packing,
                OilPackMath.PackLitres(packing) - OilPackMath.PackLitres(previousPack),
                "Packing updated",
                now,
                cancellationToken);
        }

        var reserved = BuildOpenReservationByLot(
            (await LoadCommitmentsAsync(cellar, cancellationToken)).Where(c => !c.Cancelled),
            saleOnly: false);
        return ToLotDto(existing, reserved);
    }

    public async Task<IReadOnlyList<OilCellarCandidateDto>> ListCellarCandidatesAsync(
        string userId,
        IReadOnlyList<string> fieldIds,
        CancellationToken cancellationToken = default)
    {
        var ids = Distinct(fieldIds);
        if (ids.Count == 0)
        {
            return
            [
                new OilCellarCandidateDto
                {
                    UserId = userId,
                    DisplayName = string.Empty,
                    Role = "admin",
                    IsYou = true
                }
            ];
        }

        var fields = (await _fields.GetByIdsAsync(ids, cancellationToken)).ToList();
        if (fields.Count == 0)
        {
            throw new ValidationException("Unknown field for cellar assignment.");
        }

        return ToCandidateDtos(fields, userId);
    }

    public async Task<OilLotDto> PatchPackingAsync(
        string userId,
        string lotId,
        PatchOilLotPackingDto dto,
        CancellationToken cancellationToken = default)
    {
        var cellar = await EnsureCellarForPersonAsync(userId, cancellationToken);
        var lot = await RequireLotAsync(cellar, lotId, cancellationToken);
        var previous = lot.Packing.Clone();
        lot.Packing = OilStockDtoMapper.FromDto(dto.Packing);
        if (dto.MillKept.HasValue) lot.MillKept = Math.Max(0, dto.MillKept.Value);
        lot.UpdatedAt = _clock.UtcNow;
        lot = await _lots.UpdateAsync(lot, cancellationToken);
        await RecordMovementAsync(
            cellar,
            lot.Id,
            null,
            StockMovementKind.Packed,
            lot.Packing,
            OilPackMath.PackLitres(lot.Packing) - OilPackMath.PackLitres(previous),
            "Packing patched",
            lot.UpdatedAt,
            cancellationToken);
        return (await GetSummaryAsync(userId, lot.ResultYear, null, cancellationToken))
            .Lots.First(l => l.Id == lot.Id);
    }

    public async Task<OilLotDto> RepackAsync(
        string userId,
        string lotId,
        RepackOilLotDto dto,
        CancellationToken cancellationToken = default)
    {
        var cellar = await EnsureCellarForPersonAsync(userId, cancellationToken);
        var lot = await RequireLotAsync(cellar, lotId, cancellationToken);
        lot.Packing = OilPackMath.Repack(lot.Packing, dto.AddTin16, dto.AddTin17);
        lot.UpdatedAt = _clock.UtcNow;
        lot = await _lots.UpdateAsync(lot, cancellationToken);
        var filled = new OilPack { Tin16 = Math.Max(0, dto.AddTin16), Tin17 = Math.Max(0, dto.AddTin17) };
        await RecordMovementAsync(
            cellar,
            lot.Id,
            null,
            StockMovementKind.Repacked,
            filled,
            0,
            "Filled tins from bulk",
            lot.UpdatedAt,
            cancellationToken);
        return (await GetSummaryAsync(userId, lot.ResultYear, null, cancellationToken))
            .Lots.First(l => l.Id == lot.Id);
    }

    public async Task<IReadOnlyList<OilPressingDto>> ListPressingsAsync(
        string userId,
        int? resultYear,
        CancellationToken cancellationToken = default)
    {
        var rows = await _pressings.GetByRecorderAsync(userId, resultYear, cancellationToken);
        var result = new List<OilPressingDto>(rows.Count);
        foreach (var pressing in rows)
        {
            result.Add(await ToPressingDtoAsync(pressing, userId, cancellationToken));
        }

        return result;
    }

    public async Task<IReadOnlyList<OilPressingDto>> ListPendingAllocationsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _pressings.GetPendingAllocationAsync(
            userId,
            await AdminFieldIdsAsync(userId, cancellationToken),
            cancellationToken);

        var result = new List<OilPressingDto>(rows.Count);
        foreach (var pressing in rows)
        {
            result.Add(await ToPressingDtoAsync(pressing, userId, cancellationToken));
        }

        return result;
    }

    public async Task<OilPressingDto> CreatePressingAsync(
        string userId,
        CreateOilPressingDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.BatchId))
        {
            throw new ValidationException("batchId is required.");
        }

        if (dto.TotalAmount < 0)
        {
            throw new ValidationException("totalAmount must be >= 0.");
        }

        var provenance = ResolveProvenance(dto.Provenance, dto.FieldIds);
        var fieldIds = OilProvenance.FieldIds(provenance);
        var unit = NormalizeUnit(dto.Unit);
        var millKept = Math.Max(0, dto.MillKept);
        var pressedOn = dto.PressedOn ?? _clock.UtcNow;
        var now = _clock.UtcNow;
        var farmerLitres = OilPackMath.ToFarmerLitres(dto.TotalAmount, unit, millKept, dto.ConversionFactor);

        var pressing = await _pressings.GetByBatchIdAsync(userId, dto.BatchId.Trim(), cancellationToken);
        if (pressing is null)
        {
            pressing = await _pressings.CreateAsync(
                new OilPressing
                {
                    CampaignId = NullIfEmpty(dto.CampaignId),
                    BatchId = dto.BatchId.Trim(),
                    PressedOn = pressedOn,
                    ResultYear = dto.ResultYear ?? AgriculturalYear.For(pressedOn),
                    TotalLitres = dto.TotalAmount,
                    Unit = unit,
                    MillKept = millKept,
                    ConversionFactor = dto.ConversionFactor,
                    FieldIds = fieldIds,
                    Provenance = provenance,
                    RecordedByUserId = userId,
                    Status = OilPressingStatuses.Confirmed,
                    HarvestRecordIds = Distinct(dto.HarvestRecordIds),
                    Notes = NullIfEmpty(dto.Notes),
                    CreatedAt = now,
                    UpdatedAt = now
                },
                cancellationToken);
        }
        else
        {
            pressing.CampaignId = NullIfEmpty(dto.CampaignId) ?? pressing.CampaignId;
            pressing.PressedOn = pressedOn;
            pressing.ResultYear = dto.ResultYear ?? AgriculturalYear.For(pressedOn);
            pressing.TotalLitres = dto.TotalAmount;
            pressing.Unit = unit;
            pressing.MillKept = millKept;
            pressing.ConversionFactor = dto.ConversionFactor ?? pressing.ConversionFactor;
            if (fieldIds.Count > 0)
            {
                pressing.FieldIds = fieldIds;
                pressing.Provenance = provenance;
            }

            if (dto.HarvestRecordIds is { Count: > 0 })
            {
                pressing.HarvestRecordIds = Distinct(dto.HarvestRecordIds);
            }

            if (dto.Notes is not null) pressing.Notes = NullIfEmpty(dto.Notes);
            pressing.UpdatedAt = now;
            pressing = await _pressings.UpdateAsync(pressing, cancellationToken);
        }

        var requested = dto.Allocations ?? [];
        if (requested.Count == 0)
        {
            var fields = fieldIds.Count == 0
                ? []
                : (await _fields.GetByIdsAsync(fieldIds, cancellationToken)).ToList();
            // Admin-first: empty allocations always file into the grove admin cellar.
            // Explicit splits still come through AllocatePressing / non-empty allocations.
            var admin = fields.Count > 0 ? ResolveAdminPerson(fields) : null;
            var ownerUserId = admin is not null
                && !string.IsNullOrWhiteSpace(admin.UserId)
                && OilCellarRules.IsEligibleCellarOwner(fields, admin.UserId)
                    ? admin.UserId
                    : userId;

            if (fields.Count > 0
                && !OilCellarRules.IsEligibleCellarOwner(fields, ownerUserId))
            {
                // No admin cellar and the recorder cannot hold oil — park for the admin to split.
                pressing.Allocations = [];
                pressing.Status = OilPressingStatuses.PendingAllocation;
                pressing.UpdatedAt = now;
                pressing = await _pressings.UpdateAsync(pressing, cancellationToken);
                return await ToPressingDtoAsync(pressing, userId, cancellationToken);
            }

            requested =
            [
                new OilPressingAllocationDto { CellarOwnerUserId = ownerUserId, Litres = farmerLitres }
            ];
        }

        return await MaterialisePressingAsync(
            userId,
            pressing,
            requested,
            provenance,
            fieldIds,
            farmerLitres,
            cancellationToken);
    }

    public async Task<OilPressingDto> AllocatePressingAsync(
        string userId,
        string pressingId,
        AllocateOilPressingDto dto,
        CancellationToken cancellationToken = default)
    {
        var pressing = await _pressings.GetByIdAsync(pressingId, cancellationToken)
            ?? throw new NotFoundException("Pressing not found.");

        if (dto.Allocations.Count == 0)
        {
            throw new ValidationException("Say how much oil each cellar takes home.");
        }

        var provenance = OilProvenance.Resolve(pressing.Provenance, pressing.FieldIds);
        var fieldIds = OilProvenance.FieldIds(provenance);

        if (!string.Equals(pressing.RecordedByUserId, userId, StringComparison.Ordinal))
        {
            // A partner can bring the mill ticket in, but the grove admin owns the split.
            var groves = fieldIds.Count == 0
                ? []
                : (await _fields.GetByIdsAsync(fieldIds, cancellationToken)).ToList();
            if (groves.Count == 0 || !OilCellarRules.CanAssignCellar(groves, userId))
            {
                throw new ForbiddenException("Only the grove admin can split this pressing.");
            }
        }

        var farmerLitres = OilPackMath.ToFarmerLitres(
            pressing.TotalLitres,
            pressing.Unit,
            pressing.MillKept,
            pressing.ConversionFactor);

        return await MaterialisePressingAsync(
            userId,
            pressing,
            dto.Allocations,
            provenance,
            fieldIds,
            farmerLitres,
            cancellationToken);
    }

    public async Task<IReadOnlyList<OilCommitmentDto>> ListCommitmentsAsync(
        string userId,
        bool openOnly,
        CancellationToken cancellationToken = default)
    {
        var cellar = await EnsureCellarForPersonAsync(userId, cancellationToken);
        var all = await LoadCommitmentsAsync(cellar, cancellationToken);
        var filtered = openOnly
            ? all.Where(c => !c.Cancelled && !OilPackMath.IsFullyCovered(c.Requested, c.Delivered))
            : all;
        return filtered.Select(ToCommitmentDto).ToList();
    }

    public async Task<OilCommitmentDto> CreateCommitmentAsync(
        string userId,
        string userRole,
        CreateOilCommitmentDto dto,
        CancellationToken cancellationToken = default)
    {
        var name = (dto.CounterpartyName ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ValidationException("A name is required.");
        }

        var requested = OilStockDtoMapper.FromDto(dto.Requested);
        if (OilPackMath.IsEmpty(requested))
        {
            throw new ValidationException("Requested oil quantity is required.");
        }

        var cellar = await EnsureCellarForPersonAsync(userId, cancellationToken);
        var lots = (await LoadLotsAsync(cellar, null, null, cancellationToken))
            .OrderBy(l => l.PressedOn)
            .ThenBy(l => l.CreatedAt)
            .ToList();
        var open = (await LoadCommitmentsAsync(cellar, cancellationToken))
            .Where(c => !c.Cancelled && !OilPackMath.IsFullyCovered(c.Requested, c.Delivered))
            .ToList();
        var reservedByLot = BuildOpenReservationByLot(open, saleOnly: false);

        List<OilLotAllocation> allocations;
        if (dto.Allocations is { Count: > 0 })
        {
            allocations = dto.Allocations
                .Select(a => new OilLotAllocation
                {
                    OilLotId = a.OilLotId,
                    Pack = OilStockDtoMapper.FromDto(a.Pack)
                })
                .Where(a => !OilPackMath.IsEmpty(a.Pack))
                .ToList();
        }
        else
        {
            allocations = AllocateFifo(lots, reservedByLot, requested);
        }

        if (OilPackMath.PackLitres(SumPacks(allocations.Select(a => a.Pack))) + 0.05m
            < OilPackMath.PackLitres(requested))
        {
            throw new ValidationException("Not enough available oil for this commitment.");
        }

        var now = _clock.UtcNow;
        var commitment = new OilCommitment
        {
            CellarId = cellar.Id,
            OwnerUserId = cellar.OwnerPersonId,
            ContactId = NullIfEmpty(dto.ContactId),
            CounterpartyName = name,
            Requested = requested,
            Delivered = OilPack.Empty(),
            IsSale = dto.IsSale,
            Amount = dto.IsSale ? dto.Amount : null,
            Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "EUR" : dto.Currency.Trim().ToUpperInvariant(),
            FinancialTransactionId = NullIfEmpty(dto.FinancialTransactionId),
            Allocations = allocations,
            PromisedFor = dto.PromisedFor,
            Notes = NullIfEmpty(dto.Notes),
            CreatedAt = now,
            UpdatedAt = now
        };

        commitment = await _commitments.CreateAsync(commitment, cancellationToken);

        await RecordMovementAsync(
            cellar,
            null,
            commitment.Id,
            dto.IsSale ? StockMovementKind.Sold : StockMovementKind.Reserved,
            requested,
            -OilPackMath.PackLitres(requested),
            dto.IsSale ? $"Sale to {name}" : $"Reserved for {name}",
            now,
            cancellationToken);

        // Capture/Money already posted income — do not create a second transaction.
        if (dto.IsSale && dto.Amount is > 0 && string.IsNullOrEmpty(commitment.FinancialTransactionId))
        {
            var litres = OilPackMath.PackLitres(requested);
            var fieldId = ResolveFieldId(lots, allocations);
            try
            {
                var tx = await _finance.CreateAsync(
                    new CreateFinancialTransactionDto
                    {
                        Type = "income",
                        Amount = dto.Amount,
                        Currency = commitment.Currency,
                        OccurredOn = now,
                        FieldId = fieldId,
                        Category = "olive_oil_sale",
                        ProductKind = "olive_oil",
                        Quantity = litres,
                        QuantityUnit = "litre",
                        CalculationMode = "quantity_and_total",
                        Description = $"Olive oil — {name}",
                        CounterpartyName = name,
                        SourceType = "manual",
                        SourceId = commitment.Id,
                        SaveAsDraft = false
                    },
                    userId,
                    userRole,
                    cancellationToken);
                commitment.FinancialTransactionId = tx.Id;
                commitment = await _commitments.UpdateAsync(commitment, cancellationToken);
            }
            catch
            {
                // Stock commitment still stands if money posting fails; farmer can fix in Money.
            }
        }

        if (dto.AlreadyDelivered)
        {
            return await DeliverAsync(
                userId,
                commitment.Id,
                new DeliverOilCommitmentDto { Pack = OilStockDtoMapper.ToDto(requested) },
                cancellationToken);
        }

        return ToCommitmentDto(commitment);
    }

    public async Task<OilCommitmentDto> DeliverAsync(
        string userId,
        string commitmentId,
        DeliverOilCommitmentDto dto,
        CancellationToken cancellationToken = default)
    {
        var cellar = await EnsureCellarForPersonAsync(userId, cancellationToken);
        var commitment = await RequireCommitmentAsync(cellar, commitmentId, cancellationToken);

        if (commitment.Cancelled)
        {
            throw new ValidationException("Commitment is cancelled.");
        }

        var remaining = OilPackMath.Remaining(commitment.Requested, commitment.Delivered);
        if (OilPackMath.IsEmpty(remaining))
        {
            return ToCommitmentDto(commitment);
        }

        var deliver = dto.Pack is null || OilPackMath.IsEmpty(OilStockDtoMapper.FromDto(dto.Pack))
            ? remaining
            : OilPackMath.Min(remaining, OilStockDtoMapper.FromDto(dto.Pack));

        if (OilPackMath.IsEmpty(deliver))
        {
            throw new ValidationException("Nothing to deliver.");
        }

        // Reduce packing on allocated lots (FIFO within allocation order).
        var left = deliver.Clone();
        foreach (var allocation in commitment.Allocations)
        {
            if (OilPackMath.IsEmpty(left)) break;
            var lot = await RequireLotAsync(cellar, allocation.OilLotId, cancellationToken);
            var take = OilPackMath.Take(lot.Packing, left, OilPackMath.PackLitres(lot.Packing));
            if (OilPackMath.IsEmpty(take)) continue;
            lot.Packing = OilPackMath.Subtract(lot.Packing, take);
            lot.UpdatedAt = _clock.UtcNow;
            await _lots.UpdateAsync(lot, cancellationToken);
            left = OilPackMath.Subtract(left, take);
        }

        if (!OilPackMath.IsEmpty(left))
        {
            throw new ValidationException("Physical stock is lower than the delivery amount.");
        }

        commitment.Delivered = OilPackMath.Add(commitment.Delivered, deliver);
        commitment.UpdatedAt = _clock.UtcNow;
        commitment = await _commitments.UpdateAsync(commitment, cancellationToken);

        await RecordMovementAsync(
            cellar,
            null,
            commitment.Id,
            StockMovementKind.Delivered,
            deliver,
            -OilPackMath.PackLitres(deliver),
            $"Delivered to {commitment.CounterpartyName}",
            commitment.UpdatedAt,
            cancellationToken);

        return ToCommitmentDto(commitment);
    }

    public async Task CancelCommitmentAsync(
        string userId,
        string commitmentId,
        CancellationToken cancellationToken = default)
    {
        var cellar = await EnsureCellarForPersonAsync(userId, cancellationToken);
        var commitment = await RequireCommitmentAsync(cellar, commitmentId, cancellationToken);

        if (!OilPackMath.IsEmpty(commitment.Delivered))
        {
            throw new ValidationException("Cannot cancel a commitment that already has deliveries.");
        }

        commitment.Cancelled = true;
        commitment.UpdatedAt = _clock.UtcNow;
        await _commitments.UpdateAsync(commitment, cancellationToken);
        await RecordMovementAsync(
            cellar,
            null,
            commitment.Id,
            StockMovementKind.ReservationCancelled,
            commitment.Requested,
            OilPackMath.PackLitres(commitment.Requested),
            "Reservation cancelled",
            commitment.UpdatedAt,
            cancellationToken);
    }

    public async Task<IReadOnlyList<StockMovementDto>> ListMovementsAsync(
        string userId,
        int limit,
        CancellationToken cancellationToken = default)
    {
        var cellar = await EnsureCellarForPersonAsync(userId, cancellationToken);
        var rows = await _movements.GetByCellarIdAsync(cellar.Id, cellar.OwnerPersonId, limit, cancellationToken);
        return rows.Select(ToMovementDto).ToList();
    }

    public async Task<StockMovementDto> ReverseMovementAsync(
        string userId,
        string movementId,
        CancellationToken cancellationToken = default)
    {
        var cellar = await EnsureCellarForPersonAsync(userId, cancellationToken);
        var movement = await _movements.GetByIdAsync(movementId, cancellationToken)
            ?? throw new NotFoundException("Movement not found.");

        if (!BelongsToCellar(movement.CellarId, movement.OwnerUserId, cellar))
        {
            throw new ForbiddenException("You cannot undo this movement.");
        }

        if (!string.IsNullOrWhiteSpace(movement.ReversalOfMovementId))
        {
            throw new ValidationException("An undo cannot be undone.");
        }

        if (!ReversibleKinds.Contains(movement.Kind))
        {
            throw new ValidationException("This movement cannot be undone.");
        }

        if (await _movements.GetReversalOfAsync(movement.Id, cancellationToken) is not null)
        {
            throw new ValidationException("This movement was already undone.");
        }

        var now = _clock.UtcNow;
        var pack = movement.PackDelta.Clone();
        var note = "Undone";
        string? transferId = null;

        switch (movement.Kind)
        {
            case StockMovementKind.SharedOut:
                transferId = await ReverseShareAsync(cellar, movement, pack, now, cancellationToken);
                break;
            case StockMovementKind.Sold:
                note = await ReverseSaleAsync(cellar, movement, now, cancellationToken);
                break;
            default:
                if (!string.IsNullOrWhiteSpace(movement.OilLotId))
                {
                    var lot = await RequireLotAsync(cellar, movement.OilLotId!, cancellationToken);
                    if (movement.LitresDelta < 0)
                    {
                        lot.Packing = OilPackMath.Add(lot.Packing, pack);
                    }
                    else
                    {
                        pack = TakeOrThrow(lot, pack);
                        lot.Packing = OilPackMath.Subtract(lot.Packing, pack);
                    }

                    lot.UpdatedAt = now;
                    await _lots.UpdateAsync(lot, cancellationToken);
                }

                break;
        }

        var reversal = await RecordMovementAsync(
            cellar,
            movement.OilLotId,
            movement.OilCommitmentId,
            movement.Kind,
            pack,
            -OilPackMath.PackLitres(pack) * (movement.LitresDelta < 0 ? -1 : 1),
            note,
            now,
            cancellationToken,
            transferId,
            movement.Id);

        return ToMovementDto(reversal);
    }

    /// <summary>
    /// A share is two legs in two cellars, so undoing it has to take the oil back out of the
    /// receiving cellar. Returns the id pairing the two undo legs.
    /// </summary>
    private async Task<string> ReverseShareAsync(
        OilCellar fromCellar,
        StockMovement sharedOut,
        OilPack pack,
        DateTime now,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(sharedOut.TransferId))
        {
            throw new ValidationException("This share cannot be traced to the other cellar.");
        }

        var legs = await _movements.GetByTransferIdAsync(sharedOut.TransferId!, cancellationToken);
        var sharedIn = legs.FirstOrDefault(m => m.Kind == StockMovementKind.SharedIn)
            ?? throw new ValidationException("The other side of this share is missing.");

        var destCellar = await _cellars.GetByIdAsync(sharedIn.CellarId, cancellationToken)
            ?? throw new ValidationException("The other cellar no longer exists.");
        var destLot = string.IsNullOrWhiteSpace(sharedIn.OilLotId)
            ? null
            : await _lots.GetByIdAsync(sharedIn.OilLotId!, cancellationToken);
        if (destLot is null)
        {
            throw new ValidationException("The shared oil is no longer in the other cellar.");
        }

        var take = OilPackMath.Take(destLot.Packing, pack, OilPackMath.PackLitres(destLot.Packing));
        if (OilPackMath.PackLitres(take) + 0.05m < OilPackMath.PackLitres(pack))
        {
            throw new ValidationException("The other cellar has already used this oil.");
        }

        destLot.Packing = OilPackMath.Subtract(destLot.Packing, take);
        destLot.UpdatedAt = now;
        await _lots.UpdateAsync(destLot, cancellationToken);

        if (!string.IsNullOrWhiteSpace(sharedOut.OilLotId))
        {
            var sourceLot = await RequireLotAsync(fromCellar, sharedOut.OilLotId!, cancellationToken);
            sourceLot.Packing = OilPackMath.Add(sourceLot.Packing, take);
            sourceLot.UpdatedAt = now;
            await _lots.UpdateAsync(sourceLot, cancellationToken);
        }

        var transferId = Guid.NewGuid().ToString("N");
        await RecordMovementAsync(
            destCellar,
            destLot.Id,
            null,
            StockMovementKind.SharedIn,
            take,
            -OilPackMath.PackLitres(take),
            "Share taken back",
            now,
            cancellationToken,
            transferId,
            sharedIn.Id);

        return transferId;
    }

    /// <summary>
    /// Undoing a sale puts the oil back and closes the promise. Money already posted in Money
    /// stays where it is — the farmer decides there whether a refund happened.
    /// </summary>
    private async Task<string> ReverseSaleAsync(
        OilCellar cellar,
        StockMovement sold,
        DateTime now,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(sold.OilCommitmentId))
        {
            return "Sale undone";
        }

        var commitment = await RequireCommitmentAsync(cellar, sold.OilCommitmentId!, cancellationToken);
        if (commitment.Cancelled)
        {
            throw new ValidationException("This sale was already cancelled.");
        }

        var left = commitment.Delivered.Clone();
        foreach (var allocation in commitment.Allocations)
        {
            if (OilPackMath.IsEmpty(left)) break;
            var lot = await RequireLotAsync(cellar, allocation.OilLotId, cancellationToken);
            var give = OilPackMath.Min(allocation.Pack, left);
            if (OilPackMath.IsEmpty(give)) continue;
            lot.Packing = OilPackMath.Add(lot.Packing, give);
            lot.UpdatedAt = now;
            await _lots.UpdateAsync(lot, cancellationToken);
            left = OilPackMath.Subtract(left, give);
        }

        commitment.Delivered = OilPack.Empty();
        commitment.Cancelled = true;
        commitment.UpdatedAt = now;
        await _commitments.UpdateAsync(commitment, cancellationToken);

        return string.IsNullOrWhiteSpace(commitment.FinancialTransactionId)
            ? "Sale undone"
            : "Sale undone — the income in Money was left untouched";
    }

    public async Task AdjustStockAsync(
        string userId,
        AdjustStockDto dto,
        CancellationToken cancellationToken = default)
    {
        var cellar = await EnsureCellarForPersonAsync(userId, cancellationToken);
        var lot = await RequireLotAsync(cellar, dto.OilLotId, cancellationToken);
        var pack = OilStockDtoMapper.FromDto(dto.Pack);
        if (OilPackMath.IsEmpty(pack))
        {
            throw new ValidationException("Pack adjustment is required.");
        }

        var kind = ParseAdjustKind(dto.Kind);
        var now = _clock.UtcNow;
        // Corrections go both ways: a stock count can find more oil than the books, or less.
        var additive = kind is StockMovementKind.Correction or StockMovementKind.Returned && !dto.Remove;

        if (additive)
        {
            lot.Packing = OilPackMath.Add(lot.Packing, pack);
        }
        else
        {
            pack = TakeOrThrow(lot, pack);
            lot.Packing = OilPackMath.Subtract(lot.Packing, pack);
        }

        lot.UpdatedAt = now;
        await _lots.UpdateAsync(lot, cancellationToken);

        var litres = additive
            ? OilPackMath.PackLitres(pack)
            : -OilPackMath.PackLitres(pack);

        await RecordMovementAsync(
            cellar,
            lot.Id,
            null,
            kind,
            pack,
            litres,
            NullIfEmpty(dto.Notes) ?? dto.Kind,
            now,
            cancellationToken);
    }

    public async Task<OilShareSourceDto?> GetShareSourceAsync(
        string userId,
        IReadOnlyList<string> fieldIds,
        CancellationToken cancellationToken = default)
    {
        var ids = Distinct(fieldIds);
        if (ids.Count == 0) return null;

        var fields = (await _fields.GetByIdsAsync(ids, cancellationToken)).ToList();
        if (fields.Count == 0) return null;

        if (!IsActiveFamilyOnFields(fields, userId))
        {
            return null;
        }

        var admin = ResolveAdminPerson(fields);
        if (admin is null || string.IsNullOrWhiteSpace(admin.UserId))
        {
            return null;
        }

        if (string.Equals(admin.UserId, userId, StringComparison.Ordinal))
        {
            return null;
        }

        var available = await AvailablePackForOwnerFieldsAsync(admin.UserId, ids, cancellationToken);

        return new OilShareSourceDto
        {
            FromOwnerUserId = admin.UserId,
            FromDisplayName = admin.DisplayName?.Trim() ?? string.Empty,
            Available = OilStockDtoMapper.ToDto(available),
            FieldIds = ids
        };
    }

    public async Task<IReadOnlyList<OilShareRequestDto>> ListShareRequestsAsync(
        string userId,
        bool pendingOnly,
        CancellationToken cancellationToken = default)
    {
        var incoming = await _shareRequests.GetByFromOwnerAsync(userId, cancellationToken);
        var outgoing = await _shareRequests.GetByToUserAsync(userId, cancellationToken);
        var merged = incoming
            .Concat(outgoing)
            .GroupBy(r => r.Id)
            .Select(g => g.First())
            .OrderByDescending(r => r.CreatedAt)
            .ToList();

        if (pendingOnly)
        {
            merged = merged
                .Where(r => string.Equals(r.Status, OilShareRequestStatuses.Pending, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return merged.Select(r => ToShareDto(r, userId)).ToList();
    }

    public async Task<OilShareRequestDto> CreateShareRequestAsync(
        string userId,
        CreateOilShareRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        var fieldIds = Distinct(dto.FieldIds);
        if (fieldIds.Count == 0)
        {
            throw new ValidationException("Choose at least one grove for the oil request.");
        }

        var requested = OilStockDtoMapper.FromDto(dto.Requested);
        if (OilPackMath.IsEmpty(requested) || OilPackMath.PackLitres(requested) <= 0.05m)
        {
            throw new ValidationException("Say how much oil you want (tins and/or bulk).");
        }

        var fields = (await _fields.GetByIdsAsync(fieldIds, cancellationToken)).ToList();
        if (fields.Count == 0)
        {
            throw new ValidationException("Unknown grove for oil request.");
        }

        if (!IsActiveFamilyOnFields(fields, userId))
        {
            throw new ForbiddenException("Only family can request oil from the admin cellar.");
        }

        var admin = ResolveAdminPerson(fields)
            ?? throw new ValidationException("No admin cellar for these groves.");

        if (string.Equals(admin.UserId, userId, StringComparison.Ordinal))
        {
            throw new ValidationException("You cannot request oil from your own cellar.");
        }

        var requester = fields
            .Select(f => FieldPeopleRules.GetActiveByUserId(f, userId))
            .FirstOrDefault(p => p is not null);

        var fromCellar = await EnsureCellarForPersonAsync(admin.UserId, cancellationToken);
        var toCellar = await EnsureCellarForPersonAsync(userId, cancellationToken);

        var now = _clock.UtcNow;
        var created = await _shareRequests.CreateAsync(new OilShareRequest
        {
            FromCellarId = fromCellar.Id,
            ToCellarId = toCellar.Id,
            FromOwnerUserId = fromCellar.OwnerPersonId,
            ToUserId = toCellar.OwnerPersonId,
            FromDisplayName = admin.DisplayName?.Trim() ?? string.Empty,
            ToDisplayName = requester?.DisplayName?.Trim() ?? string.Empty,
            Requested = requested,
            FieldIds = fieldIds,
            Notes = NullIfEmpty(dto.Notes),
            Status = OilShareRequestStatuses.Pending,
            CreatedAt = now,
            UpdatedAt = now
        }, cancellationToken);

        return ToShareDto(created, userId);
    }

    public async Task<OilShareRequestDto> AcceptShareRequestAsync(
        string userId,
        string requestId,
        CancellationToken cancellationToken = default)
    {
        var request = await _shareRequests.GetByIdAsync(requestId, cancellationToken)
            ?? throw new NotFoundException("Oil share request not found.");

        if (!string.Equals(request.FromOwnerUserId, userId, StringComparison.Ordinal))
        {
            throw new ForbiddenException("Only the admin cellar can accept this request.");
        }

        if (!string.Equals(request.Status, OilShareRequestStatuses.Pending, StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("This request is no longer pending.");
        }

        var fromCellar = await EnsureCellarForPersonAsync(userId, cancellationToken);
        var toCellar = await EnsureCellarForPersonAsync(request.ToUserId, cancellationToken);
        var toDisplay = string.IsNullOrWhiteSpace(request.ToDisplayName)
            ? request.ToUserId
            : request.ToDisplayName;
        var fromDisplay = string.IsNullOrWhiteSpace(request.FromDisplayName)
            ? userId
            : request.FromDisplayName;

        var moved = await MovePackBetweenCellarsAsync(
            fromCellar,
            toCellar,
            request.Requested.Clone(),
            request.FieldIds,
            batchId: $"share:{request.Id}",
            outNotes: $"Shared with {toDisplay}",
            inNotes: $"Share from {fromDisplay}",
            cancellationToken);

        request.FromCellarId = fromCellar.Id;
        request.ToCellarId = toCellar.Id;
        request.Status = OilShareRequestStatuses.Accepted;
        request.ResultLotId = moved.ResultLotId;
        request.UpdatedAt = _clock.UtcNow;
        request = await _shareRequests.UpdateAsync(request, cancellationToken);
        return ToShareDto(request, userId);
    }

    public async Task<OilTransferDto> TransferToUserAsync(
        string userId,
        TransferOilDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.ToUserId))
        {
            throw new ValidationException("Choose who receives the oil.");
        }

        var toUserId = dto.ToUserId.Trim();
        if (string.Equals(toUserId, userId, StringComparison.Ordinal))
        {
            throw new ValidationException("You cannot transfer oil to your own cellar.");
        }

        var wanted = OilStockDtoMapper.FromDto(dto.Requested);
        if (OilPackMath.IsEmpty(wanted) || OilPackMath.PackLitres(wanted) <= 0.05m)
        {
            throw new ValidationException("Say how much oil to transfer (tins and/or bulk).");
        }

        var fieldIds = Distinct(dto.FieldIds);
        var fromCellar = await EnsureCellarForPersonAsync(userId, cancellationToken);
        var toCellar = await EnsureCellarForPersonAsync(toUserId, cancellationToken);

        // Resolve groves from the free lots we will draw from when the caller did not name any.
        var lots = (await LoadLotsAsync(fromCellar, null, null, cancellationToken))
            .Where(l => fieldIds.Count == 0 || l.FieldIds.Any(id => fieldIds.Contains(id)))
            .OrderBy(l => l.PressedOn)
            .ThenBy(l => l.CreatedAt)
            .ToList();

        var resolvedFieldIds = fieldIds.Count > 0
            ? fieldIds
            : lots.SelectMany(l => l.FieldIds).Distinct().ToList();

        if (resolvedFieldIds.Count == 0)
        {
            throw new ValidationException("Choose at least one grove for the transfer.");
        }

        var fields = (await _fields.GetByIdsAsync(resolvedFieldIds, cancellationToken)).ToList();
        if (fields.Count == 0)
        {
            throw new ValidationException("Unknown grove for oil transfer.");
        }

        if (!OilCellarRules.CanAssignCellar(fields, userId))
        {
            throw new ForbiddenException("Only the grove admin can transfer oil to another cellar.");
        }

        if (!OilCellarRules.IsEligibleCellarOwner(fields, toUserId))
        {
            throw new ValidationException("That person cannot receive oil into their cellar for this grove.");
        }

        var fromPerson = ResolveAdminPerson(fields);
        var toPerson = fields
            .Select(f => FieldPeopleRules.GetActiveByUserId(f, toUserId))
            .FirstOrDefault(p => p is not null);

        var fromDisplay = fromPerson?.DisplayName?.Trim();
        if (string.IsNullOrWhiteSpace(fromDisplay)) fromDisplay = userId;
        var toDisplay = toPerson?.DisplayName?.Trim();
        if (string.IsNullOrWhiteSpace(toDisplay)) toDisplay = toUserId;

        var notes = NullIfEmpty(dto.Notes);
        var transferId = Guid.NewGuid().ToString("N");
        var moved = await MovePackBetweenCellarsAsync(
            fromCellar,
            toCellar,
            wanted,
            resolvedFieldIds,
            batchId: $"transfer:{transferId}",
            outNotes: notes ?? $"Transferred to {toDisplay}",
            inNotes: notes ?? $"Transfer from {fromDisplay}",
            cancellationToken,
            transferId);

        return new OilTransferDto
        {
            TransferId = moved.TransferId,
            FromOwnerUserId = userId,
            ToUserId = toUserId,
            FromDisplayName = fromDisplay,
            ToDisplayName = toDisplay,
            Requested = OilStockDtoMapper.ToDto(wanted),
            FieldIds = moved.FieldIds,
            ResultLotId = moved.ResultLotId,
            Notes = notes
        };
    }

    public async Task<OilShareRequestDto> RejectShareRequestAsync(
        string userId,
        string requestId,
        CancellationToken cancellationToken = default)
    {
        var request = await _shareRequests.GetByIdAsync(requestId, cancellationToken)
            ?? throw new NotFoundException("Oil share request not found.");

        var isSource = string.Equals(request.FromOwnerUserId, userId, StringComparison.Ordinal);
        var isRequester = string.Equals(request.ToUserId, userId, StringComparison.Ordinal);
        if (!isSource && !isRequester)
        {
            throw new ForbiddenException("You cannot change this oil request.");
        }

        if (!string.Equals(request.Status, OilShareRequestStatuses.Pending, StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("This request is no longer pending.");
        }

        request.Status = isSource ? OilShareRequestStatuses.Rejected : OilShareRequestStatuses.Cancelled;
        request.UpdatedAt = _clock.UtcNow;
        request = await _shareRequests.UpdateAsync(request, cancellationToken);
        return ToShareDto(request, userId);
    }

    private sealed class CellarTransferResult
    {
        public string TransferId { get; init; } = string.Empty;
        public string ResultLotId { get; init; } = string.Empty;
        public List<string> FieldIds { get; init; } = [];
    }

    /// <summary>
    /// FIFO deduct from <paramref name="fromCellar"/> and create a destination lot in
    /// <paramref name="toCellar"/>, pairing SharedOut/SharedIn under one transfer id.
    /// </summary>
    private async Task<CellarTransferResult> MovePackBetweenCellarsAsync(
        OilCellar fromCellar,
        OilCellar toCellar,
        OilPack wanted,
        IReadOnlyList<string> fieldFilter,
        string batchId,
        string outNotes,
        string inNotes,
        CancellationToken cancellationToken,
        string? transferId = null)
    {
        var lots = (await LoadLotsAsync(fromCellar, null, null, cancellationToken))
            .Where(l => fieldFilter.Count == 0
                || l.FieldIds.Any(id => fieldFilter.Contains(id)))
            .OrderBy(l => l.PressedOn)
            .ThenBy(l => l.CreatedAt)
            .ToList();

        var commitments = (await LoadCommitmentsAsync(fromCellar, cancellationToken))
            .Where(c => !c.Cancelled)
            .ToList();
        var reservedByLot = BuildOpenReservationByLot(commitments, saleOnly: false);
        var allocations = AllocateFifo(lots, reservedByLot, wanted);
        var allocated = SumPacks(allocations.Select(a => a.Pack));
        if (OilPackMath.PackLitres(allocated) + 0.05m < OilPackMath.PackLitres(wanted)
            || allocated.Tin16 < wanted.Tin16
            || allocated.Tin17 < wanted.Tin17
            || allocated.BulkLitres + 0.05m < wanted.BulkLitres)
        {
            throw new ValidationException("Not enough free oil in your cellar for this transfer.");
        }

        var now = _clock.UtcNow;
        var sourceLots = allocations.Select(a => lots.First(l => l.Id == a.OilLotId)).ToList();
        var fieldIds = sourceLots.SelectMany(l => l.FieldIds).Distinct().ToList();
        if (fieldIds.Count == 0) fieldIds = fieldFilter.ToList();

        var provenance = ShareProvenance(allocations, sourceLots, fieldIds);
        var resultYear = sourceLots
            .Select(l => l.ResultYear)
            .DefaultIfEmpty(AgriculturalYear.For(now))
            .Max();

        var pairId = string.IsNullOrWhiteSpace(transferId)
            ? Guid.NewGuid().ToString("N")
            : transferId.Trim();

        foreach (var slice in allocations)
        {
            var lot = lots.First(l => l.Id == slice.OilLotId);
            lot.Packing = OilPackMath.Subtract(lot.Packing, slice.Pack);
            lot.UpdatedAt = now;
            await _lots.UpdateAsync(lot, cancellationToken);
            await RecordMovementAsync(
                fromCellar,
                lot.Id,
                null,
                StockMovementKind.SharedOut,
                slice.Pack,
                -OilPackMath.PackLitres(slice.Pack),
                outNotes,
                now,
                cancellationToken,
                pairId);
        }

        var destLot = await _lots.CreateAsync(new OilLot
        {
            CellarId = toCellar.Id,
            OwnerUserId = toCellar.OwnerPersonId,
            BatchId = batchId,
            PressedOn = now,
            ResultYear = resultYear,
            HarvestRecordIds = [],
            FieldIds = fieldIds,
            Provenance = provenance,
            TotalAmount = OilPackMath.PackLitres(wanted),
            Unit = "litres",
            MillKept = 0,
            Packing = wanted.Clone(),
            Notes = inNotes,
            CreatedAt = now,
            UpdatedAt = now
        }, cancellationToken);

        await RecordMovementAsync(
            toCellar,
            destLot.Id,
            null,
            StockMovementKind.SharedIn,
            wanted,
            OilPackMath.PackLitres(wanted),
            inNotes,
            now,
            cancellationToken,
            pairId);

        return new CellarTransferResult
        {
            TransferId = pairId,
            ResultLotId = destLot.Id,
            FieldIds = fieldIds
        };
    }

    /// <summary>Every person gets exactly one cellar; it is created the first time they touch oil.</summary>
    private async Task<OilCellar> EnsureCellarForPersonAsync(string personId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(personId))
        {
            throw new ValidationException("A person is required to open a cellar.");
        }

        var owner = personId.Trim();
        var existing = await _cellars.GetByOwnerPersonIdAsync(owner, cancellationToken);
        if (existing is not null) return existing;

        var now = _clock.UtcNow;
        return await _cellars.CreateAsync(
            new OilCellar
            {
                OwnerPersonId = owner,
                Name = string.Empty,
                Status = OilCellarStatuses.Active,
                CreatedAt = now,
                UpdatedAt = now
            },
            cancellationToken);
    }

    /// <summary>
    /// Pre-cellar documents only carry the owner mirror. Stamping the cellar here means the next
    /// save of that document backfills it; nothing else in the service has to know about it.
    /// </summary>
    private static void AdoptIntoCellar(OilLot lot, OilCellar cellar)
    {
        if (string.IsNullOrWhiteSpace(lot.CellarId)) lot.CellarId = cellar.Id;
        if (string.IsNullOrWhiteSpace(lot.OwnerUserId)) lot.OwnerUserId = cellar.OwnerPersonId;
    }

    private static void AdoptIntoCellar(OilCommitment commitment, OilCellar cellar)
    {
        if (string.IsNullOrWhiteSpace(commitment.CellarId)) commitment.CellarId = cellar.Id;
        if (string.IsNullOrWhiteSpace(commitment.OwnerUserId)) commitment.OwnerUserId = cellar.OwnerPersonId;
    }

    private async Task<IReadOnlyList<OilLot>> LoadLotsAsync(
        OilCellar cellar,
        int? resultYear,
        string? fieldId,
        CancellationToken cancellationToken)
    {
        var lots = await _lots.GetByCellarIdAsync(cellar.Id, cellar.OwnerPersonId, resultYear, cancellationToken);
        foreach (var lot in lots) AdoptIntoCellar(lot, cellar);
        if (string.IsNullOrWhiteSpace(fieldId)) return lots;
        return lots.Where(l => l.FieldIds.Contains(fieldId)).ToList();
    }

    private async Task<IReadOnlyList<OilCommitment>> LoadCommitmentsAsync(
        OilCellar cellar,
        CancellationToken cancellationToken)
    {
        var commitments = await _commitments.GetByCellarIdAsync(cellar.Id, cellar.OwnerPersonId, cancellationToken);
        foreach (var commitment in commitments) AdoptIntoCellar(commitment, cellar);
        return commitments;
    }

    private async Task<OilLot> RequireLotAsync(OilCellar cellar, string lotId, CancellationToken ct)
    {
        var lot = await _lots.GetByIdAsync(lotId, ct)
            ?? throw new NotFoundException("Oil lot not found.");
        if (!BelongsToCellar(lot.CellarId, lot.OwnerUserId, cellar))
        {
            throw new ForbiddenException("You cannot change this oil lot.");
        }

        AdoptIntoCellar(lot, cellar);
        return lot;
    }

    private async Task<OilCommitment> RequireCommitmentAsync(OilCellar cellar, string commitmentId, CancellationToken ct)
    {
        var commitment = await _commitments.GetByIdAsync(commitmentId, ct)
            ?? throw new NotFoundException("Commitment not found.");
        if (!BelongsToCellar(commitment.CellarId, commitment.OwnerUserId, cellar))
        {
            throw new ForbiddenException("You cannot change this commitment.");
        }

        AdoptIntoCellar(commitment, cellar);
        return commitment;
    }

    private static bool BelongsToCellar(string cellarId, string ownerUserId, OilCellar cellar) =>
        string.Equals(cellarId, cellar.Id, StringComparison.Ordinal)
        || (string.IsNullOrWhiteSpace(cellarId)
            && string.Equals(ownerUserId, cellar.OwnerPersonId, StringComparison.Ordinal));

    private async Task<OilPack> AvailablePackForOwnerFieldsAsync(
        string ownerUserId,
        IReadOnlyList<string> fieldIds,
        CancellationToken cancellationToken)
    {
        // Read-only path: do not open a cellar for someone who has never stored oil.
        var cellar = await _cellars.GetByOwnerPersonIdAsync(ownerUserId, cancellationToken);
        var cellarId = cellar?.Id ?? string.Empty;

        var lots = (await _lots.GetByCellarIdAsync(cellarId, ownerUserId, null, cancellationToken))
            .Where(l => fieldIds.Count == 0 || l.FieldIds.Any(id => fieldIds.Contains(id)))
            .ToList();
        var commitments = (await _commitments.GetByCellarIdAsync(cellarId, ownerUserId, cancellationToken))
            .Where(c => !c.Cancelled)
            .ToList();
        var reservedByLot = BuildOpenReservationByLot(commitments, saleOnly: false);
        var free = OilPack.Empty();
        foreach (var lot in lots)
        {
            reservedByLot.TryGetValue(lot.Id, out var reserved);
            reserved ??= OilPack.Empty();
            free = OilPackMath.Add(free, OilPackMath.Subtract(lot.Packing, reserved));
        }

        return free;
    }

    private async Task<OilPressingDto> MaterialisePressingAsync(
        string callerUserId,
        OilPressing pressing,
        IReadOnlyList<OilPressingAllocationDto> requested,
        List<OilProvenanceEntry> provenance,
        List<string> fieldIds,
        decimal farmerLitres,
        CancellationToken cancellationToken)
    {
        var slices = requested
            .Select(a => new
            {
                a.CellarOwnerUserId,
                Litres = OilPackMath.Round1(Math.Max(0, a.Litres))
            })
            .Where(a => a.Litres > 0.05m)
            .ToList();

        if (slices.Count == 0)
        {
            throw new ValidationException("Say how much oil each cellar takes home.");
        }

        if (slices.Sum(a => a.Litres) > farmerLitres + 0.05m)
        {
            throw new ValidationException("The split is more oil than the pressing produced.");
        }

        var now = _clock.UtcNow;
        var allocations = new List<PressingAllocation>();
        foreach (var slice in slices)
        {
            var ownerUserId = await ResolveCellarOwnerAsync(
                callerUserId,
                slice.CellarOwnerUserId,
                fieldIds,
                cancellationToken);
            var cellar = await EnsureCellarForPersonAsync(ownerUserId, cancellationToken);
            var lot = await UpsertPressingLotAsync(
                cellar,
                pressing,
                provenance,
                fieldIds,
                slice.Litres,
                callerUserId,
                now,
                cancellationToken);

            allocations.Add(new PressingAllocation
            {
                PressingId = pressing.Id,
                CellarId = cellar.Id,
                Litres = slice.Litres,
                AllocatedBy = callerUserId,
                AllocatedAt = now,
                OilLotId = lot.Id
            });
        }

        pressing.Allocations = allocations;
        pressing.Status = OilPressingStatuses.Confirmed;
        pressing.UpdatedAt = now;
        pressing = await _pressings.UpdateAsync(pressing, cancellationToken);
        return await ToPressingDtoAsync(pressing, callerUserId, cancellationToken);
    }

    private async Task<OilLot> UpsertPressingLotAsync(
        OilCellar cellar,
        OilPressing pressing,
        List<OilProvenanceEntry> provenance,
        List<string> fieldIds,
        decimal litres,
        string callerUserId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        // The slice is already the farmer's litres, so the lot carries no further mill deduction.
        var packing = OilPackMath.DefaultPackingFromFarmerLitres(litres);
        var existing = await _lots.GetByCellarAndBatchIdAsync(
            cellar.Id,
            pressing.BatchId,
            cellar.OwnerPersonId,
            cancellationToken);

        if (existing is null)
        {
            var created = await _lots.CreateAsync(
                new OilLot
                {
                    CellarId = cellar.Id,
                    OwnerUserId = cellar.OwnerPersonId,
                    BatchId = pressing.BatchId,
                    SourcePressingId = pressing.Id,
                    PressedOn = pressing.PressedOn,
                    ResultYear = pressing.ResultYear,
                    HarvestRecordIds = pressing.HarvestRecordIds.ToList(),
                    FieldIds = fieldIds,
                    Provenance = provenance.Select(p => new OilProvenanceEntry { FieldId = p.FieldId, Share = p.Share }).ToList(),
                    TotalAmount = litres,
                    Unit = "litres",
                    MillKept = 0,
                    Packing = packing,
                    Notes = pressing.Notes,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                cancellationToken);

            await RecordMovementAsync(
                cellar,
                created.Id,
                null,
                StockMovementKind.Produced,
                packing,
                OilPackMath.PackLitres(packing),
                cellar.OwnerPersonId == callerUserId
                    ? "Oil lot created"
                    : $"Oil lot assigned to cellar by {callerUserId}",
                pressing.PressedOn,
                cancellationToken);
            return created;
        }

        AdoptIntoCellar(existing, cellar);
        var previous = existing.Packing.Clone();
        existing.SourcePressingId = pressing.Id;
        existing.PressedOn = pressing.PressedOn;
        existing.ResultYear = pressing.ResultYear;
        existing.HarvestRecordIds = pressing.HarvestRecordIds.ToList();
        existing.TotalAmount = litres;
        existing.Unit = "litres";
        existing.MillKept = 0;
        if (fieldIds.Count > 0)
        {
            existing.FieldIds = fieldIds;
            existing.Provenance = provenance
                .Select(p => new OilProvenanceEntry { FieldId = p.FieldId, Share = p.Share })
                .ToList();
        }

        var locked = await HasCellarMutationsAsync(cellar, existing.Id, cancellationToken);
        var packingChanged = false;
        if (!locked)
        {
            packingChanged = !PackEquals(previous, packing);
            existing.Packing = packing;
        }

        existing.UpdatedAt = now;
        existing = await _lots.UpdateAsync(existing, cancellationToken);

        if (packingChanged)
        {
            await RecordMovementAsync(
                cellar,
                existing.Id,
                null,
                StockMovementKind.Packed,
                packing,
                OilPackMath.PackLitres(packing) - OilPackMath.PackLitres(previous),
                "Packing updated",
                now,
                cancellationToken);
        }

        return existing;
    }

    private async Task<OilPressingDto> ToPressingDtoAsync(
        OilPressing pressing,
        string viewerUserId,
        CancellationToken cancellationToken)
    {
        var provenance = OilProvenance.Resolve(pressing.Provenance, pressing.FieldIds);
        var allocations = new List<OilPressingAllocationDto>(pressing.Allocations.Count);
        var viewerLotIds = new List<string>();

        foreach (var allocation in pressing.Allocations)
        {
            var cellar = string.IsNullOrWhiteSpace(allocation.CellarId)
                ? null
                : await _cellars.GetByIdAsync(allocation.CellarId, cancellationToken);
            var ownerUserId = cellar?.OwnerPersonId ?? string.Empty;
            allocations.Add(new OilPressingAllocationDto
            {
                CellarId = allocation.CellarId,
                CellarOwnerUserId = ownerUserId,
                Litres = allocation.Litres,
                OilLotId = allocation.OilLotId
            });

            if (!string.IsNullOrWhiteSpace(allocation.OilLotId)
                && string.Equals(ownerUserId, viewerUserId, StringComparison.Ordinal))
            {
                viewerLotIds.Add(allocation.OilLotId);
            }
        }

        var lots = new List<OilLotDto>(viewerLotIds.Count);
        foreach (var lotId in viewerLotIds)
        {
            var lot = await _lots.GetByIdAsync(lotId, cancellationToken);
            if (lot is not null) lots.Add(ToLotDto(lot, new Dictionary<string, OilPack>()));
        }

        // Only a parked ticket needs the cellar list; a confirmed one is already split.
        var candidates = new List<OilCellarCandidateDto>();
        var pressingFieldIds = OilProvenance.FieldIds(provenance);
        if (string.Equals(pressing.Status, OilPressingStatuses.PendingAllocation, StringComparison.OrdinalIgnoreCase)
            && pressingFieldIds.Count > 0)
        {
            var groves = (await _fields.GetByIdsAsync(pressingFieldIds, cancellationToken)).ToList();
            if (groves.Count > 0) candidates = ToCandidateDtos(groves, viewerUserId);
        }

        return new OilPressingDto
        {
            Id = pressing.Id,
            BatchId = pressing.BatchId,
            CampaignId = pressing.CampaignId,
            PressedOn = pressing.PressedOn,
            ResultYear = pressing.ResultYear,
            TotalAmount = pressing.TotalLitres,
            Unit = pressing.Unit,
            MillKept = pressing.MillKept,
            ConversionFactor = pressing.ConversionFactor,
            FarmerLitres = OilPackMath.ToFarmerLitres(
                pressing.TotalLitres,
                pressing.Unit,
                pressing.MillKept,
                pressing.ConversionFactor),
            FieldIds = pressingFieldIds,
            Provenance = ToProvenanceDtos(provenance),
            HarvestRecordIds = pressing.HarvestRecordIds,
            Status = pressing.Status,
            RecordedByUserId = pressing.RecordedByUserId,
            Candidates = candidates,
            Notes = pressing.Notes,
            Allocations = allocations,
            Lots = lots,
            CreatedAt = pressing.CreatedAt,
            UpdatedAt = pressing.UpdatedAt
        };
    }

    private static bool IsActiveFamilyOnFields(IEnumerable<Field> fields, string userId)
    {
        foreach (var field in fields)
        {
            if (FieldPeopleRules.IsAdmin(field, userId)) return false;
            var seat = FieldPeopleRules.GetActiveByUserId(field, userId);
            if (seat is not null
                && seat.Role == FieldPersonRole.Family
                && string.Equals(seat.Status, FamilyMemberStatuses.Active, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static FieldPerson? ResolveAdminPerson(IEnumerable<Field> fields)
    {
        foreach (var field in fields)
        {
            var admin = FieldPeopleRules.GetAdmin(field);
            if (admin is not null && !string.IsNullOrWhiteSpace(admin.UserId))
            {
                return admin;
            }
        }

        return null;
    }

    private static List<OilCellarCandidateDto> ToCandidateDtos(IReadOnlyList<Field> fields, string userId) =>
        OilCellarRules.EligibleCellarPeople(fields)
            .Select(p => new OilCellarCandidateDto
            {
                UserId = p.UserId,
                DisplayName = p.DisplayName?.Trim() ?? string.Empty,
                Role = p.Role switch
                {
                    FieldPersonRole.Admin => "admin",
                    FieldPersonRole.Family => "family",
                    _ => "family"
                },
                IsYou = string.Equals(p.UserId, userId, StringComparison.Ordinal)
            })
            .OrderByDescending(c => c.IsYou)
            .ThenBy(c => c.DisplayName, StringComparer.CurrentCultureIgnoreCase)
            .ToList();

    private static OilShareRequestDto ToShareDto(OilShareRequest r, string viewerUserId) => new()
    {
        Id = r.Id,
        FromOwnerUserId = r.FromOwnerUserId,
        ToUserId = r.ToUserId,
        FromDisplayName = r.FromDisplayName,
        ToDisplayName = r.ToDisplayName,
        Requested = OilStockDtoMapper.ToDto(r.Requested),
        FieldIds = r.FieldIds,
        Notes = r.Notes,
        Status = r.Status,
        ResultLotId = r.ResultLotId,
        IsIncoming = string.Equals(r.FromOwnerUserId, viewerUserId, StringComparison.Ordinal),
        CreatedAt = r.CreatedAt,
        UpdatedAt = r.UpdatedAt
    };

    private async Task<bool> HasCellarMutationsAsync(
        OilCellar cellar,
        string oilLotId,
        CancellationToken cancellationToken)
    {
        var commitments = await LoadCommitmentsAsync(cellar, cancellationToken);
        if (commitments.Any(c =>
                !c.Cancelled
                && c.Allocations.Any(a => a.OilLotId == oilLotId)
                && !OilPackMath.IsEmpty(c.Delivered)))
        {
            return true;
        }

        var movements = await _movements.GetByCellarIdAsync(
            cellar.Id,
            cellar.OwnerPersonId,
            limit: 200,
            cancellationToken);
        return movements.Any(m =>
            m.OilLotId == oilLotId
            && m.Kind is StockMovementKind.Delivered
                or StockMovementKind.Gifted
                or StockMovementKind.HomeUse
                or StockMovementKind.Consumed
                or StockMovementKind.Repacked
                or StockMovementKind.Correction
                or StockMovementKind.Returned
                or StockMovementKind.SharedOut);
    }

    private async Task<StockMovement> RecordMovementAsync(
        OilCellar cellar,
        string? oilLotId,
        string? commitmentId,
        StockMovementKind kind,
        OilPack packDelta,
        decimal litresDelta,
        string? notes,
        DateTime occurredOn,
        CancellationToken ct,
        string? transferId = null,
        string? reversalOfMovementId = null)
    {
        return await _movements.CreateAsync(new StockMovement
        {
            CellarId = cellar.Id,
            OwnerUserId = cellar.OwnerPersonId,
            OilLotId = oilLotId,
            OilCommitmentId = commitmentId,
            Kind = kind,
            PackDelta = packDelta.Clone(),
            LitresDelta = OilPackMath.Round1(litresDelta),
            TransferId = transferId,
            ReversalOfMovementId = reversalOfMovementId,
            Notes = notes,
            OccurredOn = occurredOn,
            CreatedAt = occurredOn,
            UpdatedAt = occurredOn
        }, ct);
    }

    /// <summary>Movements a farmer may undo — the ones they could have simply mistyped.</summary>
    private static readonly StockMovementKind[] ReversibleKinds =
    [
        StockMovementKind.Gifted,
        StockMovementKind.Sold,
        StockMovementKind.Consumed,
        StockMovementKind.HomeUse,
        StockMovementKind.Correction,
        StockMovementKind.Returned,
        StockMovementKind.SharedOut
    ];

    private static OilPack TakeOrThrow(OilLot lot, OilPack pack)
    {
        var take = OilPackMath.Take(lot.Packing, pack, OilPackMath.PackLitres(lot.Packing));
        if (OilPackMath.PackLitres(take) + 0.05m < OilPackMath.PackLitres(pack))
        {
            throw new ValidationException("Not enough oil in this lot.");
        }

        return take;
    }

    private static StockMovementDto ToMovementDto(StockMovement m) => new()
    {
        Id = m.Id,
        OilLotId = m.OilLotId,
        OilCommitmentId = m.OilCommitmentId,
        Kind = ToApiKind(m.Kind),
        PackDelta = OilStockDtoMapper.ToDto(m.PackDelta),
        LitresDelta = m.LitresDelta,
        TransferId = m.TransferId,
        ReversalOfMovementId = m.ReversalOfMovementId,
        Notes = m.Notes,
        OccurredOn = m.OccurredOn
    };

    /// <summary>Groves where this person may put oil into someone else's cellar.</summary>
    private async Task<List<string>> AdminFieldIdsAsync(string userId, CancellationToken cancellationToken)
    {
        var owned = await _fields.GetByOwnerIdAsync(userId, cancellationToken);
        var member = await _fields.GetByMemberUserIdAsync(userId, cancellationToken);
        return owned
            .Concat(member)
            .GroupBy(f => f.Id, StringComparer.Ordinal)
            .Select(g => g.First())
            .Where(f => OilCellarRules.CanAssignCellar(f, userId))
            .Select(f => f.Id)
            .ToList();
    }

    private static List<OilLotAllocation> AllocateFifo(
        IReadOnlyList<OilLot> lotsOldestFirst,
        IReadOnlyDictionary<string, OilPack> reservedByLot,
        OilPack wanted)
    {
        var left = wanted.Clone();
        var outAlloc = new List<OilLotAllocation>();
        foreach (var lot in lotsOldestFirst)
        {
            if (OilPackMath.IsEmpty(left)) break;
            reservedByLot.TryGetValue(lot.Id, out var reserved);
            reserved ??= OilPack.Empty();
            var availablePack = OilPackMath.Subtract(lot.Packing, reserved);
            var availableLitres = OilPackMath.PackLitres(availablePack);
            if (availableLitres <= 0.05m) continue;
            var take = OilPackMath.Take(availablePack, left, availableLitres);
            if (OilPackMath.IsEmpty(take)) continue;
            outAlloc.Add(new OilLotAllocation { OilLotId = lot.Id, Pack = take });
            left = OilPackMath.Subtract(left, take);
        }

        return outAlloc;
    }

    private static Dictionary<string, OilPack> BuildOpenReservationByLot(
        IEnumerable<OilCommitment> commitments,
        bool saleOnly)
    {
        var map = new Dictionary<string, OilPack>();
        foreach (var c in commitments)
        {
            if (c.Cancelled) continue;
            if (saleOnly && !c.IsSale) continue;
            if (OilPackMath.IsFullyCovered(c.Requested, c.Delivered)) continue;

            // Open reserved pack is remaining requested, attributed proportionally is hard;
            // attribute remaining greedily against allocation order.
            var remaining = OilPackMath.Remaining(c.Requested, c.Delivered);
            var left = remaining.Clone();
            foreach (var a in c.Allocations)
            {
                if (OilPackMath.IsEmpty(left)) break;
                var take = OilPackMath.Min(a.Pack, left);
                if (OilPackMath.IsEmpty(take)) continue;
                if (!map.TryGetValue(a.OilLotId, out var cur)) cur = OilPack.Empty();
                map[a.OilLotId] = OilPackMath.Add(cur, take);
                left = OilPackMath.Subtract(left, take);
            }
        }

        return map;
    }

    /// <summary>Weighted grove mix of the lots a share was drawn from.</summary>
    private static List<OilProvenanceEntry> ShareProvenance(
        IReadOnlyList<OilLotAllocation> allocations,
        IReadOnlyList<OilLot> sourceLots,
        IReadOnlyList<string> fallbackFieldIds)
    {
        var weights = new List<OilProvenanceEntry>();
        foreach (var allocation in allocations)
        {
            var lot = sourceLots.FirstOrDefault(l => l.Id == allocation.OilLotId);
            if (lot is null) continue;
            var litres = OilPackMath.PackLitres(allocation.Pack);
            if (litres <= 0m) continue;
            foreach (var entry in OilProvenance.Resolve(lot.Provenance, lot.FieldIds))
            {
                weights.Add(new OilProvenanceEntry { FieldId = entry.FieldId, Share = entry.Share * litres });
            }
        }

        var normalized = OilProvenance.Normalize(weights);
        return normalized.Count > 0 ? normalized : OilProvenance.EqualShares(fallbackFieldIds);
    }

    private static List<OilProvenanceEntry> ResolveProvenance(
        IEnumerable<OilProvenanceEntryDto>? provenance,
        IEnumerable<string>? fieldIds) =>
        OilProvenance.Resolve(
            (provenance ?? []).Select(p => new OilProvenanceEntry { FieldId = p.FieldId, Share = p.Share }),
            Distinct(fieldIds));

    private static List<OilProvenanceEntryDto> ToProvenanceDtos(IEnumerable<OilProvenanceEntry> provenance) =>
        provenance
            .Select(p => new OilProvenanceEntryDto { FieldId = p.FieldId, Share = p.Share })
            .ToList();

    private static OilLotDto ToLotDto(OilLot lot, IReadOnlyDictionary<string, OilPack> reservedByLot)
    {
        reservedByLot.TryGetValue(lot.Id, out var reserved);
        reserved ??= OilPack.Empty();
        var available = OilPackMath.Subtract(lot.Packing, reserved);
        var farmer = OilPackMath.ToFarmerLitres(lot.TotalAmount, lot.Unit, lot.MillKept, lot.ConversionFactor);
        var provenance = OilProvenance.Resolve(lot.Provenance, lot.FieldIds);
        return new OilLotDto
        {
            Id = lot.Id,
            CellarId = lot.CellarId,
            CellarOwnerUserId = lot.OwnerUserId,
            BatchId = lot.BatchId,
            SourcePressingId = lot.SourcePressingId,
            PressedOn = lot.PressedOn,
            ResultYear = lot.ResultYear,
            HarvestRecordIds = lot.HarvestRecordIds,
            Provenance = ToProvenanceDtos(provenance),
            FieldIds = OilProvenance.FieldIds(provenance),
            TotalAmount = lot.TotalAmount,
            Unit = lot.Unit,
            MillKept = lot.MillKept,
            ConversionFactor = lot.ConversionFactor,
            FarmerLitres = farmer,
            Packing = OilStockDtoMapper.ToDto(lot.Packing),
            Reserved = OilStockDtoMapper.ToDto(reserved),
            Available = OilStockDtoMapper.ToDto(available),
            Notes = lot.Notes,
            CreatedAt = lot.CreatedAt,
            UpdatedAt = lot.UpdatedAt
        };
    }

    private static OilCommitmentDto ToCommitmentDto(OilCommitment c)
    {
        var remaining = OilPackMath.Remaining(c.Requested, c.Delivered);
        var fully = OilPackMath.IsFullyCovered(c.Requested, c.Delivered);
        var status = c.Cancelled
            ? "cancelled"
            : fully
                ? "delivered"
                : c.IsSale
                    ? "pending_delivery"
                    : "reserved";

        return new OilCommitmentDto
        {
            Id = c.Id,
            ContactId = c.ContactId,
            CounterpartyName = c.CounterpartyName,
            Requested = OilStockDtoMapper.ToDto(c.Requested),
            Delivered = OilStockDtoMapper.ToDto(c.Delivered),
            Remaining = OilStockDtoMapper.ToDto(remaining),
            IsSale = c.IsSale,
            Amount = c.Amount,
            Currency = c.Currency,
            FinancialTransactionId = c.FinancialTransactionId,
            Allocations = c.Allocations
                .Select(a => new OilLotAllocationDto
                {
                    OilLotId = a.OilLotId,
                    Pack = OilStockDtoMapper.ToDto(a.Pack)
                })
                .ToList(),
            PromisedFor = c.PromisedFor,
            Notes = c.Notes,
            Cancelled = c.Cancelled,
            DerivedStatus = status,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt
        };
    }

    private async Task<string> ResolveCellarOwnerAsync(
        string callerUserId,
        string? requestedCellarOwnerUserId,
        IReadOnlyList<string> fieldIds,
        CancellationToken cancellationToken)
    {
        if (fieldIds.Count == 0)
        {
            if (!string.IsNullOrWhiteSpace(requestedCellarOwnerUserId)
                && !string.Equals(requestedCellarOwnerUserId.Trim(), callerUserId, StringComparison.Ordinal))
            {
                throw new ValidationException("Cannot assign oil to another cellar without a grove.");
            }

            return callerUserId;
        }

        var fields = (await _fields.GetByIdsAsync(fieldIds, cancellationToken)).ToList();
        if (fields.Count == 0)
        {
            throw new ValidationException("Unknown field for oil cellar assignment.");
        }

        var admin = ResolveAdminPerson(fields);
        var adminUserId = admin is not null && !string.IsNullOrWhiteSpace(admin.UserId)
            ? admin.UserId
            : null;

        // Omitted owner → grove admin (admin-first stock). Fall back to caller only when there is no admin.
        var requested = string.IsNullOrWhiteSpace(requestedCellarOwnerUserId)
            ? (adminUserId ?? callerUserId)
            : requestedCellarOwnerUserId.Trim();

        var filingIntoAdmin = adminUserId is not null
            && string.Equals(requested, adminUserId, StringComparison.Ordinal);

        // Anyone may file into the admin cellar. Only the admin may put oil in someone else's cellar.
        if (!string.Equals(requested, callerUserId, StringComparison.Ordinal)
            && !filingIntoAdmin
            && !OilCellarRules.CanAssignCellar(fields, callerUserId))
        {
            throw new ForbiddenException("Only the grove admin can put oil in someone else's cellar.");
        }

        if (!OilCellarRules.IsEligibleCellarOwner(fields, requested))
        {
            if (string.Equals(requested, callerUserId, StringComparison.Ordinal)
                && adminUserId is not null
                && OilCellarRules.IsEligibleCellarOwner(fields, adminUserId))
            {
                return adminUserId;
            }

            throw new ValidationException("That person cannot receive oil into their cellar for this grove.");
        }

        return requested;
    }

    private static OilPack SumPacks(IEnumerable<OilPack> packs) =>
        packs.Aggregate(OilPack.Empty(), OilPackMath.Add);

    private static string? ResolveFieldId(IReadOnlyList<OilLot> lots, List<OilLotAllocation> allocations)
    {
        var ids = allocations
            .Select(a => lots.FirstOrDefault(l => l.Id == a.OilLotId))
            .Where(l => l is not null)
            .SelectMany(l => l!.FieldIds)
            .Distinct()
            .ToList();
        return ids.Count == 1 ? ids[0] : null;
    }

    private static string NormalizeUnit(string? unit) =>
        string.Equals(unit, "kg", StringComparison.OrdinalIgnoreCase) ? "kg" : "litres";

    private static List<string> Distinct(IEnumerable<string>? ids) =>
        (ids ?? []).Where(id => !string.IsNullOrWhiteSpace(id)).Select(id => id.Trim()).Distinct().ToList();

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static bool PackEquals(OilPack a, OilPack b) =>
        a.Tin16 == b.Tin16 && a.Tin17 == b.Tin17 && Math.Abs(a.BulkLitres - b.BulkLitres) < 0.05m;

    private static StockMovementKind ParseAdjustKind(string? kind) => kind?.Trim().ToLowerInvariant() switch
    {
        "gifted" or "gift" => StockMovementKind.Gifted,
        "home_use" or "home" => StockMovementKind.HomeUse,
        "consumed" or "consumption" => StockMovementKind.Consumed,
        "returned" or "return" => StockMovementKind.Returned,
        "correction" => StockMovementKind.Correction,
        _ => throw new ValidationException("Unknown adjustment kind.")
    };

    private static string ToApiKind(StockMovementKind kind) => kind switch
    {
        StockMovementKind.Produced => "produced",
        StockMovementKind.Packed => "packed",
        StockMovementKind.Reserved => "reserved",
        StockMovementKind.ReservationCancelled => "reservation_cancelled",
        StockMovementKind.Sold => "sold",
        StockMovementKind.Delivered => "delivered",
        StockMovementKind.Consumed => "consumed",
        StockMovementKind.Gifted => "gifted",
        StockMovementKind.Correction => "correction",
        StockMovementKind.Repacked => "repacked",
        StockMovementKind.HomeUse => "home_use",
        StockMovementKind.Returned => "returned",
        StockMovementKind.SharedOut => "shared_out",
        StockMovementKind.SharedIn => "shared_in",
        _ => kind.ToString().ToLowerInvariant()
    };
}
