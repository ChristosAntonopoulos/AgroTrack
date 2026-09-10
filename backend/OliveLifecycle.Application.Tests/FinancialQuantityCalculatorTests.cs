using OliveLifecycle.Core;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Finance;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class FinancialQuantityCalculatorTests
{
    [Fact]
    public void QuantityTimesUnitPrice_CalculatesAmount()
    {
        var result = FinancialQuantityCalculator.Resolve(
            FinancialCalculationMode.QuantityTimesUnitPrice,
            quantity: 15m,
            FinancialQuantityUnit.Litre,
            unitPrice: 1.87m,
            amount: null);

        Assert.Equal(28.05m, result.Amount);
        Assert.Equal(15m, result.Quantity);
        Assert.Equal(1.87m, result.UnitPrice);
        Assert.True(result.AmountIsCalculated);
        Assert.False(result.UnitPriceIsCalculated);
    }

    [Fact]
    public void OliveOilSale_QuantityTimesUnitPrice_MatchesExample()
    {
        var result = FinancialQuantityCalculator.Resolve(
            FinancialCalculationMode.QuantityTimesUnitPrice,
            850m,
            FinancialQuantityUnit.Litre,
            6.20m,
            amount: 9999m);

        Assert.Equal(5270.00m, result.Amount);
        Assert.Equal(6.20m, result.UnitPrice);
        Assert.True(result.AmountIsCalculated);
    }

    [Fact]
    public void QuantityAndTotal_CalculatesUnitPrice_WithoutChangingEnteredTotal()
    {
        var result = FinancialQuantityCalculator.Resolve(
            FinancialCalculationMode.QuantityAndTotal,
            850m,
            FinancialQuantityUnit.Litre,
            unitPrice: 9m,
            amount: 5270m);

        Assert.Equal(5270.00m, result.Amount);
        Assert.Equal(6.2000m, result.UnitPrice);
        Assert.True(result.UnitPriceIsCalculated);
        Assert.False(result.AmountIsCalculated);
    }

    [Fact]
    public void QuantityAndTotal_ZeroQuantity_DoesNotDivide()
    {
        Assert.Throws<ArgumentException>(() => FinancialQuantityCalculator.Resolve(
            FinancialCalculationMode.QuantityAndTotal,
            0m,
            FinancialQuantityUnit.Litre,
            null,
            100m));
    }

    [Fact]
    public void TotalOnly_StoresAmountWithoutRequiringQuantity()
    {
        var result = FinancialQuantityCalculator.Resolve(
            FinancialCalculationMode.TotalOnly,
            quantity: null,
            unit: null,
            unitPrice: null,
            amount: 130m);

        Assert.Equal(130.00m, result.Amount);
        Assert.Null(result.Quantity);
        Assert.Null(result.UnitPrice);
        Assert.False(result.AmountIsCalculated);
    }

    [Fact]
    public void GreekCommaInput_IsAccepted()
    {
        Assert.True(FinancialQuantityCalculator.TryParseDecimal("6,20", out var unitPrice));
        Assert.Equal(6.20m, unitPrice);
        Assert.True(FinancialQuantityCalculator.TryParseDecimal("5.270,00", out var thousands));
        Assert.Equal(5270.00m, thousands);
        Assert.True(FinancialQuantityCalculator.TryParseDecimal("1.87", out var invariant));
        Assert.Equal(1.87m, invariant);
    }

    [Fact]
    public void UnitPriceRounding_IsStableAtFourDecimals()
    {
        var result = FinancialQuantityCalculator.Resolve(
            FinancialCalculationMode.QuantityAndTotal,
            3m,
            FinancialQuantityUnit.Workday,
            null,
            10m);

        Assert.Equal(10.00m, result.Amount);
        Assert.Equal(3.3333m, result.UnitPrice);
    }

    [Fact]
    public void SwitchMode_PreservesValidQuantityAndPrice()
    {
        var times = FinancialQuantityCalculator.Resolve(
            FinancialCalculationMode.QuantityTimesUnitPrice,
            15m,
            FinancialQuantityUnit.Litre,
            1.87m,
            null);

        var total = FinancialQuantityCalculator.SwitchMode(times, FinancialCalculationMode.QuantityAndTotal);
        Assert.Equal(15m, total.Quantity);
        Assert.Equal(28.05m, total.Amount);
        Assert.Equal(1.8700m, total.UnitPrice);

        var back = FinancialQuantityCalculator.SwitchMode(total, FinancialCalculationMode.QuantityTimesUnitPrice);
        Assert.Equal(28.05m, back.Amount);
        Assert.Equal(1.87m, back.UnitPrice);
    }

    [Fact]
    public void SwitchMode_ToQuantityTimesWithoutPrice_KeepsTotalOnly()
    {
        var totalOnly = FinancialQuantityCalculator.Resolve(
            FinancialCalculationMode.TotalOnly, null, null, null, 80m);

        var switched = FinancialQuantityCalculator.SwitchMode(
            totalOnly, FinancialCalculationMode.QuantityTimesUnitPrice);

        Assert.Equal(FinancialCalculationMode.TotalOnly, switched.Mode);
        Assert.Equal(80m, switched.Amount);
    }

    [Fact]
    public void DefaultUnit_OliveOilIsLitre_FuelIsLitre_LabourIsWorkday()
    {
        Assert.Equal(
            FinancialQuantityUnit.Litre,
            FinancialQuantityCalculator.DefaultUnit(FinancialTransactionCategory.OliveOilSale));
        Assert.Equal(
            FinancialQuantityUnit.Litre,
            FinancialQuantityCalculator.DefaultUnit(FinancialTransactionCategory.FuelAndEnergy));
        Assert.Equal(
            FinancialQuantityUnit.Workday,
            FinancialQuantityCalculator.DefaultUnit(FinancialTransactionCategory.Labor));
        Assert.DoesNotContain(
            FinancialQuantityUnit.Kilogram,
            FinancialQuantityCalculator.SuggestedUnits(FinancialTransactionCategory.OliveOilSale));
    }

    [Fact]
    public void DisplayLabels_UseGreekUnitNamesAndAbbreviations()
    {
        Assert.Equal("λίτρα", FinancialDisplayLabels.QuantityUnit(FinancialQuantityUnit.Litre));
        Assert.Equal("κιλά", FinancialDisplayLabels.QuantityUnit(FinancialQuantityUnit.Kilogram));
        Assert.Equal("τόνοι", FinancialDisplayLabels.QuantityUnit(FinancialQuantityUnit.Tonne));
        Assert.Equal("ώρες", FinancialDisplayLabels.QuantityUnit(FinancialQuantityUnit.Hour));
        Assert.Equal("μεροκάματα", FinancialDisplayLabels.QuantityUnit(FinancialQuantityUnit.Workday));
        Assert.Equal("τεμάχια", FinancialDisplayLabels.QuantityUnit(FinancialQuantityUnit.Piece));
        Assert.Equal("εκτάρια", FinancialDisplayLabels.QuantityUnit(FinancialQuantityUnit.Hectare));
        Assert.Equal("δέντρα", FinancialDisplayLabels.QuantityUnit(FinancialQuantityUnit.Tree));
        Assert.Equal("δοχεία", FinancialDisplayLabels.QuantityUnit(FinancialQuantityUnit.Container));
        Assert.Equal("L", FinancialDisplayLabels.QuantityUnitAbbreviation(FinancialQuantityUnit.Litre));
        Assert.Equal("kg", FinancialDisplayLabels.QuantityUnitAbbreviation(FinancialQuantityUnit.Kilogram));
        Assert.Equal("ha", FinancialDisplayLabels.QuantityUnitAbbreviation(FinancialQuantityUnit.Hectare));
    }
}
