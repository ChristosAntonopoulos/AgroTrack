using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.DTOs.OilStock;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.OilStock;
using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Application.Services;

public class OilStockService : IOilStockService
{
    private readonly IOilLotRepository _lots;
    private readonly IOilCommitmentRepository _commitments;
    private readonly IStockMovementRepository _movements;
    private readonly IFinancialTransactionService _finance;
    private readonly IDateTimeProvider _clock;

    public OilStockService(
        IOilLotRepository lots,
        IOilCommitmentRepository commitments,
        IStockMovementRepository movements,
        IFinancialTransactionService finance,
        IDateTimeProvider clock)
    {
        _lots = lots;
        _commitments = commitments;
        _movements = movements;
        _finance = finance;
        _clock = clock;
    }

    public async Task<OilStockSummaryDto> GetSummaryAsync(
        string userId,
        int? resultYear,
        string? fieldId,
        CancellationToken cancellationToken = default)
    {
        var lots = await LoadLotsAsync(userId, resultYear, fieldId, cancellationToken);
        var commitments = (await _commitments.GetByOwnerAsync(userId, cancellationToken))
            .Where(c => !c.Cancelled)
            .ToList();

        var reservedByLot = BuildOpenReservationByLot(commitments, saleOnly: false);
        var pendingByLot = BuildOpenReservationByLot(commitments, saleOnly: true);

        var lotDtos = lots.Select(lot => ToLotDto(lot, reservedByLot)).ToList();
        var physical = SumPacks(lots.Select(l => l.Packing));
        var reserved = SumPacks(lotDtos.Select(l => OilStockDtoMapper.FromDto(l.Reserved)));
        // Pending delivery is the sale subset of reserved (still in cellar).
        var pending = SumPacks(
            commitments
                .Where(c => c.IsSale && !OilPackMath.IsFullyCovered(c.Requested, c.Delivered))
                .Select(c => OilPackMath.Remaining(c.Requested, c.Delivered)));
        var promiseOnly = OilPackMath.Subtract(reserved, pending);
        var available = OilPackMath.Subtract(physical, reserved);
        var delivered = SumPacks(commitments.Select(c => c.Delivered));

        var open = commitments
            .Where(c => !OilPackMath.IsFullyCovered(c.Requested, c.Delivered))
            .Select(ToCommitmentDto)
            .ToList();

        return new OilStockSummaryDto
        {
            Physical = OilStockDtoMapper.ToDto(physical),
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

        var existing = await _lots.GetByOwnerAndBatchIdAsync(userId, dto.BatchId.Trim(), cancellationToken);
        var now = _clock.UtcNow;

        if (existing is null)
        {
            var created = new OilLot
            {
                OwnerUserId = userId,
                BatchId = dto.BatchId.Trim(),
                PressedOn = pressedOn,
                ResultYear = resultYear,
                HarvestRecordIds = Distinct(dto.HarvestRecordIds),
                FieldIds = Distinct(dto.FieldIds),
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
                userId,
                created.Id,
                null,
                StockMovementKind.Produced,
                packing,
                OilPackMath.PackLitres(packing),
                "Oil lot created",
                pressedOn,
                cancellationToken);
            return ToLotDto(created, new Dictionary<string, OilPack>());
        }

        var previousPack = existing.Packing.Clone();
        existing.PressedOn = pressedOn;
        existing.ResultYear = resultYear;
        if (dto.HarvestRecordIds is { Count: > 0 })
        {
            existing.HarvestRecordIds = Distinct(dto.HarvestRecordIds);
        }

        if (dto.FieldIds is { Count: > 0 })
        {
            existing.FieldIds = Distinct(dto.FieldIds);
        }

        existing.TotalAmount = dto.TotalAmount;
        existing.Unit = unit;
        existing.MillKept = Math.Max(0, dto.MillKept);
        existing.ConversionFactor = dto.ConversionFactor ?? existing.ConversionFactor;

        // Harvest re-sync must not restore oil that already left the cellar.
        var cellarLocked = await HasCellarMutationsAsync(userId, existing.Id, cancellationToken);
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
                userId,
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
            (await _commitments.GetByOwnerAsync(userId, cancellationToken)).Where(c => !c.Cancelled),
            saleOnly: false);
        return ToLotDto(existing, reserved);
    }

