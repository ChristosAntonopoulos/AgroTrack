using System.Globalization;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Finance;

public sealed class QuantityCalculation
{
    public FinancialCalculationMode Mode { get; init; } = FinancialCalculationMode.TotalOnly;
    public decimal? Quantity { get; init; }
    public FinancialQuantityUnit? QuantityUnit { get; init; }
    public decimal? UnitPrice { get; init; }
    public decimal Amount { get; init; }
    public bool AmountIsCalculated { get; init; }
    public bool UnitPriceIsCalculated { get; init; }
}

/// <summary>
/// Decimal quantity × unit-price math. Official Amount is always 2 d.p.; never uses floating point.
/// </summary>
public static class FinancialQuantityCalculator
{
    public const int AmountDecimals = 2;
    public const int QuantityDecimals = 3;
    public const int UnitPriceDecimals = 4;

    public static decimal RoundMoney(decimal value) =>
        decimal.Round(value, AmountDecimals, MidpointRounding.AwayFromZero);

    public static decimal RoundQuantity(decimal value) =>
        decimal.Round(value, QuantityDecimals, MidpointRounding.AwayFromZero);

    public static decimal RoundUnitPrice(decimal value) =>
        decimal.Round(value, UnitPriceDecimals, MidpointRounding.AwayFromZero);

    public static QuantityCalculation Resolve(
        FinancialCalculationMode mode,
        decimal? quantity,
        FinancialQuantityUnit? unit,
        decimal? unitPrice,
        decimal? amount)
    {
        var storedQuantity = quantity is > 0 ? RoundQuantity(quantity.Value) : (decimal?)null;
        var storedUnitPrice = unitPrice is > 0 ? RoundUnitPrice(unitPrice.Value) : (decimal?)null;

        return mode switch
        {
            FinancialCalculationMode.QuantityTimesUnitPrice => ResolveQuantityTimesUnitPrice(
                storedQuantity, unit, storedUnitPrice),
            FinancialCalculationMode.QuantityAndTotal => ResolveQuantityAndTotal(
                storedQuantity, unit, amount),
            _ => ResolveTotalOnly(storedQuantity, unit, storedUnitPrice, amount)
        };
    }

    public static QuantityCalculation SwitchMode(QuantityCalculation current, FinancialCalculationMode next)
    {
        if (current.Mode == next)
        {
            return current;
        }

        try
        {
            return Resolve(
                next,
                current.Quantity,
                current.QuantityUnit,
                current.UnitPrice,
                current.Amount);
        }
        catch (ArgumentException)
        {
            return current;
        }
    }

    public static FinancialQuantityUnit? DefaultUnit(FinancialTransactionCategory? category) =>
        category switch
        {
            FinancialTransactionCategory.OliveOilSale => FinancialQuantityUnit.Litre,
            FinancialTransactionCategory.FuelAndEnergy => FinancialQuantityUnit.Litre,
            FinancialTransactionCategory.Fertilizers => FinancialQuantityUnit.Kilogram,
            FinancialTransactionCategory.PlantProtection => FinancialQuantityUnit.Litre,
            FinancialTransactionCategory.Labor => FinancialQuantityUnit.Workday,
            FinancialTransactionCategory.Irrigation => FinancialQuantityUnit.Hour,
            FinancialTransactionCategory.EquipmentAndTools => FinancialQuantityUnit.Piece,
            FinancialTransactionCategory.Mill => FinancialQuantityUnit.Kilogram,
            FinancialTransactionCategory.Transport => FinancialQuantityUnit.Piece,
            FinancialTransactionCategory.CollaboratorServices => FinancialQuantityUnit.Workday,
            _ => null
        };

    public static IReadOnlyList<FinancialQuantityUnit> SuggestedUnits(FinancialTransactionCategory? category) =>
        category switch
        {
            FinancialTransactionCategory.FuelAndEnergy => [FinancialQuantityUnit.Litre],
            FinancialTransactionCategory.Fertilizers => [FinancialQuantityUnit.Kilogram, FinancialQuantityUnit.Tonne],
            FinancialTransactionCategory.PlantProtection => [FinancialQuantityUnit.Litre, FinancialQuantityUnit.Kilogram],
            FinancialTransactionCategory.Labor => [FinancialQuantityUnit.Hour, FinancialQuantityUnit.Workday],
            FinancialTransactionCategory.Irrigation => [FinancialQuantityUnit.Hour],
            FinancialTransactionCategory.EquipmentAndTools => [FinancialQuantityUnit.Piece, FinancialQuantityUnit.Hour],
            FinancialTransactionCategory.Mill => [FinancialQuantityUnit.Kilogram, FinancialQuantityUnit.Litre],
            FinancialTransactionCategory.Transport => [FinancialQuantityUnit.Piece],
            FinancialTransactionCategory.CollaboratorServices => [FinancialQuantityUnit.Hour, FinancialQuantityUnit.Workday],
            FinancialTransactionCategory.OliveOilSale => [FinancialQuantityUnit.Litre],
            FinancialTransactionCategory.OliveSale => [FinancialQuantityUnit.Kilogram],
            _ => []
        };

