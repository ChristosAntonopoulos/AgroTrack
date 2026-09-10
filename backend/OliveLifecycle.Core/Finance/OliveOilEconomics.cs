namespace OliveLifecycle.Core.Finance;

public sealed class OliveOilEconomics
{
    public decimal? ProducedLitres { get; init; }
    public bool ProducedLitresAreEstimated { get; init; }
    public decimal? SoldLitres { get; init; }
    public decimal? RemainingLitres { get; init; }
    public bool RemainingIsConfirmed { get; init; }
    public decimal? AverageSalePricePerLitre { get; init; }
    public decimal? ProductionCostPerLitre { get; init; }
    public decimal? ResultPerLitre { get; init; }
    public int PostedOliveOilSaleCount { get; init; }
    public int PostedOliveOilSalesMissingLitres { get; init; }
    public bool HasProductionOrSales { get; init; }
    public string? ProductionCostMessage { get; init; }
    public string? AveragePriceMessage { get; init; }
    public string? RemainingMessage { get; init; }
}

public readonly record struct HarvestOilProduction(
    decimal? ConfirmedLitres,
    decimal? EstimatedLitres);