    public async Task<OilLotDto> PatchPackingAsync(
        string userId,
        string lotId,
        PatchOilLotPackingDto dto,
        CancellationToken cancellationToken = default)
    {
        var lot = await RequireLotAsync(userId, lotId, cancellationToken);
        var previous = lot.Packing.Clone();
        lot.Packing = OilStockDtoMapper.FromDto(dto.Packing);
        if (dto.MillKept.HasValue) lot.MillKept = Math.Max(0, dto.MillKept.Value);
        lot.UpdatedAt = _clock.UtcNow;
        lot = await _lots.UpdateAsync(lot, cancellationToken);
        await RecordMovementAsync(
            userId,
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
        var lot = await RequireLotAsync(userId, lotId, cancellationToken);
        lot.Packing = OilPackMath.Repack(lot.Packing, dto.AddTin16, dto.AddTin17);
        lot.UpdatedAt = _clock.UtcNow;
        lot = await _lots.UpdateAsync(lot, cancellationToken);
        var filled = new OilPack { Tin16 = Math.Max(0, dto.AddTin16), Tin17 = Math.Max(0, dto.AddTin17) };
        await RecordMovementAsync(
            userId,
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

    public async Task<IReadOnlyList<OilCommitmentDto>> ListCommitmentsAsync(
        string userId,
        bool openOnly,
        CancellationToken cancellationToken = default)
    {
        var all = await _commitments.GetByOwnerAsync(userId, cancellationToken);
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

        var lots = (await _lots.GetByOwnerAsync(userId, cancellationToken: cancellationToken))
            .OrderBy(l => l.PressedOn)
            .ThenBy(l => l.CreatedAt)
            .ToList();
        var open = (await _commitments.GetByOwnerAsync(userId, cancellationToken))
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
            OwnerUserId = userId,
            ContactId = NullIfEmpty(dto.ContactId),
            CounterpartyName = name,
            Requested = requested,
            Delivered = OilPack.Empty(),
            IsSale = dto.IsSale,
            Amount = dto.IsSale ? dto.Amount : null,
            Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "EUR" : dto.Currency.Trim().ToUpperInvariant(),
            Allocations = allocations,
            PromisedFor = dto.PromisedFor,
            Notes = NullIfEmpty(dto.Notes),
            CreatedAt = now,
            UpdatedAt = now
        };

        commitment = await _commitments.CreateAsync(commitment, cancellationToken);

        await RecordMovementAsync(
            userId,
            null,
            commitment.Id,
            dto.IsSale ? StockMovementKind.Sold : StockMovementKind.Reserved,
            requested,
            -OilPackMath.PackLitres(requested),
            dto.IsSale ? $"Sale to {name}" : $"Reserved for {name}",
            now,
            cancellationToken);

        if (dto.IsSale && dto.Amount is > 0)
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
                        CalculationMode = "total_only",
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
        var commitment = await _commitments.GetByIdAsync(commitmentId, cancellationToken)
            ?? throw new NotFoundException("Commitment not found.");
        if (commitment.OwnerUserId != userId)
        {
            throw new ForbiddenException("You cannot change this commitment.");
        }

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

        // Reduce physical packing on allocated lots (FIFO within allocation order).
        var left = deliver.Clone();
        foreach (var allocation in commitment.Allocations)
        {
            if (OilPackMath.IsEmpty(left)) break;
            var lot = await RequireLotAsync(userId, allocation.OilLotId, cancellationToken);
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
            userId,
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
        var commitment = await _commitments.GetByIdAsync(commitmentId, cancellationToken)
            ?? throw new NotFoundException("Commitment not found.");
        if (commitment.OwnerUserId != userId)
        {
            throw new ForbiddenException("You cannot change this commitment.");
        }

        if (!OilPackMath.IsEmpty(commitment.Delivered))
        {
            throw new ValidationException("Cannot cancel a commitment that already has deliveries.");
        }

        commitment.Cancelled = true;
        commitment.UpdatedAt = _clock.UtcNow;
        await _commitments.UpdateAsync(commitment, cancellationToken);
        await RecordMovementAsync(
            userId,
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
        var rows = await _movements.GetByOwnerAsync(userId, limit, cancellationToken);
        return rows.Select(m => new StockMovementDto
        {
            Id = m.Id,
            OilLotId = m.OilLotId,
            OilCommitmentId = m.OilCommitmentId,
            Kind = ToApiKind(m.Kind),
            PackDelta = OilStockDtoMapper.ToDto(m.PackDelta),
            LitresDelta = m.LitresDelta,
            Notes = m.Notes,
            OccurredOn = m.OccurredOn
        }).ToList();
    }

    public async Task AdjustStockAsync(
        string userId,
        AdjustStockDto dto,
        CancellationToken cancellationToken = default)
    {
        var lot = await RequireLotAsync(userId, dto.OilLotId, cancellationToken);
        var pack = OilStockDtoMapper.FromDto(dto.Pack);
        if (OilPackMath.IsEmpty(pack))
        {
            throw new ValidationException("Pack adjustment is required.");
        }

        var kind = ParseAdjustKind(dto.Kind);
        var now = _clock.UtcNow;

        if (kind is StockMovementKind.Correction or StockMovementKind.Returned)
        {
            // Correction pack is absolute delta (positive adds, negative via Subtract path not allowed — use positive pack as add).
            lot.Packing = OilPackMath.Add(lot.Packing, pack);
        }
        else
        {
            // gifted / home_use / consumed remove from cellar
            var take = OilPackMath.Take(lot.Packing, pack, OilPackMath.PackLitres(lot.Packing));
            if (OilPackMath.PackLitres(take) + 0.05m < OilPackMath.PackLitres(pack))
            {
                throw new ValidationException("Not enough oil in this lot.");
            }

            lot.Packing = OilPackMath.Subtract(lot.Packing, take);
            pack = take;
        }

        lot.UpdatedAt = now;
        await _lots.UpdateAsync(lot, cancellationToken);

        var litres = kind is StockMovementKind.Correction or StockMovementKind.Returned
            ? OilPackMath.PackLitres(pack)
            : -OilPackMath.PackLitres(pack);

        await RecordMovementAsync(
            userId,
            lot.Id,
            null,
            kind,
            pack,
            litres,
            NullIfEmpty(dto.Notes) ?? dto.Kind,
            now,
            cancellationToken);
    }

    private async Task<IReadOnlyList<OilLot>> LoadLotsAsync(
        string userId,
        int? resultYear,
        string? fieldId,
        CancellationToken cancellationToken)
    {
        var lots = await _lots.GetByOwnerAsync(userId, resultYear, cancellationToken);
        if (string.IsNullOrWhiteSpace(fieldId)) return lots;
        return lots.Where(l => l.FieldIds.Contains(fieldId)).ToList();
    }

    private async Task<OilLot> RequireLotAsync(string userId, string lotId, CancellationToken ct)
    {
        var lot = await _lots.GetByIdAsync(lotId, ct)
            ?? throw new NotFoundException("Oil lot not found.");
        if (lot.OwnerUserId != userId)
        {
            throw new ForbiddenException("You cannot change this oil lot.");
        }

        return lot;
    }

    private async Task<bool> HasCellarMutationsAsync(
        string ownerUserId,
        string oilLotId,
        CancellationToken cancellationToken)
    {
        var commitments = await _commitments.GetByOwnerAsync(ownerUserId, cancellationToken);
        if (commitments.Any(c =>
                !c.Cancelled
                && c.Allocations.Any(a => a.OilLotId == oilLotId)
                && !OilPackMath.IsEmpty(c.Delivered)))
        {
            return true;
        }

        var movements = await _movements.GetByOwnerAsync(ownerUserId, limit: 200, cancellationToken);
        return movements.Any(m =>
            m.OilLotId == oilLotId
            && m.Kind is StockMovementKind.Delivered
                or StockMovementKind.Gifted
                or StockMovementKind.HomeUse
                or StockMovementKind.Consumed
                or StockMovementKind.Repacked
                or StockMovementKind.Correction
                or StockMovementKind.Returned);
    }

    private async Task RecordMovementAsync(
        string ownerUserId,
        string? oilLotId,
        string? commitmentId,
        StockMovementKind kind,
        OilPack packDelta,
        decimal litresDelta,
        string? notes,
        DateTime occurredOn,
        CancellationToken ct)
    {
        await _movements.CreateAsync(new StockMovement
        {
            OwnerUserId = ownerUserId,
            OilLotId = oilLotId,
            OilCommitmentId = commitmentId,
            Kind = kind,
            PackDelta = packDelta.Clone(),
            LitresDelta = OilPackMath.Round1(litresDelta),
            Notes = notes,
            OccurredOn = occurredOn,
            CreatedAt = occurredOn,
            UpdatedAt = occurredOn
        }, ct);
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

    private static OilLotDto ToLotDto(OilLot lot, IReadOnlyDictionary<string, OilPack> reservedByLot)
    {
        reservedByLot.TryGetValue(lot.Id, out var reserved);
        reserved ??= OilPack.Empty();
        var available = OilPackMath.Subtract(lot.Packing, reserved);
        var farmer = OilPackMath.ToFarmerLitres(lot.TotalAmount, lot.Unit, lot.MillKept, lot.ConversionFactor);
        return new OilLotDto
        {
            Id = lot.Id,
            BatchId = lot.BatchId,
            PressedOn = lot.PressedOn,
            ResultYear = lot.ResultYear,
            HarvestRecordIds = lot.HarvestRecordIds,
            FieldIds = lot.FieldIds,
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
        _ => kind.ToString().ToLowerInvariant()
    };
}