    /// <summary>
    /// Parses Greek or invariant decimals: 6,20 / 6.20 / 5.270,00 / 5,270.00.
    /// </summary>
    public static bool TryParseDecimal(string? raw, out decimal value)
    {
        value = 0;
        if (string.IsNullOrWhiteSpace(raw))
        {
            return false;
        }

        var trimmed = raw.Trim().Replace(" ", "", StringComparison.Ordinal).Replace("\u00A0", "", StringComparison.Ordinal);
        var lastComma = trimmed.LastIndexOf(',');
        var lastDot = trimmed.LastIndexOf('.');
        string normalized;
        if (lastComma >= 0 && lastDot >= 0)
        {
            if (lastComma > lastDot)
            {
                normalized = trimmed.Replace(".", "", StringComparison.Ordinal).Replace(',', '.');
            }
            else
            {
                normalized = trimmed.Replace(",", "", StringComparison.Ordinal);
            }
        }
        else if (lastComma >= 0)
        {
            normalized = trimmed.Replace(',', '.');
        }
        else
        {
            normalized = trimmed;
        }

        return decimal.TryParse(normalized, NumberStyles.Number, CultureInfo.InvariantCulture, out value);
    }

    public static bool IsLitreOilSale(FinancialTransaction transaction) =>
        transaction.Status == FinancialTransactionStatus.Posted
        && transaction.Type == FinancialTransactionType.Income
        && transaction.Category == FinancialTransactionCategory.OliveOilSale
        && transaction.QuantityUnit == FinancialQuantityUnit.Litre
        && transaction.Quantity is > 0;

    private static QuantityCalculation ResolveTotalOnly(
        decimal? quantity,
        FinancialQuantityUnit? unit,
        decimal? unitPrice,
        decimal? amount)
    {
        if (amount is null or <= 0)
        {
            throw new ArgumentException("Amount must be greater than zero.", nameof(amount));
        }

        return new QuantityCalculation
        {
            Mode = FinancialCalculationMode.TotalOnly,
            Quantity = quantity,
            QuantityUnit = quantity.HasValue ? unit : null,
            UnitPrice = unitPrice,
            Amount = RoundMoney(amount.Value),
            AmountIsCalculated = false,
            UnitPriceIsCalculated = false
        };
    }

    private static QuantityCalculation ResolveQuantityTimesUnitPrice(
        decimal? quantity,
        FinancialQuantityUnit? unit,
        decimal? unitPrice)
    {
        if (quantity is null or <= 0)
        {
            throw new ArgumentException("Quantity must be greater than zero.", nameof(quantity));
        }

        if (unitPrice is null or <= 0)
        {
            throw new ArgumentException("Unit price must be greater than zero.", nameof(unitPrice));
        }

        return new QuantityCalculation
        {
            Mode = FinancialCalculationMode.QuantityTimesUnitPrice,
            Quantity = quantity,
            QuantityUnit = unit,
            UnitPrice = unitPrice,
            Amount = RoundMoney(quantity.Value * unitPrice.Value),
            AmountIsCalculated = true,
            UnitPriceIsCalculated = false
        };
    }

    private static QuantityCalculation ResolveQuantityAndTotal(
        decimal? quantity,
        FinancialQuantityUnit? unit,
        decimal? amount)
    {
        if (quantity is null or <= 0)
        {
            throw new ArgumentException("Quantity must be greater than zero.", nameof(quantity));
        }

        if (amount is null or <= 0)
        {
            throw new ArgumentException("Amount must be greater than zero.", nameof(amount));
        }

        var storedAmount = RoundMoney(amount.Value);
        return new QuantityCalculation
        {
            Mode = FinancialCalculationMode.QuantityAndTotal,
            Quantity = quantity,
            QuantityUnit = unit,
            UnitPrice = RoundUnitPrice(storedAmount / quantity.Value),
            Amount = storedAmount,
            AmountIsCalculated = false,
            UnitPriceIsCalculated = true
        };
    }
}
