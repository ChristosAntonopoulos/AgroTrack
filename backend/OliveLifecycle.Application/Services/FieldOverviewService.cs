using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Chronologio;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.DTOs.OilStock;
using OliveLifecycle.Application.Services.Geospatial;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.OilStock;
using OliveLifecycle.Core.Time;
using OliveLifecycle.Core.Units;
using FieldEntity = OliveLifecycle.Core.Entities.Field;

namespace OliveLifecycle.Application.Services;

public interface IFieldOverviewService
{
    Task<FieldOverviewDto> GetAsync(
        string fieldId,
        int resultYear,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);
}

public sealed class FieldOverviewService : IFieldOverviewService
{
    private readonly IFieldRepository _fields;
    private readonly IFieldAccessService _fieldAccess;
    private readonly IFieldYearSummaryService _yearSummary;
    private readonly IOilStockService _oilStock;
    private readonly IChronologioService _chronologio;
    private readonly ITaskProposalService _proposals;
    private readonly IWeatherIntelligenceService _weather;
    private readonly IMediaAttachmentRepository _media;
    private readonly IPhotoContentUrlSigner _photoUrlSigner;
    private readonly IDateTimeProvider _clock;

    public FieldOverviewService(
        IFieldRepository fields,
        IFieldAccessService fieldAccess,
        IFieldYearSummaryService yearSummary,
        IOilStockService oilStock,
        IChronologioService chronologio,
        ITaskProposalService proposals,
        IWeatherIntelligenceService weather,
        IMediaAttachmentRepository media,
        IPhotoContentUrlSigner photoUrlSigner,
        IDateTimeProvider clock)
    {
        _fields = fields;
        _fieldAccess = fieldAccess;
        _yearSummary = yearSummary;
        _oilStock = oilStock;
        _chronologio = chronologio;
        _proposals = proposals;
        _weather = weather;
        _media = media;
        _photoUrlSigner = photoUrlSigner;
        _clock = clock;
    }

    public async Task<FieldOverviewDto> GetAsync(
        string fieldId,
        int resultYear,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccess.CanUserAccessFieldAsync(fieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }

        var field = await _fields.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        var year = await _yearSummary.GetAsync(fieldId, resultYear, userId, userRole, language, cancellationToken);

        var oilSummary = await _oilStock.GetSummaryAsync(userId, resultYear, fieldId: null, cancellationToken);
        var cellar = SumFieldProvenanceLitres(oilSummary.Lots, fieldId);

        var history = await _chronologio.GetForFieldAsync(
            fieldId,
            userId,
            userRole,
            new ChronologioQuery { Limit = 8 },
            cancellationToken);

        var recent = history.Take(4).Select(MapHistory).ToList();
        var latest = history.FirstOrDefault();

        TaskProposalDto? attentionProposal = null;
        try
        {
            var proposals = await _proposals.ListAsync(fieldId, resultYear, userId, userRole, language, cancellationToken);
            attentionProposal = PickAttention(proposals, _clock.UtcNow);
        }
        catch (ForbiddenException)
        {
            // Collaborators without task module still get overview totals.
        }

        FieldOverviewWeatherDto weatherDto = new()
        {
            Headline = language.StartsWith("en", StringComparison.OrdinalIgnoreCase)
                ? "Weather unavailable"
                : "Ο καιρός δεν είναι διαθέσιμος"
        };
        try
        {
            var weather = await _weather.GetFieldWeatherAsync(field, cancellationToken);
            weatherDto = MapWeather(weather, language);
        }
        catch
        {
            // Weather is progressive disclosure — never fail the overview.
        }

        var photos = await LoadPhotosAsync(fieldId, userId, cancellationToken);
        var produced = year.OliveOil.ProducedLitres ?? 0m;
        var harvestKg = year.OliveKilograms ?? 0m;
        var income = year.TotalIncome ?? 0m;
        var expense = year.TotalExpenses ?? 0m;

        return new FieldOverviewDto
        {
            Field = MapIdentity(field),
            Current = new FieldOverviewCurrentDto
            {
                LifecycleStage = field.CurrentLifecycleStage,
                PrimaryAttention = MapAttention(attentionProposal, language),
                LatestRecord = latest == null
                    ? null
                    : new FieldOverviewLatestRecordDto
                    {
                        Type = latest.Category,
                        Title = latest.Title,
                        OccurredAt = latest.OccurredAt,
                        Href = $"/fields/{fieldId}?tab=chronologio&entry={latest.Id}"
                    }
            },
            Production = new FieldOverviewProductionDto
            {
                HarvestOliveKg = harvestKg,
                OilProducedLitres = produced,
                OilCurrentlyInCellarLitres = cellar.Available,
                OilHeldLitres = cellar.Held,
                HasOilEntries = produced > 0m || cellar.Available > 0m || cellar.Held > 0m
            },
            Money = new FieldOverviewMoneyDto
            {
                PostedIncome = income,
                PostedExpense = expense,
                Result = income - expense,
                Currency = year.Currency
            },
            Weather = weatherDto,
            RecentHistory = recent,
            Photos = photos,
            CropYear = new FieldOverviewCropYearDto
            {
                Id = resultYear,
                Label = $"{resultYear}/{((resultYear + 1) % 100):D2}"
            }
        };
    }

    private static FieldOverviewIdentityDto MapIdentity(FieldEntity field)
    {
        var areaSqm = field.ResolveAreaSqm();
        var stremmata = areaSqm.HasValue
            ? FieldArea.StremmataFromSqm(areaSqm.Value)
            : (double?)null;
        var hasBoundary = field.Boundary?.Coordinates is { Count: > 0 };
        return new FieldOverviewIdentityDto
        {
            Id = field.Id,
            Name = field.Name,
            LocationLabel = field.LocationText ?? string.Empty,
            Variety = field.Variety,
            AreaStremmata = stremmata,
            TreeCount = field.TreeCount,
            IrrigationLabel = field.IrrigationType
                ?? (field.IrrigationStatus ? "irrigated" : "rainfed"),
            BoundaryStatus = hasBoundary ? "complete" : "missing",
            Status = field.Status.ToString()
        };
    }

    private static (decimal Available, decimal Held) SumFieldProvenanceLitres(
        IReadOnlyList<OilLotDto> lots,
        string fieldId)
    {
        decimal available = 0m;
        decimal held = 0m;
        foreach (var lot in lots)
        {
            var share = OilProvenance.ShareFor(
                lot.Provenance?.Select(p => new OilProvenanceEntry { FieldId = p.FieldId, Share = p.Share }),
                lot.FieldIds,
                fieldId);
            if (share <= 0m) continue;
            available += (lot.Available?.Litres ?? 0m) * share;
            held += (lot.Reserved?.Litres ?? 0m) * share;
        }

        return (decimal.Round(available, 1, MidpointRounding.AwayFromZero),
            decimal.Round(held, 1, MidpointRounding.AwayFromZero));
    }

    private static TaskProposalDto? PickAttention(IReadOnlyList<TaskProposalDto> proposals, DateTime utcNow)
    {
        var open = proposals
            .Where(p =>
            {
                var status = TaskProposalStatusExtensions.FromApiString(p.Status) ?? TaskProposalStatus.Active;
                return status.IsOpen();
            })
            .ToList();
        if (open.Count == 0) return null;

        return open
            .OrderBy(p => p.RecommendedWindowEnd ?? p.ValidUntil ?? DateTime.MaxValue)
            .ThenByDescending(p => p.GeneratedAt)
            .FirstOrDefault(p =>
                (p.RecommendedWindowEnd ?? p.ValidUntil) is DateTime end && end < utcNow)
            ?? open.OrderBy(p => p.RecommendedWindowStart ?? p.ValidFrom ?? DateTime.MaxValue)
                .FirstOrDefault();
    }

    private FieldOverviewAttentionDto? MapAttention(TaskProposalDto? proposal, string language)
    {
        if (proposal == null) return null;
        var end = proposal.RecommendedWindowEnd ?? proposal.ValidUntil;
        var delayDays = end.HasValue
            ? Math.Max(0, (int)Math.Floor((_clock.UtcNow - end.Value).TotalDays))
            : 0;
        var isLate = delayDays > 0;
        var detail = isLate
            ? (language.StartsWith("en", StringComparison.OrdinalIgnoreCase)
                ? $"{delayDays} days late"
                : $"{delayDays} ημέρες καθυστέρηση")
            : (proposal.Explanation ?? proposal.GreekExplanation ?? string.Empty);

        return new FieldOverviewAttentionDto
        {
            Label = string.IsNullOrWhiteSpace(proposal.GreekExplanation)
                ? proposal.TemplateCode
                : proposal.GreekExplanation.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).FirstOrDefault()
                    ?? proposal.TemplateCode,
            Detail = detail,
            Severity = isLate ? "warning" : "info",
            Href = $"/fields/{proposal.FieldId}?tab=overview"
        };
    }

    private static FieldOverviewWeatherDto MapWeather(
        OliveLifecycle.Application.DTOs.Geospatial.FieldWeatherDto weather,
        string language)
    {
        var current = weather.Current;
        var temp = current == null ? null : $"{current.TemperatureC:0}°";
        var desc = current?.Description;
        var headline = string.Join(" · ", new[] { temp, desc }.Where(s => !string.IsNullOrWhiteSpace(s)));
        if (string.IsNullOrWhiteSpace(headline))
        {
            headline = language.StartsWith("en", StringComparison.OrdinalIgnoreCase) ? "Today" : "Σήμερα";
        }

        double? waterNeed = null;
        if (weather.WaterBalance != null && weather.WaterBalance.BalanceMm < 0)
        {
            waterNeed = Math.Abs(weather.WaterBalance.BalanceMm);
        }
        else if (weather.Evapotranspiration != null)
        {
            waterNeed = weather.Evapotranspiration.TodayMm;
        }

        var recommendation = waterNeed is > 0
            ? (language.StartsWith("en", StringComparison.OrdinalIgnoreCase)
                ? $"About {waterNeed:0} mm of water needed"
                : $"Χρειάζεται περίπου {waterNeed:0} mm νερό")
            : null;

        return new FieldOverviewWeatherDto
        {
            Headline = headline,
            Recommendation = recommendation,
            EstimatedWaterNeedMm = waterNeed,
            SourceLabel = language.StartsWith("en", StringComparison.OrdinalIgnoreCase)
                ? "Estimate from weather and soil, not a field measurement."
                : "Εκτίμηση από καιρό και έδαφος, όχι μέτρηση στο χωράφι."
        };
    }

    private static FieldHistoryPreviewItemDto MapHistory(ChronologioEntryDto entry) =>
        new()
        {
            Id = entry.Id,
            Type = entry.Category,
            Title = entry.Title,
            Summary = entry.Summary,
            OccurredAt = entry.OccurredAt,
            Href = $"/fields/{entry.FieldId}?tab=chronologio&entry={entry.Id}",
            Amount = entry.Amount?.Value,
            Currency = entry.Amount?.Currency
        };

    private async Task<IReadOnlyList<FieldPhotoPreviewItemDto>> LoadPhotosAsync(
        string fieldId,
        string userId,
        CancellationToken cancellationToken)
    {
        var (items, _) = await _media.QueryAsync(
            new MediaAttachmentQuery
            {
                FieldId = fieldId,
                Page = 1,
                PageSize = 6,
                Sort = "newest"
            },
            cancellationToken);

        return items
            .Select(m =>
            {
                var isImage = string.IsNullOrWhiteSpace(m.MediaType)
                    || string.Equals(m.MediaType, "image", StringComparison.OrdinalIgnoreCase);
                var useSigned = isImage && (
                    (m.Url?.Contains("/photos/", StringComparison.OrdinalIgnoreCase) ?? false)
                    || (m.ThumbnailUrl?.Contains("/photos/", StringComparison.OrdinalIgnoreCase) ?? false)
                    || !string.IsNullOrWhiteSpace(m.ContentHash));
                var signed = useSigned && !string.IsNullOrWhiteSpace(m.Id);
                return new FieldPhotoPreviewItemDto
                {
                    Id = m.Id,
                    Url = signed
                        ? _photoUrlSigner.CreateUrl(m.Id, PhotoContentVariants.Original, userId)
                        : m.Url,
                    ThumbnailUrl = signed
                        ? _photoUrlSigner.CreateUrl(m.Id, PhotoContentVariants.Thumb, userId)
                        : (m.ThumbnailUrl ?? m.Url),
                    CapturedAt = m.CapturedAt ?? m.CreatedAt
                };
            })
            .ToList();
    }
}
